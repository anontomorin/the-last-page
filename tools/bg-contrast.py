#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""底纹可读性核对（对应 css/backgrounds.css 的遮罩 alpha）

背景层是「纸色遮罩 + 老照片底纹」两层合成的。遮罩调淡能让照片透出来，
但也会抬高正文脚下的底色亮度 —— 这个脚本用实测像素把这条线钉住。

输入：一个装 PNG 的目录（由 _playtest/bg-contrast.js 把每个界面的内容
      全部 visibility:hidden 后截屏得到，只留底纹本身）。

判定：取底纹亮度的 99.5 分位（最亮的极值区，对深色文字最不利），
      分别与 --ink(#242424) 和 --ink-soft(#4A463D) 算 WCAG 对比度，
      要求均 ≥ 4.5:1（AA 正文门槛）。

退出码非零 = 有界面不达标（供 npm run test:contrast 拦回归）。
"""
import glob
import os
import sys

from PIL import Image

AA = 4.5
INK = (0x24, 0x24, 0x24)          # --c-ink
INK_SOFT = (0x4A, 0x46, 0x3D)     # --c-ink-soft


def _linear(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminance(rgb):
    r, g, b = rgb
    return 0.2126 * _linear(r) + 0.7152 * _linear(g) + 0.0722 * _linear(b)


def contrast(l1, l2):
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def main():
    shot_dir = sys.argv[1] if len(sys.argv) > 1 else '_playtest/_bgshot'
    files = sorted(glob.glob(os.path.join(shot_dir, '*.png')))
    if not files:
        print(f'未找到截图：{shot_dir}/*.png')
        return 1

    ink, soft = luminance(INK), luminance(INK_SOFT)
    print('%-18s %-9s %-9s %-9s %-8s %s' % ('界面', '底纹最亮', 'vs 墨色', 'vs 软墨', '底纹跨度', '判定'))
    print('-' * 72)
    fails, worst = [], 99.0
    for f in files:
        with Image.open(f) as im:
            im = im.convert('RGB')
            # 降采样只取统计意义（1/3 边长的样本足以代表大面积底纹）
            im = im.resize((max(1, im.size[0] // 3), max(1, im.size[1] // 3)))
            # get_flattened_data 只在 Pillow 12+ 存在，旧版走 getdata（会告警但可用）
            pixels = (im.get_flattened_data() if hasattr(im, 'get_flattened_data')
                      else im.getdata())
            lum = sorted(luminance(p) for p in pixels)
        lightest = lum[int(len(lum) * 0.995) - 1]
        spread = lightest - lum[0]          # 跨度太小说明根本没量到底纹
        r_ink, r_soft = contrast(lightest, ink), contrast(lightest, soft)
        worst = min(worst, r_ink, r_soft)
        ok = r_ink >= AA and r_soft >= AA and spread >= 0.04
        name = os.path.basename(f)[:-4]
        if r_ink < AA or r_soft < AA:
            fails.append('%s 对比度不足（墨 %.1f / 软墨 %.1f）' % (name, r_ink, r_soft))
        if spread < 0.04:
            fails.append('%s 底纹跨度过小（%.3f）—— 截图可能没量到底纹' % (name, spread))
        print('%-18s %-9.3f %-9.1f %-9.1f %-8.3f %s'
              % (name, lightest, r_ink, r_soft, spread, '✓' if ok else '✗'))

    print('\n最差对比度 %.1f:1（门槛 %.1f:1）' % (worst, AA))
    if fails:
        print('❌ ' + '；'.join(fails))
        return 1
    print('✅ %d 个界面底纹上的文字对比度全部达 AA' % len(files))
    return 0


if __name__ == '__main__':
    sys.exit(main())
