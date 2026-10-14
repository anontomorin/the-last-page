/* ============================================================
   新壳（ui2）视觉一致性对比
   ------------------------------------------------------------
   在完全相同的一组真实状态下，分别以「旧壳」（默认）与
   「新壳」（?ui=next）渲染，逐张做像素差对比。
   差异在阈值内即证明「换壳不换样子」——P2 的硬门禁。

   用法：
     node _playtest/ui-compare.js                       # 只截图
     node _playtest/ui-compare.js --diff                # 截图并对比
   产物：
     _playtest/ui-compare/legacy/*.png
     _playtest/ui-compare/next/*.png
   ============================================================ */
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawnSync } = require('child_process');

const PW = process.env.PLAYWRIGHT_PATH
  || 'C:/Users/郭家兴/.workbuddy/binaries/node/workspace/node_modules/playwright-core';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const { chromium } = require(PW);

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'ui-compare');
const DIR_LEGACY = path.join(OUT, 'legacy');
const DIR_NEXT = path.join(OUT, 'next');
for (const d of [DIR_LEGACY, DIR_NEXT]) fs.mkdirSync(d, { recursive: true });

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});

/* 任务卡一侧的真实状态（覆盖六幕 · A 卷等待 · 部分完成 · 折叠）
   注意：必须包含「已完成若干步骤」的用例，
   否则新旧壳的判定差异会被「全部未完成」掩盖成假绿。 */
const CASES = [
  { name: 'act1_solo_partial', cfg: { act: 1, mode: 'solo', discoveredEvidence: ['clue_317'] } },
  { name: 'act2_A_wait', cfg: { act: 2, mode: 'A', completedPuzzles: ['bell7'] } },
  { name: 'act3_solo_reason', cfg: { act: 3, mode: 'solo', discoveredPeople: ['person_linyuan', 'person_zhou', 'person_chen', 'person_li'] } },
  { name: 'act3_solo_linked', cfg: { act: 3, mode: 'solo', discoveredPeople: ['person_linyuan', 'person_zhou', 'person_chen', 'person_li'], evidenceLinks: ['id_zhou', 'id_chen', 'id_li'] } },
  { name: 'act5_A', cfg: { act: 5, mode: 'A' } },
  { name: 'act6_solo_done', cfg: { act: 6, mode: 'solo', finalMessage: { q1: 'a', q2: 'b', q3: 'c' } } },
  { name: 'act3_solo_folded', cfg: { act: 3, mode: 'solo' }, fold: true }
];

async function clearNarrator(page) {
  for (let i = 0; i < 22; i++) {
    const vis = await page.evaluate(() => { const n = document.querySelector('#narrator'); return n && !n.hidden; });
    if (!vis) break;
    await page.click('#narrator').catch(() => {});
    await page.waitForTimeout(220);
  }
}

(async () => {
  await new Promise(r => server.listen(8128, r));
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  async function snap(page, outDir, c) {
    await page.goto('http://127.0.0.1:8128/index.html' + (outDir === DIR_NEXT ? '?ui=next' : ''));
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#boot-card:not([hidden])', { timeout: 15000 });
    await page.click('#btn-start');
    await page.waitForTimeout(420);
    await clearNarrator(page);

    await page.evaluate(cfg => {
      LP.state.set(Object.assign({ currentScene: 'archive' }, cfg));
      LP.archive.refreshAll();
    }, c.cfg);
    await clearNarrator(page);

    if (c.fold) {
      await page.locator('#quest-card button:has-text("收起")').click().catch(() => {});
    }
    await page.waitForTimeout(760);                 // 等入场动画结束，取稳定态
    await page.locator('#quest-card').screenshot({ path: path.join(outDir, c.name + '.png') });
  }

  for (const mode of [{ dir: DIR_LEGACY, tag: 'legacy' }, { dir: DIR_NEXT, tag: 'next' }]) {
    for (const c of CASES) {
      const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
      const errs = [];
      page.on('pageerror', e => errs.push(e.message));
      const ui2err = [];
      page.on('console', m => { if (m.type() === 'error') ui2err.push(m.text()); });
      try {
        await snap(page, mode.dir, c);
      } catch (e) {
        console.log(`✗ ${mode.tag}/${c.name}`, e.message);
      }
      if (errs.length) console.log(`  [pageerror:${mode.tag}/${c.name}]`, errs.join(' | '));
      if (ui2err.length) console.log(`  [console:${mode.tag}/${c.name}]`, ui2err.join(' | '));
      await page.close();
      console.log('✓', mode.tag + '/' + c.name);
    }
  }

  await browser.close();
  server.close();

  if (process.argv.includes('--diff')) {
    const r = spawnSync(process.execPath, [path.join(__dirname, 'visual-diff.js'), DIR_LEGACY, DIR_NEXT], { stdio: 'inherit' });
    process.exit(r.status === null ? 2 : r.status);
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
