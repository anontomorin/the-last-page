/* 第三轮视觉验收：资源/动效规范 + 地图/场景/推理/结局 全流程截图
   覆盖：1920×1080、1366×768、390×844、320×568 */
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
    const vis = await page.evaluate(() => { const n = document.querySelector('#narrator'); return n && !n.hidden; });
    if (!vis) break;
    await page.click('#narrator').catch(() => {});
    await page.waitForTimeout(260);
  }
}

(async () => {
  await new Promise(r => server.listen(8126, r));
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  async function shoot(name, width, height, fn, opts) {
    if (process.env.ONLY && name.indexOf(process.env.ONLY) < 0) return;   // 可按需只跑子集
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', e => console.log(`[pageerror:${name}]`, e.message));
    page.on('console', m => { if (m.type() === 'error') console.log(`[console:${name}]`, m.text()); });
    await page.goto('http://127.0.0.1:8126/index.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#boot-card:not([hidden])', { timeout: 15000 });
    await fn(page);
    if (opts && opts.media) await page.emulateMedia({ media: opts.media });   // 交互完成后再切媒体
    await page.waitForTimeout(opts && opts.media ? 120 : 0);
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: !!(opts && opts.full) });
    console.log('✓', name);
    await page.close();
  }

  const enterGame = async (p) => { await p.click('#btn-start'); await p.waitForTimeout(400); await clearNarrator(p); };

  /* ---------- 启动页（桌面 / 移动） ---------- */
  await shoot('r3_boot_desktop_1920', 1920, 1080, async () => { await new Promise(r => setTimeout(r, 300)); });
  await shoot('r3_boot_mobile_390', 390, 844, async () => { await new Promise(r => setTimeout(r, 300)); });
  await shoot('r3_boot_mobile_320', 320, 568, async () => { await new Promise(r => setTimeout(r, 300)); });

  /* ---------- 地图：初次进入（新解锁印章）/ 已勘察 / 桌面1920 / 移动 ---------- */
  await shoot('r3_map_enter_1366', 1366, 768, async p => {
    await enterGame(p);
    await p.evaluate(() => {
      LP.state.set({ act: 2 });
      LP.archive.refreshAll();
      LP.archive.setTab('map');
    });
    await p.waitForTimeout(1800);
  });

  await shoot('r3_map_unlock_1366', 1366, 768, async p => {
    await enterGame(p);
    await p.evaluate(() => {
      LP.state.set({ act: 4 });
      ['location_clocktower', 'location_oldstreet'].forEach(l => LP.state.addTo('discoveredLocations', l));
      LP.archive.refreshAll();
      LP.archive.setTab('map');
    });
    await p.waitForTimeout(900);
    await p.evaluate(() => {
      const nodes = [...document.querySelectorAll('.map-node')];
      const g = nodes.find(n => n.textContent.includes('渡口'));
      if (g) { g.dispatchEvent(new Event('mouseenter')); g.classList.add('sel'); }
    });
    await p.evaluate(() => { const el = document.querySelector('#map-preview'); if (el) el.scrollIntoView({ block: 'nearest' }); });
    await p.waitForTimeout(600);
  });

  await shoot('r3_map_desktop_1920', 1920, 1080, async p => {
    await enterGame(p);
    await p.evaluate(() => {
      LP.state.set({ act: 4 });
      ['location_clocktower', 'location_oldstreet', 'location_ferry'].forEach(l => LP.state.addTo('discoveredLocations', l));
      LP.archive.refreshAll();
      LP.archive.setTab('map');
    });
    await p.waitForTimeout(1800);
  });

  await shoot('r3_map_mobile_390', 390, 844, async p => {
    await enterGame(p);
    await p.evaluate(() => {
      LP.state.set({ act: 3 });
      LP.state.addTo('discoveredLocations', 'location_clocktower');
      LP.archive.refreshAll();
      LP.archive.setTab('map');
    });
    await p.waitForTimeout(1800);
  });

  /* ---------- 钟楼：第七声高潮 ---------- */
  await shoot('r3_scene_bell7_1366', 1366, 768, async p => {
    await enterGame(p);
    await p.evaluate(() => {
      LP.state.set({ act: 2 });
      LP.state.set({ bellRings: 6 });
      LP.archive.refreshAll();
      LP.map.openScene('location_clocktower');
    });
    await p.waitForTimeout(700);
    await p.evaluate(() => { document.querySelector('.scene-obj[data-obj="obj_bell"]').click(); });
    await p.waitForTimeout(420);
  });

  await shoot('r3_scene_desktop_1920', 1920, 1080, async p => {
    await enterGame(p);
    await p.evaluate(() => {
      LP.state.set({ act: 2 });
      LP.archive.refreshAll();
      LP.map.openScene('location_clocktower');
    });
    await p.waitForTimeout(900);
  });

  await shoot('r3_scene_mobile_390', 390, 844, async p => {
    await enterGame(p);
    await p.evaluate(() => {
      LP.state.set({ act: 2 });
      LP.archive.refreshAll();
      LP.map.openScene('location_clocktower');
    });
    await p.waitForTimeout(900);
  });

  /* ---------- 公告栏第七行显影 ---------- */
  await shoot('r3_scene_board_row7_1366', 1366, 768, async p => {
    await enterGame(p);
    await p.evaluate(() => {
      LP.state.set({ act: 2 });
      LP.inv.discoverClue('clue_717', true);
      LP.archive.refreshAll();
      LP.map.openScene('location_clocktower');
    });
    await p.waitForTimeout(700);
    await p.locator('.scene-obj[data-obj="obj_board"]').click();
    await p.waitForTimeout(500);
    await p.locator('.board-paper .board-line').nth(6).click();
    await p.waitForTimeout(800);
    await clearNarrator(p);
    await p.waitForTimeout(200);
  });

  /* ---------- 渡口水波 / 老街热点 ---------- */
  await shoot('r3_scene_ferry_fx_1366', 1366, 768, async p => {
    await enterGame(p);
    await p.evaluate(() => {
      LP.state.set({ act: 4 });
      LP.archive.refreshAll();
      LP.map.openScene('location_ferry');
    });
    await p.waitForTimeout(700);
    await p.evaluate(() => {
      const river = document.querySelector('.scene-obj[data-obj="obj_river"]');
      const r = river.getBoundingClientRect();
      river.dispatchEvent(new MouseEvent('click', { clientX: r.left + 30, clientY: r.top + 24, bubbles: true }));
    });
    await p.waitForTimeout(340);
  });

  await shoot('r3_scene_oldstreet_fx_1366', 1366, 768, async p => {
    await enterGame(p);
    await p.evaluate(() => {
      LP.state.set({ act: 4 });
      LP.archive.refreshAll();
      LP.map.openScene('location_oldstreet');
    });
    await p.waitForTimeout(700);
    await p.locator('.scene-obj[data-obj="obj_shop"]').click();
    await p.waitForTimeout(500);
  });

  /* ---------- 证据板：连线墨画 + 成败反馈 ---------- */
  await shoot('r3_evidence_1366', 1366, 768, async p => {
    await enterGame(p);
    await p.evaluate(() => {
      LP.state.set({ act: 3 });
      ['clue_317', 'clue_717', 'clue_zhou_name'].forEach(c => LP.inv.discoverClue(c, true));
      ['person_zhou', 'person_chen', 'person_li'].forEach(pp => LP.inv.identifyPerson(pp));
      if (LP.data.reasonRequired && LP.data.reasonRequired.act3) {
        LP.data.reasonRequired.act3.forEach(key => {
          const r = LP.data.reasonRules.find(x => x.key === key);
          if (r) LP.state.addTo('evidenceLinks', r.key);
        });
      }
      LP.archive.refreshAll();
      LP.archive.setTab('evidence');
    });
    await p.waitForTimeout(1400);
  });

  /* ---------- 时间线：字段失败 / 成功 ---------- */
  await shoot('r3_timeline_fail_1366', 1366, 768, async p => {
    await enterGame(p);
    await p.evaluate(() => {
      LP.state.set({ act: 4 });
      const all = LP.data.timelineCards.map(c => c.id);
      LP.state.set({ timelineNodes: { 0: all, 1: [], 2: [] } });
      LP.archive.refreshAll();
      LP.archive.setTab('timeline');
    });
    await p.waitForTimeout(700);
    await p.locator('.tl-actions .btn-primary').click();
    await p.waitForTimeout(800);
    await p.evaluate(() => { const el = document.querySelector('.tl-conflict'); if (el) el.scrollIntoView({ block: 'center' }); });
    await p.waitForTimeout(300);
  });

  await shoot('r3_timeline_done_1366', 1366, 768, async p => {
    await enterGame(p);
    await p.evaluate(() => {
      LP.state.set({ act: 4 });
      const nodes = {}, w = [], d = [];
      LP.data.timelineDays.forEach((day, i) => { nodes[i] = day.accept.slice(); w[i] = day.weather; d[i] = day.num; });
      LP.state.set({ timelineNodes: nodes, tlWeather: w, tlDate: d });
      LP.archive.refreshAll();
      LP.archive.setTab('timeline');
    });
    await p.waitForTimeout(700);
    await p.locator('.tl-actions .btn-primary').click();
    await p.waitForTimeout(900);
    await clearNarrator(p);
    await p.evaluate(() => { LP.archive.setTab('timeline'); });
    await p.waitForTimeout(400);
    await p.evaluate(() => { const el = document.querySelector('.tl-slot.done'); if (el) el.scrollIntoView({ block: 'center' }); });
    await p.waitForTimeout(300);
  });

  /* ---------- PAGE_032 修复中 ---------- */
  await shoot('r3_p32_recovery_1366', 1366, 768, async p => {
    await enterGame(p);
    await p.evaluate(() => {
      LP.state.set({ act: 5 });
      const f = LP.story.PAGE32.fragments;
      f.slice(0, Math.max(1, f.length - 2)).forEach(x => LP.state.addTo('ocrFragments', x.id));
      LP.archive.refreshAll();
      LP.doc.open('page_032');
    });
    await p.waitForTimeout(900);
  });

  /* ---------- 结局：书写中（含跳过按钮）/ 恢复稳定态 / 打印 ---------- */
  async function toEnding(p) {
    await enterGame(p);
    await p.evaluate(() => {
      LP.state.set({ act: 5, mode: 'solo' });
      LP.ending.start();
    });
    await p.waitForTimeout(500);
    await p.evaluate(() => {
      const tas = [...document.querySelectorAll('.end-form textarea')];
      tas.forEach((t, i) => { t.value = '我想对他们说：' + (i + 1) + '。'; });
      const btn = document.querySelector('.end-submit .btn-primary');
      if (btn) btn.click();
    });
  }

  await shoot('r3_ending_write_1366', 1366, 768, async p => {
    await toEnding(p);
    await p.waitForTimeout(900);   // 书写进行中，跳过按钮仍在
  });

  await shoot('r3_ending_resume_1366', 1366, 768, async p => {
    await toEnding(p);
    await p.waitForTimeout(1500);
    await p.evaluate(() => LP.ending.resume());
    await p.waitForTimeout(900);
  });

  await shoot('r3_ending_print_1366', 1366, 768, async p => {
    await toEnding(p);
    await p.waitForTimeout(1500);
    await p.evaluate(() => LP.ending.resume());
    await p.waitForTimeout(600);
  }, { media: 'print' });

  await browser.close();
  server.close();
  console.log('完成 →', OUT);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
