#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""美术后处理流水线（对应 FRONTEND_REBUILD_PLAN §6.8）

职责单一：把生成图 / 现有资产统一处理成达标的 WebP / JPEG，并维护 manifest.json。

子命令：
  process <raw> --out assets/images/x.webp --role scene --width 1536 --height 1024
      创意处理：sepia 统一 → 颗粒 → 暗角 → 裁切到目标比例 → 缩放 → WebP 导出
      （可选 --strip-bottom N 裁除底部水印区；--max-bytes 按 role 预算自动降质量）
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

from PIL import Image, ImageDraw, ImageEnhance, ImageOps

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
}
DEFAULT_BUDGET = 200 * 1024
TOTAL_BUDGET = 4 * 1024 * 1024
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
        img = sepia_unify(img)
        img = add_grain(img, os.path.basename(out_path))
        img = add_vignette(img)
    if args.strip_bottom:
        w, h = img.size
        img = img.crop((0, 0, w, h - int(h * args.strip_bottom / 100)))
    img = cover_crop(img, args.width, args.height)
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
        p = os.path.join(IMG_DIR, f)
        b = os.path.getsize(p)
        total += b
        lim = budget_for(f)
        # 剧情原件 JPG 冻结内容，但本轮已做编码优化 → 同样按预算核对
        if b > lim:
            over.append((f, b, lim))
    print(f'全站图片总量 {total/1048576:.2f} MB / 预算 {TOTAL_BUDGET/1048576:.0f} MB')
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
    p.add_argument('--flat', action='store_true', help='平铺纹理：跳过 sepia/颗粒/暗角')
    p.add_argument('--max-bytes', type=int, default=0, help='覆盖单图字节预算')
    p.set_defaults(func=cmd_process)

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
