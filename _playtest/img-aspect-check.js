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
          const cs = getComputedStyle(im);

          /* 规则 B：CSS 里声明了 aspect-ratio 就必须兑现。
             P5 给 img 补 width/height 属性防 CLS 之后，CSS 若只锁 width:100%，
             属性里的 height 会把高度钉死、aspect-ratio 被整个忽略 —— 1536×922
             的横版照片被渲染成 635×922 的竖版条（.end-hero，用户反馈「第六幕
             开始时照片应显示横板」）。而 cover/contain 的豁免恰好放过了它。
             getComputedStyle 在只有属性（无 CSS 声明）时返回 "auto 1536 / 922"
             —— 那是浏览器的固有比例提示，与 natural 必然一致，不必校验；
             只有不以 auto 开头的才是作者显式声明，必须兑现。 */
          const ar = cs.aspectRatio || 'auto';
          if (ar !== 'auto' && !/^auto\b/.test(ar)) {
            const m = /^([\d.]+)\s*\/\s*([\d.]+)$/.exec(ar.trim());
            if (m) {
              const want = parseFloat(m[1]) / parseFloat(m[2]);
              const dev2 = Math.abs(want - ren) / want;
              if (dev2 > 0.03) {
                out.push({
                  src: (im.getAttribute('src') || '').split('/').pop(),
                  nat: nat.toFixed(3), ren: ren.toFixed(3), dev: dev2, tol: 0.03,
                  box: Math.round(r.width) + 'x' + Math.round(r.height),
                  note: `声明 aspect-ratio:${ar.trim()} 未兑现（被 height 属性钉死？）`
                });
              }
            }
          }

          // object-fit:cover 的图不做「比例 == 自然比例」校验（设计即裁切）
          const fit = cs.objectFit;
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
      rows.filter(r => r.dev > (r.tol || 0.05)).forEach(r => {
        bad++;
        const why = r.note ? r.note : `拉伸 ${(r.dev * 100).toFixed(0)}%`;
        console.log(`  [失真] ${vp.tag} ${c.name}  ${r.src}  nat比例=${r.nat} 渲染比例=${r.ren}  box=${r.box}  ← ${why}`);
      });
      if (errs.length) console.log(`  [JS错误] ${vp.tag} ${c.name}: ${errs[0]}`);
      await page.close();
    }
  }
  console.log(bad === 0 ? '\n✅ 全部界面图片比例正常（无拉伸失真）' : `\n❌ 共 ${bad} 处比例失真`);
  await browser.close();
})();
