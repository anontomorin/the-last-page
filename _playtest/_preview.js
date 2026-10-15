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
  await p2.close();

  await browser.close();
  console.log('预览已输出到', OUT);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
