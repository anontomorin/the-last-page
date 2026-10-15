/* 全站图片比例体检：遍历主要界面，比对 natural 宽高比与渲染宽高比 */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright-core');

const CASES = [
  { name: '启动页', act: 0 },
  { name: '档案·资料', act: 1, tab: 'doc' },
  { name: '档案·地图', act: 1, tab: 'map' },
  { name: '档案·人物', act: 1, tab: 'person' },
  { name: '档案·时间线', act: 1, tab: 'time' },
  { name: '结局', act: 6, ending: true }
];

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  let bad = 0;

  for (const vp of [{ w: 1366, h: 900, tag: 'desktop' }, { w: 390, h: 844, tag: 'mobile' }]) {
    for (const c of CASES) {
      const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
      const errs = [];
      page.on('pageerror', e => errs.push(e.message));
      await page.goto('http://127.0.0.1:8123/index.html');
      await page.evaluate((cfg) => {
        try { localStorage.clear(); } catch (e) { }
        if (window.LP && LP.state) {
          LP.state.set({ act: cfg.act, mode: 'solo' });
        }
      }, c);
      await page.reload();
      await page.waitForTimeout(300);
      const btn = await page.$('#btn-start, .btn-primary, #screen-boot button');
      if (btn) { await btn.click(); await page.waitForTimeout(700); }
      if (c.tab) {
        await page.evaluate((t) => {
          const tabs = Array.from(document.querySelectorAll('[data-tab], .arch-tab, .tab'));
          const hit = tabs.find(x => (x.dataset && x.dataset.tab === t) || (x.textContent || '').trim() === t);
          if (hit) hit.click();
        }, c.tab);
        await page.waitForTimeout(600);
      }
      if (c.ending) {
        await page.evaluate(() => { if (window.LP && LP.ending) LP.ending.start(); });
        await page.waitForTimeout(900);
      }

      const rows = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('img').forEach(im => {
          const r = im.getBoundingClientRect();
          if (r.width < 4 || r.height < 4) return;
          if (!im.naturalWidth) return;
          const nat = im.naturalWidth / im.naturalHeight;
          const ren = r.width / r.height;
          // object-fit:cover 的图不做比例校验（设计即裁切）
          const fit = getComputedStyle(im).objectFit;
          if (fit === 'cover' || fit === 'contain') return;
          out.push({
            src: (im.getAttribute('src') || '').split('/').pop(),
            nat: nat.toFixed(3), ren: ren.toFixed(3),
            dev: Math.abs(nat - ren) / nat,
            box: Math.round(r.width) + 'x' + Math.round(r.height)
          });
        });
        return out;
      });
      rows.filter(r => r.dev > 0.05).forEach(r => {
        bad++;
        console.log(`  [失真 ${(r.dev * 100).toFixed(0)}%] ${vp.tag} ${c.name}  ${r.src}  nat比例=${r.nat} 渲染比例=${r.ren}  box=${r.box}`);
      });
      if (errs.length) console.log(`  [JS错误] ${vp.tag} ${c.name}: ${errs[0]}`);
      await page.close();
    }
  }
  console.log(bad === 0 ? '\n✅ 全部界面图片比例正常（无拉伸失真）' : `\n❌ 共 ${bad} 处比例失真`);
  await browser.close();
})();
