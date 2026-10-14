/* 视觉验收截图：桌面 1366×768 / 1920×1080，移动 390×844 / 320×568 */
const path = require('path');
const fs = require('fs');
const http = require('http');

const PW = process.env.PLAYWRIGHT_PATH
  || 'C:/Users/郭家兴/.workbuddy/binaries/node/workspace/node_modules/playwright-core';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const { chromium } = require(PW);

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});

async function clearNarrator(page) {
  for (let i = 0; i < 14; i++) {
    const vis = await page.evaluate(() => {
      const n = document.querySelector('#narrator');
      return n && !n.hidden;
    });
    if (!vis) break;
    await page.click('#narrator').catch(() => {});
    await page.waitForTimeout(320);
  }
}

(async () => {
  await new Promise(r => server.listen(8124, r));
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  async function shoot(name, width, height, fn) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', e => console.log(`[pageerror:${name}]`, e.message));
    page.on('console', m => { if (m.type() === 'error') console.log(`[console:${name}]`, m.text()); });
    await page.goto('http://127.0.0.1:8124/index.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#boot-card:not([hidden])', { timeout: 15000 });
    await fn(page);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log('✓', name);
    await page.close();
  }

  /* 启动页 */
  await shoot('boot_desktop_1920', 1920, 1080, async p => {});
  await shoot('boot_mobile_390', 390, 844, async p => {});

  /* 工作台 + 任务卡（第一幕，双人 B 卷展示等待搭档态） */
  await shoot('workbench_solo_1366', 1366, 768, async p => {
    await p.click('#btn-start');
    await p.waitForTimeout(500);
    await clearNarrator(p);
    await p.waitForTimeout(400);
  });
  await shoot('workbench_b_390', 390, 844, async p => {
    await p.click('#btn-duo-toggle');
    await p.waitForTimeout(150);
    await p.click('#btn-mode-b');
    await p.waitForTimeout(500);
    await clearNarrator(p);
  });

  /* 场景（钟楼） */
  await shoot('scene_clocktower_1366', 1366, 768, async p => {
    await p.click('#btn-start');
    await p.waitForTimeout(500);
    await clearNarrator(p);
    await p.evaluate(() => {
      LP.state.set({ act: 2 });
      LP.state.addTo('discoveredLocations', 'location_clocktower');
      LP.archive.refreshAll();
    });
    await p.evaluate(() => LP.map.openScene('location_clocktower'));
    await p.waitForTimeout(600);
  });

  /* 证据板（推进到第三幕并发现线索后） */
  await shoot('evidence_1366', 1366, 768, async p => {
    await p.click('#btn-start');
    await p.waitForTimeout(500);
    await clearNarrator(p);
    await p.evaluate(() => {
      ['clue_317', 'clue_zhou_name', 'clue_717'].forEach(c => LP.inv.discoverClue(c, true));
      LP.inv.identifyPerson('person_zhou');
      LP.archive.refreshAll();
    });
    await p.evaluate(() => LP.archive.setTab('evidence'));
    await p.waitForTimeout(500);
  });

  /* 结局 */
  await shoot('ending_desktop_1920', 1920, 1080, async p => {
    await p.click('#btn-start');
    await p.waitForTimeout(400);
    await clearNarrator(p);
    await p.evaluate(() => {
      LP.state.set({ act: 6 });
      LP.ending.start();
    });
    await p.waitForTimeout(800);
  });

  /* 320px 溢出检查 */
  await shoot('boot_mobile_320', 320, 568, async p => {});

  await browser.close();
  server.close();
  console.log('全部截图完成 →', OUT);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
