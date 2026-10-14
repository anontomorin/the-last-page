#!/usr/bin/env python3
# ============================================================
# 视觉回归 —— 像素差对比（STYLE_CONTRACT 的视觉门禁）
# ------------------------------------------------------------
# 用法：
#   python visual-diff.py <基线目录> <当前目录> [--threshold 1.5] [--report 目录]
# 判定：
#   平均像素差 > 阈值  → 失败
#   基线有而当前缺 / 尺寸变化 → 失败
# 退出码：0 通过，1 有超阈值项
# ============================================================
import sys, os, argparse
from PIL import Image, ImageChops

def mean_abs_diff_pct(a, b):
    """平均绝对差（百分比，0~100）"""
    if a.size != b.size:
        return None
    diff = ImageChops.difference(a.convert('RGB'), b.convert('RGB'))
    hist = diff.histogram()
    total = 0
    for ch in range(3):
        band = hist[ch * 256:(ch + 1) * 256]
        for v, n in enumerate(band):
            total += v * n
    px = a.size[0] * a.size[1] * 3
    return (total / (255.0 * px)) * 100.0

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('baseline')
    ap.add_argument('current')
    ap.add_argument('--threshold', type=float, default=1.5)
    ap.add_argument('--report', default=None)
    args = ap.parse_args()

    if not os.path.isdir(args.baseline):
        print('基线目录不存在：%s' % args.baseline); return 1
    if not os.path.isdir(args.current):
        print('当前目录不存在：%s' % args.current); return 1

    names = sorted(f for f in os.listdir(args.baseline) if f.lower().endswith('.png'))
    if not names:
        print('基线目录没有 PNG：%s' % args.baseline); return 1

    if args.report:
        os.makedirs(args.report, exist_ok=True)

    rows, fails = [], []
    for n in names:
        pb, pc = os.path.join(args.baseline, n), os.path.join(args.current, n)
        if not os.path.exists(pc):
            rows.append((n, None, 'MISSING'))
            fails.append(n); continue
        a, b = Image.open(pb), Image.open(pc)
        pct = mean_abs_diff_pct(a, b)
        if pct is None:
            rows.append((n, None, 'SIZE %s→%s' % (a.size, b.size)))
            fails.append(n); continue
        rows.append((n, pct, 'ok'))
        if pct > args.threshold:
            fails.append(n)
        if args.report and pct > args.threshold:
            w, h = a.size
            canvas = Image.new('RGB', (w, h * 3 + 16), (255, 255, 255))
            canvas.paste(a.convert('RGB'), (0, 0))
            canvas.paste(b.convert('RGB'), (0, h + 8))
            canvas.paste(ImageChops.difference(a.convert('RGB'), b.convert('RGB')).point(lambda v: min(255, v * 6)), (0, h * 2 + 16))
            canvas.save(os.path.join(args.report, 'diff_' + n))

    rows.sort(key=lambda r: (r[1] is None, -(r[1] or 0)))
    print('%-42s %10s  %s' % ('截图', '平均差%', '状态'))
    print('-' * 70)
    for n, pct, st in rows:
        shown = '  --  ' if pct is None else '%6.3f%%' % pct
        mark = '⚠' if (pct is None or pct > args.threshold) else '·'
        print('%-42s %10s  %s %s' % (n, shown, mark, st))
    print('-' * 70)
    print('共 %d 张；超阈值/异常 %d 张；阈值 %.2f%%' % (len(rows), len(fails), args.threshold))
    if fails:
        print('不合格：' + ', '.join(fails))
        if args.report:
            print('差异图已写入：' + args.report)
        return 1
    print('视觉回归通过 ✓')
    return 0

if __name__ == '__main__':
    sys.exit(main())
