/* 第六/七章升级验收：证据板连线动画 + 结局跳过书写 */
const path = require('path');
const fs = require('fs');
const http = require('http');
const PW = process.env.PLAYWRIGHT_PATH;
const CHROME = process.env.CHROME_PATH;
const { chromium } = require(PW);
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'shots');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
(async () => {
  await new Promise(r => server.listen(8128, r));
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  // 证据板：建立一条关系（连线墨画 + 节点金环）
  let page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('http://127.0.0.1:8128/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#boot-card:not([hidden])');
  await page.evaluate(() => {
    document.querySelector('#btn-skip-load').click();
    LP.state.set({ act: 3 });
    ['clue_zhou_name', 'clue_chen_name', 'clue_li_name'].forEach(c => LP.inv.discoverClue(c, true));
    ['person_zhou', 'person_chen', 'person_li'].forEach(p => LP.inv.identifyPerson(p));
    LP.state.set({ act3Hinted: true });   // 避免提示 toast 遮挡
    LP.router.go('archive');
    LP.archive.refreshAll();
    LP.archive.setTab('evidence');
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    // 直接确立一条关系，捕捉墨画动画中段
    const rule = LP.data.reasonRules.find(r => r.key === 'id_zhou');
    LP.state.addTo('evidenceLinks', rule.key);
    LP.archive.setTab('evidence');
  });
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(OUT, 'evidence_ink_draw.png') });
  console.log('✓ evidence_ink_draw');
  await page.close();

  // 结局：跳过书写按钮 + 印章落印
  page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto('http://127.0.0.1:8128/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#boot-card:not([hidden])');
  await page.evaluate(() => {
    document.querySelector('#btn-skip-load').click();
    LP.state.set({ act: 6, mode: 'solo' });
    LP.ending.start();
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const tas = document.querySelectorAll('.end-form textarea');
    tas.forEach((t, i) => t.value = ['这是第一句回答', '第二句', '第三句'][i]);
    document.querySelector('.end-submit .btn-primary').click();
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, 'ending_print_skip.png') });
  console.log('✓ ending_print_skip');
  await browser.close(); server.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
