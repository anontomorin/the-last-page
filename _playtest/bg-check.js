/* 实证：八个界面的背景底纹是否真的生效 + 页签图标是否渲染 */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright-core');

const EXPECT = [
  ['#screen-boot', null, 'bg_boot.webp'],
  ['#screen-archive', 'diary', 'bg_workbench.webp'],
  ['#screen-archive', 'map', 'bg_map.webp'],
  ['#screen-archive', 'evidence', 'bg_evidence.webp'],
  ['#screen-archive', 'timeline', 'bg_timeline.webp'],
  ['.viewer', null, 'bg_viewer.webp'],
  ['#screen-scene', null, 'bg_scene.webp'],
  ['#screen-ending', null, 'bg_ending.webp']
];

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const fails = [];
  const netFails = [];
  page.on('requestfailed', r => { if (/bg_/.test(r.url())) netFails.push(r.url().split('/').pop()); });
  page.on('response', r => { if (/bg_/.test(r.url()) && r.status() >= 400) netFails.push(r.url().split('/').pop() + ' ' + r.status()); });

  await page.goto('http://127.0.0.1:8123/index.html');
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { } });
  await page.reload();
  await page.waitForTimeout(400);

  // 图标数量
  const icoCount = await page.$$eval('.wb-tab .ico', els => els.length);
  console.log(`页签图标渲染数: ${icoCount} / 7 ${icoCount === 7 ? '✓' : '✗'}`);
  if (icoCount !== 7) fails.push('页签图标数不对');

  // 逐界面核对 background-image
  for (const [sel, tab, want] of EXPECT) {
    if (tab) {
      await page.evaluate((t) => {
        const b = document.querySelector(`.wb-tab[data-tab="${t}"]`);
        if (b) b.click();
      }, tab);
      await page.waitForTimeout(250);
    }
    if (sel === '.viewer') {
      await page.evaluate(() => { const v = document.querySelector('#viewer'); if (v) v.hidden = false; });
      await page.waitForTimeout(150);
    }
    if (sel === '#screen-scene' || sel === '#screen-ending') {
      await page.evaluate((s) => {
        document.querySelectorAll('.screen').forEach(x => x.classList.remove('active'));
        const t = document.querySelector(s); if (t) t.classList.add('active');
      }, sel);
      await page.waitForTimeout(200);
    }
    const bg = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      return getComputedStyle(el).backgroundImage;
    }, sel);
    const ok = bg && bg.includes(want);
    console.log(`  ${ok ? '✓' : '✗'} ${sel}${tab ? '[' + tab + ']' : ''} → ${want}  ${ok ? '' : '实际: ' + String(bg).slice(0, 90)}`);
    if (!ok) fails.push(`${sel}${tab ? '[' + tab + ']' : ''} 背景未生效`);
  }

  console.log(`\n背景图网络失败: ${netFails.length ? netFails.join(', ') : '无 ✓'}`);
  console.log(fails.length ? `\n❌ ${fails.length} 项未通过` : '\n✅ 八个界面背景与图标全部生效');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
