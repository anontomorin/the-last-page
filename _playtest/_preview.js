/* 出一组预览截图，供人工确认「底纹是否够清晰 / 页签是否单行」。
   输出到仓库外的 _preview/，不污染版本库。*/
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH);

const OUT = path.join(__dirname, '_preview');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:8123/index.html');
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { } });
  await page.reload();
  await page.waitForTimeout(1500);

  /* 点掉旁白层（#narrator 会压一层暗罩，不点掉截图全是灰的） */
  async function narrate() {
    for (let i = 0; i < 30; i++) {
      const vis = await page.evaluate(() => {
        const n = document.querySelector('#narrator');
        return !!(n && !n.hidden);
      });
      if (!vis) return;
      await page.mouse.click(720, 760);
      await page.waitForTimeout(450);
    }
  }

  await page.screenshot({ path: path.join(OUT, '1-boot.png') });

  // 进入档案界面
  await page.evaluate(() => {
    document.querySelectorAll('.screen').forEach(e => e.classList.remove('active'));
    document.querySelector('#screen-archive')?.classList.add('active');
  });
  await narrate();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, '2-workbench.png') });

  // 页签特写（2x 出图，便于看字体与单行）
  const tabs = await page.$('#wb-tabs');
  if (tabs) await tabs.screenshot({ path: path.join(OUT, '3-tabs-closeup.png') });

  for (const [tab, file] of [['map', '4-map.png'], ['evidence', '5-evidence.png'], ['timeline', '6-timeline.png']]) {
    await page.locator(`.wb-tab[data-tab="${tab}"]`).click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, file) });
  }

  // 高 DPI 页签特写（2 倍像素）
  const p2 = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await p2.goto('http://127.0.0.1:8123/index.html');
  await p2.waitForTimeout(1200);
  await p2.evaluate(() => {
    document.querySelectorAll('.screen').forEach(e => e.classList.remove('active'));
    document.querySelector('#screen-archive')?.classList.add('active');
  });
  await p2.waitForTimeout(600);
  const t2 = await p2.$('#wb-tabs');
  if (t2) await t2.screenshot({ path: path.join(OUT, '7-tabs-2x.png') });

  /* 抬头（HUD）特写：给一组非退化状态，让刻度与完整度条都亮起来 */
  await p2.evaluate(() => {
    LP.state.set({
      act: 3,
      discoveredDocuments: Object.keys(LP.data.documents).slice(0, 9),
      discoveredEvidence: Object.keys(LP.data.clues).slice(0, 4),
    });
    LP.archive.refreshStatus();
  });
  await p2.waitForTimeout(1300);
  const h2 = await p2.$('.wb-top');
  if (h2) await h2.screenshot({ path: path.join(OUT, '8-hud-2x.png') });

  /* 双人模式抬头特写：编号牌与「通话」按钮同时在场 —— P10 修的就是这个场景 */
  await p2.evaluate(() => { LP.state.set({ mode: 'A' }); LP.archive.refreshAll(); });
  await p2.waitForTimeout(700);
  const h4 = await p2.$('.wb-top');
  if (h4) await h4.screenshot({ path: path.join(OUT, '10-hud-duo-2x.png') });
  await p2.screenshot({ path: path.join(OUT, '11-workbench-duo.png') });
  await p2.close();

  /* 窄屏抬头 */
  const p3 = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p3.goto('http://127.0.0.1:8123/index.html');
  await p3.waitForTimeout(900);
  await p3.evaluate(() => {
    document.querySelectorAll('.screen').forEach(e => e.classList.remove('active'));
    document.querySelector('#screen-archive')?.classList.add('active');
    const n = document.querySelector('#narrator'); if (n) n.hidden = true;
    LP.state.set({ act: 3, discoveredDocuments: Object.keys(LP.data.documents).slice(0, 9) });
    LP.archive.refreshStatus();
  });
  await p3.waitForTimeout(1200);
  const h3 = await p3.$('.wb-top');
  if (h3) await h3.screenshot({ path: path.join(OUT, '9-hud-mobile-2x.png') });
  await p3.close();

  await browser.close();
  console.log('预览已输出到', OUT);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
