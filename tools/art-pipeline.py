#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""美术后处理流水线（对应 FRONTEND_REBUILD_PLAN §6.8）

职责单一：把生成图 / 现有资产统一处理成达标的 WebP / JPEG，并维护 manifest.json。

子命令：
  process <raw> --out assets/images/x.webp --role scene --width 1536 --height 1024
      创意处理：sepia 统一 → 颗粒 → 暗角 → 去水印 → 裁切到目标比例 → 缩放 → WebP 导出
      （可选 --strip-bottom N 裁除底部水印区；--no-dewm 跳过去水印；
       --max-bytes 按 role 预算自动降质量）
  dewm
      给存量资产补去水印（按 manifest.dewm 幂等；--force 全部重做）
      ⚠ 固定右下角框（13%×9.5%）——P14 实测角标位置随画布漂移，
      一部分图盖不住（见 WM_BOXES 注释），存量清理请用 dewm2。
  dewm2
      按 WM_BOXES 逐图坐标表精确去水印（幂等，按 manifest.dewm2 标记跳过）。
      坐标是 2026-10-15 对备份原图逐张放大人工定位的结果（_diag/wm_zoom2_*.png）。
  reencode
      存量优化：对 manifest 里未标记本管线版本的文件做纯重编码
      （WebP 质量阶梯到单图预算；JPG q80 渐进式）。内容零变更，幂等。
  manifest
      重算 manifest.json 的 size / bytes（usage/alt 等人工字段不动）。
  contact-sheet [--out _playtest/contact_sheet.jpg]
      全部资产缩略拼版，供整体风格质检。
  audit
      体积核对：单图预算 / 全站总量 / 首屏预算，超限非零退出。

幂等约定：
  - 同一输入 + 同一参数 → 输出字节一致（无时间戳、无随机源，颗粒按文件名哈希定种）。
  - reencode 以 manifest 的 "pipe" 字段判断是否已处理，不做差值猜测（方案 §6.8 教训）。
Windows 注意：先写临时文件再 os.replace（Pillow 不允许覆盖正在读取的路径）。
"""
import argparse
import hashlib
import json
import math
import os
import random
import sys

from PIL import Image, ImageDraw, ImageEnhance, ImageOps, ImageStat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, 'assets', 'images')
MANIFEST = os.path.join(IMG_DIR, 'manifest.json')
PIPE_VERSION = 3
# 存量 JPG（剧情原件）：游戏内最大显示约 600px，1280 = 2x retina；
# 黄金参考用途不受影响（i2i 会自行缩放）。按方案 §6.9「格式：WebP 主」
# 转为 WebP——像素内容零变更，原 JPG 保留在 git 历史可随时还原。
ORIG_MAX_DIM = 1280
ORIG_BUDGET = 140 * 1024         # 13 张 × ~140KB ≈ 1.8 MB

# 单图字节预算（方案 §6.9）
BUDGETS = {
    'cover': 110 * 1024,
    'scene': 160 * 1024,
    'portrait': 60 * 1024,
    'detail': 200 * 1024,
    'page32': 160 * 1024,
    'ending': 200 * 1024,
    'ui': 120 * 1024,
    'fx': 80 * 1024,
    # 界面背景（8 张）：P7 初版按 960x600 / 45KB 压，实测在 1280+ 视口下
    # 被 cover 放大后发虚（用户反馈「太模糊」）。P8 重生成到 1536x1024、
    # 输出 1440x900，单图预算同步提到 120KB（雾景 bg_scene 细节最多，
    # 100KB 时质量阶梯到底仍超限）。
    'bg': 120 * 1024,
}
DEFAULT_BUDGET = 200 * 1024
# 总量：原 4MB → 4.3MB（P7 加 8 张背景图）→ 4.8MB
# （P8 底纹升到 1440x900 换取清晰度，见 REBUILD_REPORT P8）
TOTAL_BUDGET = int(4.8 * 1024 * 1024)
QUALITY_LADDER = [84, 82, 80, 78, 75, 72, 68]


def role_of(name):
    return os.path.basename(name).split('_')[0]


def budget_for(name):
    return BUDGETS.get(role_of(name), DEFAULT_BUDGET)


def load_manifest():
    if os.path.exists(MANIFEST):
        with open(MANIFEST, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_manifest(m):
    tmp = MANIFEST + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write('\n')
    os.replace(tmp, MANIFEST)


def atomic_save(img, path, **save_kw):
    """先写临时文件再 replace（Windows 下 Pillow 不能覆盖正读取的路径）。"""
    tmp = path + '.tmp'
    img.save(tmp, **save_kw)
    os.replace(tmp, path)


# ---------------- 创意处理（仅用于新生成图） ----------------

def sepia_unify(img, strength=0.30):
    """统一 sepia 色调：原图与「灰度→固定 sepia LUT」按强度混合。确定性。"""
    gray = ImageOps.autocontrast(img.convert('L'), cutoff=1)
    toned = Image.merge('RGB', [
        gray.point(lambda v: min(255, int(v * 1.06 + 22))),
        gray.point(lambda v: min(255, int(v * 0.94 + 10))),
        gray.point(lambda v: int(v * 0.74)),
    ])
    return Image.blend(img.convert('RGB'), toned, strength)


def add_grain(img, name, strength=14):
    """固定种子的胶片颗粒（种子 = 文件名哈希 → 可复现）。"""
    w, h = img.size
    rng = random.Random('grain:' + name)
    noise = Image.frombytes('L', (w, h), bytes(rng.randrange(256) for _ in range(w * h)))
    noise = noise.point(lambda v: 128 + (v - 128) // 2)      # 减半幅度，柔化
    blended = Image.blend(img.convert('RGB'), Image.merge('RGB', (noise, noise, noise)),
                          strength / 255.0)
    return blended


def add_vignette(img, strength=0.12):
    """固定参数暗角：径向渐变 mask 相乘。确定性。"""
    w, h = img.size
    mask = Image.new('L', (w, h), 255)
    d = ImageDraw.Draw(mask)
    cx, cy = w / 2, h / 2
    maxr = math.hypot(cx, cy)
    # 64 档椭圆近似径向渐变（省依赖、确定性）
    steps = 64
    for i in range(steps):
        t = i / steps
        r = maxr * (0.62 + 0.38 * t)
        val = int(255 * (1 - strength * max(0.0, t - 0.35) / 0.65))
        d.ellipse([cx - r, cy - r * 0.86, cx + r, cy + r * 0.86], fill=val)
    dark = ImageEnhance.Brightness(img).enhance(1 - strength)
    return Image.composite(img.convert('RGB'), dark.convert('RGB'), mask)


def cover_crop(img, tw, th):
    """按目标比例 cover 裁切后缩放（Lanczos）。"""
    w, h = img.size
    scale = max(tw / w, th / h)
    nw, nh = round(w * scale), round(h * scale)
    img = img.resize((nw, nh), Image.LANCZOS)
    left, top = (nw - tw) // 2, (nh - th) // 2
    return img.crop((left, top, left + tw, top + th))


# ---------------- 去水印（生成服务的角标模板） ----------------
# 生成服务会在图片右下角贴一枚固定模板角标：「AI生成」+「WORKBUDDY>_」，浅灰描边字。
# 实测几何：@1536 宽画布约 110×51px，距右边/下边各约 10px，随画布等比缩放；
# 存量图另有一种更淡的方框变体（约 80×30 @1280 宽），位置相近。
# 它是纯瑕疵（docs/art-prompts.md §1.6 明确要求「无水印」），且底纹会整屏铺给
# 玩家看，必须清掉 —— 用户第一次注意到的是 bg_ending（那上面还有一段被模型
# 画进画面的提示词文字），但实测 47 张资产里几乎没有一张是干净的。
# 取 13%×8.5% 的右下角矩形（含两种变体的余量），用其正上方等高的一条像素
# **垂直镜像**填补 —— 木地板 / 砖墙 / 瓦顶这类纹理镜像后没有方向破绽；
# 上边与左边各留一段线性羽化过渡，避免硬接缝。
DEWM = {'w': 0.13, 'h': 0.095, 'feather': 0.28, 'downscale': 8}


def _dewm_mask(bw, bh):
    """矩形遮罩：上边与左边各留一段线性羽化，避免硬接缝。"""
    mask = Image.new('L', (bw, bh), 255)
    px = mask.load()
    fw = max(1, int(round(bw * DEWM['feather'])))
    fh = max(1, int(round(bh * DEWM['feather'])))
    for y in range(fh):
        a = int(255 * (y + 1) / (fh + 1))
        for x in range(bw):
            px[x, y] = a
    for x in range(fw):
        a = int(255 * (x + 1) / (fw + 1))
        for y in range(bh):
            if px[x, y] > a:
                px[x, y] = a
    return mask


def _fill_source(img, bw, bh):
    """填补源：在 1/8 降采样上做「边界调和扩散」，再放大回填。
    为什么不用镜像：老地图的裂纹、衣褶、纸张边缘这类**有结构**的角落，
    镜像会造出可见的万花筒重影。低频扩散只会给出一小块「失焦」——
    同样的面积下观感自然得多，且不产生任何重复纹理。
    先在 1/8 尺度上收敛（区域仅约 24×10 像素，成本可忽略），
    再双三次放大 —— 得到的正是周边纹理的低频延续。"""
    W, H = img.size
    f = DEWM['downscale']
    sw, sh = max(4, W // f), max(4, H // f)
    small = img.resize((sw, sh), Image.BOX)
    sx0, sy0 = (W - bw) // f, (H - bh) // f
    sx1 = min(sw, max(sx0 + 2, W // f))
    sy1 = min(sh, max(sy0 + 2, H // f))
    reg = small.crop((sx0, sy0, sx1, sy1))
    w, h = reg.size
    get = reg.load()

    def at(x, y, fx, fy):
        return small.getpixel((min(sw - 1, max(0, x)), min(sh - 1, max(0, y))))

    left = [at(sx0 - 1, sy0 + j, 0, 0) for j in range(h)]
    right = [at(sx1, sy0 + j, 0, 0) for j in range(h)]
    top = [at(sx0 + i, sy0 - 1, 0, 0) for i in range(w)]
    bot = [at(sx0 + i, sy1, 0, 0) for i in range(w)]
    # 初值：四向线性插值（比常数初值收敛快得多）
    for j in range(h):
        fy = (j + 1) / (h + 1)
        for i in range(w):
            fx = (i + 1) / (w + 1)
            a = [(left[j][c] * (1 - fx) + right[j][c] * fx) for c in range(3)]
            b = [(top[i][c] * (1 - fy) + bot[i][c] * fy) for c in range(3)]
            get[i, j] = (round((a[0] + b[0]) / 2), round((a[1] + b[1]) / 2),
                         round((a[2] + b[2]) / 2))
    # 松弛：区域内做拉普拉斯平均，边界钉死在真实像素上
    for _ in range(24):
        prev = reg.copy().load()
        for j in range(h):
            for i in range(w):
                n = prev[i, j - 1] if j > 0 else top[i]
                s = prev[i, j + 1] if j < h - 1 else bot[i]
                ww = prev[i - 1, j] if i > 0 else left[j]
                e = prev[i + 1, j] if i < w - 1 else right[j]
                get[i, j] = ((n[0] + s[0] + ww[0] + e[0] + 2) >> 2,
                             (n[1] + s[1] + ww[1] + e[1] + 2) >> 2,
                             (n[2] + s[2] + ww[2] + e[2] + 2) >> 2)
    fill = reg.resize((bw, bh), Image.BICUBIC)
    # 色调对齐：把填块均值拉齐到「正上方等大一条」的均值。
    # 不做这一步，边界处会出现一块比周围深/浅的矩形（纸面上尤其显眼）。
    band = img.crop((W - bw, H - bh * 2, W, H - bh))
    bm = ImageStat.Stat(band).mean
    fm = ImageStat.Stat(fill).mean
    off = [max(-30.0, min(30.0, bm[c] - fm[c])) for c in range(3)]
    if max(abs(o) for o in off) > 1.0:
        chans = fill.split()
        fill = Image.merge('RGB', [
            ch.point(lambda v, o=o: max(0, min(255, int(v + o))))
            for ch, o in zip(chans, off)])
    return fill


def dewatermark(img):
    """抹掉右下角水印。确定性：无随机源，同尺寸同输入必得同输出。"""
    W, H = img.size
    bw = min(max(10, int(round(W * DEWM['w']))), W // 3)
    bh = min(max(8, int(round(H * DEWM['h']))), H // 3)
    out = img.convert('RGB').copy()
    out.paste(_fill_source(out, bw, bh), (W - bw, H - bh), _dewm_mask(bw, bh))
    return out


def dewatermark_mirror(img):
    """镜像填补版（保留：纯纹理角落观感更连贯，供对比 / 回退）。"""
    W, H = img.size
    bw = min(max(10, int(round(W * DEWM['w']))), W // 3)
    bh = min(max(8, int(round(H * DEWM['h']))), H // 3)
    top = H - bh
    patch = img.crop((W - bw, top - bh, W, top)).transpose(Image.FLIP_TOP_BOTTOM)
    out = img.convert('RGB').copy()
    out.paste(patch, (W - bw, top), _dewm_mask(bw, bh))
    return out


def encode_webp_budget(img, path, max_bytes, q_ladder=None):
    """质量阶梯导出，取第一个达标档；全超则用最末档（audit 会报超限）。"""
    for q in (q_ladder or QUALITY_LADDER):
        tmp = path + '.tmp'
        img.save(tmp, 'WEBP', quality=q, method=6)
        size = os.path.getsize(tmp)
        if size <= max_bytes or q == (q_ladder or QUALITY_LADDER)[-1]:
            os.replace(tmp, path)
            return q, size
        os.remove(tmp)
    raise AssertionError('unreachable')


def cmd_process(args):
    raw_path = os.path.abspath(args.raw)
    out_path = os.path.join(ROOT, args.out) if not os.path.isabs(args.out) else args.out
    img = Image.open(raw_path)
    if not args.flat:
        is_bg = role_of(out_path) == 'bg'
        img = sepia_unify(img)
        # 背景层：颗粒减半。背景是满屏大面，14/255 的颗粒在 1280+ 视口下
        # 与 WebP 量化叠加会糊成噪雾（用户反馈「太模糊」的直接来源之一）。
        img = add_grain(img, os.path.basename(out_path), 7 if is_bg else 14)
        img = add_vignette(img, 0.10 if is_bg else 0.12)
    if args.strip_bottom:
        w, h = img.size
        img = img.crop((0, 0, w, h - int(h * args.strip_bottom / 100)))
    # 去水印必须在 cover 裁切**之前**：此时水印还在右下角原位；
    # 先抹掉再裁，任何裁切结果都不会带角标。
    if not args.no_dewm:
        img = dewatermark(img)
    img = cover_crop(img, args.width, args.height)
    # 背景层再补一道轻锐化：源图经 cover 缩放到 1440 宽后边缘会软，
    # 1.22 的锐化在不引入明显光晕的前提下把书架/木纹拉回来。
    if not args.flat and role_of(out_path) == 'bg':
        img = ImageEnhance.Sharpness(img).enhance(1.22)
    q, size = encode_webp_budget(img, out_path, args.max_bytes or budget_for(out_path))
    print(f'OK {os.path.relpath(out_path, ROOT)}  {args.width}x{args.height}  q{q}  {size/1024:.1f} KB')


# ---------------- 存量重编码（内容零变更） ----------------

def cmd_reencode(args):
    m = load_manifest()
    changed = []
    for f in sorted(os.listdir(IMG_DIR)):
        if not f.lower().endswith(('.webp', '.jpg', '.jpeg')):
            continue
        entry = m.get(f, {})
        if entry.get('pipe') == PIPE_VERSION:
            continue                                    # 已由本管线处理过 → 跳过（幂等）
        path = os.path.join(IMG_DIR, f)
        img = Image.open(path)
        img.load()
        w, h = img.size
        if f.lower().endswith('.webp'):
            q, size = encode_webp_budget(img.convert('RGB'), path, budget_for(f))
            note = f'q{q}  {size/1024:.1f} KB'
            # 全阶梯仍超预算 → 降采样到 1280 宽再压一轮（氛围层，1280 足够）
            if size > budget_for(f) and w > 1280:
                nh = round(h * 1280 / w)
                small = img.convert('RGB').resize((1280, nh), Image.LANCZOS)
                q2, size2 = encode_webp_budget(small, path, budget_for(f))
                note = f'q{q2} 1280x{nh}  {size2/1024:.1f} KB (降采样)'
            print(f'reencode {f}  {w}x{h}  {note}')
        else:
            # JPG 剧情原件 → WebP（§6.9「WebP 主」）：超 1280 先降采样，
            # 再质量阶梯到 140KB；成功后移除源 JPG（git 历史保留原件）。
            src = img.convert('RGB')
            if max(w, h) > ORIG_MAX_DIM:
                scale = ORIG_MAX_DIM / max(w, h)
                src = src.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
            target = os.path.splitext(path)[0] + '.webp'
            done = False
            for q in (82, 80, 78, 75, 72):
                tmp = target + '.tmp'
                src.save(tmp, 'WEBP', quality=q, method=6)
                size = os.path.getsize(tmp)
                if size <= ORIG_BUDGET or q == 72:
                    os.replace(tmp, target)
                    os.remove(path)
                    print(f'convert  {f} → {os.path.basename(target)}  '
                          f'{src.size[0]}x{src.size[1]}  q{q}  {size/1024:.1f} KB')
                    done = True
                    break
                os.remove(tmp)
            if not done:
                continue
            f = os.path.basename(target)                 # manifest 登记到新名下
            entry = m.get(f, {})
        entry['pipe'] = PIPE_VERSION
        m[f] = entry
        changed.append(f)
    save_manifest(m)
    print(f'-- {len(changed)} 个文件已重编码并登记 manifest.pipe={PIPE_VERSION}')


# ---------------- 存量去水印（幂等） ----------------

# P14：角标不是总在「右下角贴边」。对备份原图逐张放大定位（_diag/wm_zoom2_*.png）
# 后发现两种模板、位置随画布漂移：
#   A. 双行「AI生成 / WORKBUDDY>_」（约 100×70px）：1x1 人像、cover_tall、ui_paper —— 贴右下角；
#   B. 单行圆角框「AI生成」（约 100×30px）：photo 系 / scene_reading_room ——
#      可偏离角落（photo_school 在 x 75–85%，photo_press 还整体上浮到 y≈0.85）。
# 另经全量复查：四张 768×922 人像、scene_ferry / scene_clocktower / scene_oldstreet 系、
# 8 张 bg、detail / page32 / map / IMG_0317 等原图本来就没有角标 —— 不在本表内就不动。
# 值 = (x0, y0, x1, y1) 相对画布的填补矩形，已含 ~2% 余量。
WM_BOXES = {
    'cover_tall.webp':            (0.855, 0.895, 1.000, 1.000),
    'portrait_chen_chuan_1x1.webp': (0.845, 0.895, 1.000, 1.000),
    'portrait_li_he_1x1.webp':    (0.845, 0.895, 1.000, 1.000),
    'portrait_linyuan_1x1.webp':  (0.825, 0.895, 1.000, 1.000),
    'portrait_zhou_ning_1x1.webp': (0.845, 0.895, 1.000, 1.000),
    'ui_paper_1024.webp':         (0.855, 0.895, 1.000, 1.000),
    'photo_door.webp':            (0.845, 0.878, 0.995, 0.982),
    'photo_dumpling.webp':        (0.845, 0.878, 0.995, 0.982),
    'photo_ferry.webp':           (0.855, 0.870, 0.990, 0.975),
    'photo_kids.webp':            (0.845, 0.888, 0.995, 0.982),
    'photo_linyuan.webp':         (0.815, 0.875, 0.960, 0.975),
    'photo_press.webp':           (0.850, 0.840, 1.000, 0.990),
    'photo_rain_street.webp':     (0.730, 0.870, 0.965, 0.992),
    'photo_school.webp':          (0.715, 0.880, 0.960, 0.998),
    'photo_xinya.webp':           (0.830, 0.858, 0.985, 0.978),
    'scene_reading_room.webp':    (0.885, 0.898, 1.000, 0.985),
}


def _feather_mask_rect(bw, bh, feather=0.28, edges=('top', 'left', 'right', 'bottom')):
    """任意矩形的羽化遮罩：指定边上留线性过渡，其余实心。"""
    mask = Image.new('L', (bw, bh), 255)
    px = mask.load()
    ramps = {}
    for e in edges:
        n = {'top': bh, 'left': bw, 'right': bw, 'bottom': bh}[e]
        ramps[e] = max(1, int(round(n * feather)))
    for y in range(bh):
        a = 255
        if 'top' in ramps and y < ramps['top']:
            a = min(a, int(255 * (y + 1) / (ramps['top'] + 1)))
        if 'bottom' in ramps and (bh - 1 - y) < ramps['bottom']:
            a = min(a, int(255 * (bh - y) / (ramps['bottom'] + 1)))
        for x in range(bw):
            v = a
            if 'left' in ramps and x < ramps['left']:
                v = min(v, int(255 * (x + 1) / (ramps['left'] + 1)))
            if 'right' in ramps and (bw - 1 - x) < ramps['right']:
                v = min(v, int(255 * (bw - x) / (ramps['right'] + 1)))
            px[x, y] = v
    return mask


def _fill_rect(img, x0, y0, x1, y1):
    """任意矩形填补：1/8 降采样上做边界调和扩散，双三次放大回填 + 色调对齐。
    同 _fill_source 的思路，但矩形不再假定贴右下角（P14：角标位置会漂）。"""
    W, H = img.size
    bx0, by0, bx1, by1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
    bw, bh = bx1 - bx0, by1 - by0
    assert bw > 4 and bh > 4, f'填补矩形过小: {(bx0, by0, bx1, by1)}'
    f = DEWM['downscale']
    sw, sh = max(4, W // f), max(4, H // f)
    small = img.resize((sw, sh), Image.BOX)
    sx0, sy0 = bx0 // f, by0 // f
    sx1, sy1 = min(sw, max(sx0 + 2, bx1 // f)), min(sh, max(sy0 + 2, by1 // f))
    reg = small.crop((sx0, sy0, sx1, sy1))
    w, h = reg.size
    get = reg.load()

    top = [small.getpixel((min(sw - 1, max(0, sx0 + i)), max(0, sy0 - 1)))
           for i in range(w)]
    bot = [small.getpixel((min(sw - 1, max(0, sx0 + i)), min(sh - 1, sy1)))
           for i in range(w)]
    left = [small.getpixel((max(0, sx0 - 1), min(sh - 1, max(0, sy0 + j))))
            for j in range(h)]
    right = [small.getpixel((min(sw - 1, sx1), min(sh - 1, max(0, sy0 + j))))
             for j in range(h)]
    for j in range(h):
        fy = (j + 1) / (h + 1)
        for i in range(w):
            fx = (i + 1) / (w + 1)
            a = [(left[j][c] * (1 - fx) + right[j][c] * fx) for c in range(3)]
            b = [(top[i][c] * (1 - fy) + bot[i][c] * fy) for c in range(3)]
            get[i, j] = (round((a[0] + b[0]) / 2), round((a[1] + b[1]) / 2),
                         round((a[2] + b[2]) / 2))
    for _ in range(24):
        prev = reg.copy().load()
        for j in range(h):
            for i in range(w):
                n = prev[i, j - 1] if j > 0 else top[i]
                s = prev[i, j + 1] if j < h - 1 else bot[i]
                ww = prev[i - 1, j] if i > 0 else left[j]
                e = prev[i + 1, j] if i < w - 1 else right[j]
                get[i, j] = ((n[0] + s[0] + ww[0] + e[0] + 2) >> 2,
                             (n[1] + s[1] + ww[1] + e[1] + 2) >> 2,
                             (n[2] + s[2] + ww[2] + e[2] + 2) >> 2)
    fill = reg.resize((bw, bh), Image.BICUBIC)
    # 色调对齐：把填块均值拉齐到「框外一圈」的均值，避免出现深浅方块
    ring = []
    if by0 > 0:
        ring.append(img.crop((bx0, max(0, by0 - bh), bx1, by0)))
    if by1 < H:
        ring.append(img.crop((bx0, by1, bx1, min(H, by1 + bh))))
    if bx0 > 0:
        ring.append(img.crop((max(0, bx0 - bw), by0, bx0, by1)))
    if bx1 < W:
        ring.append(img.crop((bx1, by0, min(W, bx1 + bw), by1)))
    if ring:
        band = Image.new('RGB', (sum(r.width for r in ring), bh))
        off_x = 0
        for r in ring:
            band.paste(r, (off_x, 0))
            off_x += r.width
        bm = ImageStat.Stat(band).mean
        fm = ImageStat.Stat(fill).mean
        offs = [max(-30.0, min(30.0, bm[c] - fm[c])) for c in range(3)]
        if max(abs(o) for o in offs) > 1.0:
            chans = fill.split()
            fill = Image.merge('RGB', [
                ch.point(lambda v, o=o: max(0, min(255, int(v + o))))
                for ch, o in zip(chans, offs)])
    return (bx0, by0, bx1, by1), fill


def cmd_dewm2(args):
    """按 WM_BOXES 逐图精确去水印（P14）。幂等：manifest.dewm2 跳过；--force 重做。"""
    m = load_manifest()
    done, skipped = [], []
    for f, (fx0, fy0, fx1, fy1) in sorted(WM_BOXES.items()):
        path = os.path.join(IMG_DIR, f)
        if not os.path.exists(path):
            print(f'dewm2  {f:<34} 缺文件，跳过')
            continue
        entry = m.setdefault(f, {})
        if entry.get('dewm2') and not args.force:
            skipped.append(f)
            continue
        img = Image.open(path)
        img.load()
        w, h = img.size
        rect = (round(w * fx0), round(h * fy0), round(w * fx1), round(h * fy1))
        out = img.convert('RGB').copy()
        (bx0, by0, bx1, by1), fill = _fill_rect(out, *rect)
        # 扩散填补是低频的，落在胶片颗粒纹理上会显出一块「失焦」；
        # 给填块补一层与全图同源的确定性颗粒（种子含文件名）把它揉回去。
        fill = add_grain(fill, 'dewm2:' + f, strength=12)
        # 羽化只留在框内真正的「内边」上：贴画布边的框边必须实心填满，
        # 否则角标贴边的那几个笔画会从半透明羽化带里透出来（第一版的教训）。
        # 羽化宽取框短边的 8%（≈10–16px）：足以藏住接缝，又不会弱到盖不住笔画。
        edges = ['top', 'left']
        if fx1 < 1.0:
            edges.append('right')
        if fy1 < 1.0:
            edges.append('bottom')
        mask = _feather_mask_rect(bx1 - bx0, by1 - by0, 0.08,
                                  edges=tuple(edges))
        out.paste(fill, (bx0, by0), mask)
        q, size = encode_webp_budget(out, path, budget_for(f))
        entry['dewm2'] = True
        entry['dewm2Box'] = [fx0, fy0, fx1, fy1]
        done.append(f)
        print(f'dewm2 {f:<34} {w}x{h}  box={rect}  q{q}  {size/1024:.1f} KB')
    save_manifest(m)
    cmd_manifest(args)
    print(f'-- dewm2 精确去水印 {len(done)} 张，跳过 {len(skipped)} 张')


def cmd_dewm(args):
    """对 IMG_DIR 里所有已上线的图补一次去水印，再按 role 预算重编码。
    幂等：manifest 里 dewm=True 的跳过；--force 可整体重做。"""
    m = load_manifest()
    done, skipped = [], []
    for f in sorted(os.listdir(IMG_DIR)):
        if not f.lower().endswith(('.webp', '.jpg', '.jpeg')):
            continue
        entry = m.setdefault(f, {})
        if entry.get('dewm') and not args.force:
            skipped.append(f)
            continue
        path = os.path.join(IMG_DIR, f)
        img = Image.open(path)
        img.load()
        w, h = img.size
        out = dewatermark(img)
        if f.lower().endswith('.webp'):
            q, size = encode_webp_budget(out, path, budget_for(f))
            note = f'q{q}  {size/1024:.1f} KB'
        else:
            q, size = 82, None
            out.save(path, 'JPEG', quality=q, progressive=True)
            note = f'q{q}  {os.path.getsize(path)/1024:.1f} KB'
        entry['dewm'] = True
        entry['dewmBox'] = [round(DEWM['w'], 4), round(DEWM['h'], 4)]
        done.append(f)
        print(f'dewm  {f:<34} {w}x{h}  {note}')
    save_manifest(m)
    # bytes 变了，回写 manifest
    cmd_manifest(args)
    print(f'-- 去水印 {len(done)} 张，跳过 {len(skipped)} 张（已处理）')


# ---------------- manifest 维护 ----------------

def cmd_manifest(args):
    m = load_manifest()
    for f in sorted(os.listdir(IMG_DIR)):
        if not f.lower().endswith(('.webp', '.jpg', '.jpeg')):
            continue
        path = os.path.join(IMG_DIR, f)
        with Image.open(path) as im:
            w, h = im.size
        e = m.setdefault(f, {})
        e['file'] = f
        e.setdefault('role', role_of(f))
        e.setdefault('usage', '')
        e.setdefault('alt', '')
        e.setdefault('decorative', False)
        e['containsAnswer'] = False                       # 硬约束：恒 false
        e.setdefault('fallback', 'css-gradient')
        e['size'] = [w, h]
        e['bytes'] = os.path.getsize(path)
    # 清掉已不存在的条目
    for k in list(m):
        if not os.path.exists(os.path.join(IMG_DIR, k)):
            del m[k]
    save_manifest(m)
    print(f'manifest.json 已更新（{len(m)} 项）')


# ---------------- 拼版质检 ----------------

def cmd_contact_sheet(args):
    files = sorted(f for f in os.listdir(IMG_DIR)
                   if f.lower().endswith(('.webp', '.jpg', '.jpeg')))
    cols, cell, pad, label_h = 6, 240, 8, 22
    rows = math.ceil(len(files) / cols)
    W = cols * (cell + pad) + pad
    H = rows * (cell + label_h + pad) + pad
    sheet = Image.new('RGB', (W, H), (28, 25, 20))
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(files):
        r, c = divmod(i, cols)
        x = pad + c * (cell + pad)
        y = pad + r * (cell + label_h + pad)
        try:
            with Image.open(os.path.join(IMG_DIR, f)) as im:
                th = im.convert('RGB')
                th = ImageOps.contain(th, (cell, cell))
                th.thumbnail((cell, cell), Image.LANCZOS)
                sheet.paste(th, (x + (cell - th.width) // 2, y + (cell - th.height) // 2))
        except Exception as e:
            d.text((x + 4, y + cell // 2), 'ERR ' + str(e)[:30], fill=(220, 90, 90))
        kb = os.path.getsize(os.path.join(IMG_DIR, f)) / 1024
        d.text((x, y + cell + 3), f'{f[:30]} {kb:.0f}K', fill=(210, 200, 180))
    out = os.path.join(ROOT, args.out) if not os.path.isabs(args.out) else args.out
    tmp = out + '.tmp'
    sheet.save(tmp, 'JPEG', quality=88)
    os.replace(tmp, out)
    print(f'contact sheet → {os.path.relpath(out, ROOT)}  {len(files)} 张  {W}x{H}')


# ---------------- 体积审计 ----------------

def cmd_audit(args):
    m = load_manifest()
    total = 0
    over = []
    for f in sorted(os.listdir(IMG_DIR)):
        # 只算图片：manifest.json 是索引不是资产，混进来会让「总量」随条目数
        # 漂移（与 style-lint 的口径也会不一致）
        if not f.lower().endswith(('.webp', '.jpg', '.jpeg')):
            continue
        p = os.path.join(IMG_DIR, f)
        b = os.path.getsize(p)
        total += b
        lim = budget_for(f)
        # 剧情原件 JPG 冻结内容，但本轮已做编码优化 → 同样按预算核对
        if b > lim:
            over.append((f, b, lim))
    print(f'全站图片总量 {total/1048576:.2f} MB / 预算 {TOTAL_BUDGET/1048576:.1f} MB')
    for f, b, lim in over:
        print(f'  超单图预算: {f}  {b/1024:.0f} KB > {lim/1024:.0f} KB')
    # 首屏 = index.html 里 loading=eager 的图（当前仅封面）
    eager = [f for f in m if m[f].get('eager')]
    first = sum(m[f]['bytes'] for f in eager if 'bytes' in m[f])
    if eager:
        print(f'首屏(eager) {first/1024:.0f} KB / 预算 600 KB')
        if first > 600 * 1024:
            over.append(('首屏合计', first, 600 * 1024))
    if total > TOTAL_BUDGET:
        over.append(('全站总量', total, TOTAL_BUDGET))
    if over:
        print(f'审计未通过（{len(over)} 项）')
        sys.exit(1)
    print('审计通过 ✓')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)

    p = sub.add_parser('process', help='新生成图 → 创意处理 → WebP')
    p.add_argument('raw')
    p.add_argument('--out', required=True)
    p.add_argument('--role', default=None)
    p.add_argument('--width', type=int, required=True)
    p.add_argument('--height', type=int, required=True)
    p.add_argument('--strip-bottom', type=float, default=0, help='裁除底部百分比（水印区）')
    p.add_argument('--no-dewm', action='store_true', help='跳过去水印（默认对每张都做）')
    p.add_argument('--flat', action='store_true', help='平铺纹理：跳过 sepia/颗粒/暗角')
    p.add_argument('--max-bytes', type=int, default=0, help='覆盖单图字节预算')
    p.set_defaults(func=cmd_process)

    p = sub.add_parser('dewm', help='给存量资产补去水印（幂等，按 manifest.dewm 标记跳过）')
    p.add_argument('--force', action='store_true', help='忽略 manifest 标记，全部重做')
    p.set_defaults(func=cmd_dewm)

    p = sub.add_parser('dewm2', help='按 WM_BOXES 逐图坐标精确去水印（幂等）')
    p.add_argument('--force', action='store_true', help='忽略 manifest 标记，全部重做')
    p.set_defaults(func=cmd_dewm2)

    sub.add_parser('reencode', help='存量重编码（内容零变更，幂等）').set_defaults(func=cmd_reencode)
    sub.add_parser('manifest', help='重算 manifest 的 size/bytes').set_defaults(func=cmd_manifest)
    p = sub.add_parser('contact-sheet', help='拼版质检')
    p.add_argument('--out', default='_playtest/contact_sheet.jpg')
    p.set_defaults(func=cmd_contact_sheet)
    sub.add_parser('audit', help='体积核对（超限非零退出）').set_defaults(func=cmd_audit)

    args = ap.parse_args()
    args.func(args)


if __name__ == '__main__':
    main()
