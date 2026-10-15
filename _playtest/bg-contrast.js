/* 门禁：底纹上的文字可读性（遮罩 alpha 的守门人）
   ------------------------------------------------------------
   背景是「纸色遮罩 + 老照片底纹」两层合成。遮罩调淡照片才透得出来，
   但底色变亮会吃掉文字对比度 —— 这道门禁把这条线钉死：

     1. 逐个界面把内容全部 visibility:hidden（底纹画在 screen 自身盒子上，
        不会跟着消失），截图 → 得到「纯底纹」；
     2. 交给 tools/bg-contrast.py 取亮度 99.5 分位，与 --ink / --ink-soft
        算 WCAG 对比度，要求 ≥ 4.5:1（AA 正文门槛）。

   关键细节：隐藏时**必须保留目标元素及其祖先链**（含屏本体），
   否则屏本体一起被藏，底纹也跟着消失，量出来全是纸色。
   需要本机 Chrome + 本地服务（npm run serve）。*/
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright-core');

const OUT = '_playtest/_bgshot';
const PY = process.env.PYTHON_BIN ||
  'C:/Users/郭家兴/.workbuddy/binaries/python/envs/default/Scripts/python.exe';

/* 八个界面（含四个档案页签）：遮罩 alpha 各不相同，逐个量 */
const VIEWS = [
  { name: 'boot', sel: '#screen-boot' },
  { name: 'archive-diary', sel: '#screen-archive', tab: 'diary' },
  { name: 'archive-map', sel: '#screen-archive', tab: 'map' },
  { name: 'archive-evidence', sel: '#screen-archive', tab: 'evidence' },
  { name: 'archive-timeline', sel: '#screen-archive', tab: 'timeline' },
  { name: 'viewer', sel: '#viewer', isViewer: true },
  { name: 'scene', sel: '#screen-scene' },
  { name: 'ending', sel: '#screen-ending' },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('http://127.0.0.1:8123/index.html');
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { } });

  for (const v of VIEWS) {
    await page.reload();
    await page.waitForTimeout(500);
    const found = await page.evaluate(({ sel, tab, isViewer }) => {
      const box = document.querySelector(sel);
      if (!box) return false;
      if (isViewer) {
        box.hidden = false;
        document.querySelectorAll('.screen').forEach(e => e.classList.remove('active'));
      } else {
        document.querySelectorAll('.screen').forEach(e => e.classList.remove('active'));
        box.classList.add('active');
        if (tab) box.dataset.tab = tab;
      }
      // 保留目标 + 祖先链（祖先若被藏，目标也不会显示）
      const keep = new Set();
      for (let n = box; n; n = n.parentElement) keep.add(n);
      document.querySelectorAll('*').forEach(el => {
        if (keep.has(el)) return;
        el.style.visibility = 'hidden';
      });
      return true;
    }, v);
    if (!found) { console.log(`  ✗ 找不到 ${v.sel}`); continue; }
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, v.name + '.png') });
  }
  await browser.close();

  const r = spawnSync(PY, [path.join('tools', 'bg-contrast.py'), OUT], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  process.exit(r.status === 0 ? 0 : 1);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
