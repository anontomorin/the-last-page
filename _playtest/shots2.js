/* P0 视觉验收：新地图（多状态）与三个实地场景 */
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
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});

async function clearNarrator(page) {
  for (let i = 0; i < 22; i++) {
    const vis = await page.evaluate(() => {
      const n = document.querySelector('#narrator');
      return n && !n.hidden;
    });
    if (!vis) break;
    await page.click('#narrator').catch(() => {});
    await page.waitForTimeout(300);
  }
}

(async () => {
  await new Promise(r => server.listen(8125, r));
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  async function shoot(name, width, height, fn) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', e => console.log(`[pageerror:${name}]`, e.message));
    page.on('console', m => { if (m.type() === 'error') console.log(`[console:${name}]`, m.text()); });
    await page.goto('http://127.0.0.1:8125/index.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#boot-card:not([hidden])', { timeout: 15000 });
    await fn(page);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log('✓', name);
    await page.close();
  }

  /* 地图：第二幕初（钟楼新解锁、其余锁定） */
  await shoot('map_act2_desktop', 1366, 768, async p => {
    await p.click('#btn-start');
    await p.waitForTimeout(400); await clearNarrator(p);
    await p.evaluate(() => {
      LP.state.set({ act: 2 });
      LP.state.addTo('discoveredLocations', 'location_clocktower');
      LP.archive.refreshAll();
      LP.archive.setTab('map');
    });
    await p.waitForTimeout(1800);
  });

  /* 地图：第四幕（多地点已勘察 + 预览卡选中渡口） */
  await shoot('map_act4_ferry_desktop', 1366, 768, async p => {
    await p.click('#btn-start');
    await p.waitForTimeout(400); await clearNarrator(p);
    await p.evaluate(() => {
      LP.state.set({ act: 4 });
      ['location_clocktower', 'location_oldstreet'].forEach(l => LP.state.addTo('discoveredLocations', l));
      LP.archive.refreshAll();
      LP.archive.setTab('map');
    });
    await p.waitForTimeout(1800);
    await p.evaluate(() => {
      const nodes = [...document.querySelectorAll('.map-node')];
      const g = nodes.find(n => n.textContent.includes('渡口'));
      g.dispatchEvent(new Event('mouseenter'));
      g.classList.add('sel');   // 仅展示选中态，不触发进入现场
    });
    await p.evaluate(() => { document.querySelector('#map-preview').scrollIntoView({ block: 'nearest' }); });
    await p.waitForTimeout(500);
  });

  /* 地图移动端 */
  await shoot('map_mobile_390', 390, 844, async p => {
    await p.click('#btn-start');
    await p.waitForTimeout(400); await clearNarrator(p);
    await p.evaluate(() => {
      LP.state.set({ act: 3 });
      LP.state.addTo('discoveredLocations', 'location_clocktower');
      LP.archive.refreshAll();
      LP.archive.setTab('map');
    });
    await p.waitForTimeout(1800);
  });

  /* 钟楼场景（敲钟后：声波/钟面/已勘察记号） */
  await shoot('scene_clocktower_fx', 1366, 768, async p => {
    await p.click('#btn-start');
    await p.waitForTimeout(400); await clearNarrator(p);
    await p.evaluate(() => {
      LP.state.set({ act: 2 });
      LP.archive.refreshAll();
      LP.map.openScene('location_clocktower');
    });
    await p.waitForTimeout(700);
    await p.evaluate(() => {
      const bell = document.querySelector('.scene-obj[data-obj="obj_bell"]');
      bell.click(); bell.click();
    });
    await p.waitForTimeout(350);
    await p.locator('.scene-obj[data-obj="obj_board"]').click();
    await p.waitForTimeout(500);
  });

  /* 渡口：点击水面波纹 + 木牌 */
  await shoot('scene_ferry_fx', 1366, 768, async p => {
    await p.click('#btn-start');
    await p.waitForTimeout(400); await clearNarrator(p);
    await p.evaluate(() => {
      LP.state.set({ act: 4 });
      ['location_clocktower', 'location_oldstreet', 'location_ferry'].forEach(l => LP.state.addTo('discoveredLocations', l));
      LP.archive.refreshAll();
      LP.map.openScene('location_ferry');
    });
    await p.waitForTimeout(700);
    await p.evaluate(() => {
      const river = document.querySelector('.scene-obj[data-obj="obj_river"]');
      const r = river.getBoundingClientRect();
      river.dispatchEvent(new MouseEvent('click', { clientX: r.left + 20, clientY: r.top + 20, bubbles: true }));
    });
    await p.waitForTimeout(300);
  });

  /* 老街 */
  await shoot('scene_oldstreet_fx', 1366, 768, async p => {
    await p.click('#btn-start');
    await p.waitForTimeout(400); await clearNarrator(p);
    await p.evaluate(() => {
      LP.state.set({ act: 4 });
      LP.archive.refreshAll();
      LP.map.openScene('location_oldstreet');
    });
    await p.waitForTimeout(700);
    await p.locator('.scene-obj[data-obj="obj_shop"]').click();
    await p.waitForTimeout(400);
  });

  await browser.close();
  server.close();
  console.log('完成 →', OUT);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
