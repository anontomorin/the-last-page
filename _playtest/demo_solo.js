/* ============================================================
   自动试玩演示（单人 · 舒适速率）
   ------------------------------------------------------------
   以真人节奏完整通玩单人模式六幕，供演示/验收观看。
   有头浏览器运行，可随时看着它玩。

   运行方式（与 playthrough 相同的环境变量）：
     PLAYWRIGHT_PATH=... CHROME_PATH=... node _playtest/demo_solo.js
   或在项目根目录：
     npm run demo        （已在 package.json 注册）

   节奏：P 为倍率（默认 1），加大则更快： node _playtest/demo_solo.js fast
   ============================================================ */
const path = require('path');
const fs = require('fs');
const http = require('http');

const PW = process.env.PLAYWRIGHT_PATH
  || 'C:/Users/郭家兴/.workbuddy/binaries/node/workspace/node_modules/playwright-core';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let { chromium } = {};
try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(PW)); }

/* 节奏倍率：默认 1（舒适）；fast → 0.55；slow → 1.6 */
const SPEED = process.argv.includes('fast') ? 0.55
  : process.argv.includes('slow') ? 1.6 : 1;
const P = ms => Math.round(ms * SPEED);

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

const URL = 'http://127.0.0.1:8130/index.html';

function head(t) { console.log('\n── ' + t + ' ──'); }
function ok(t) { console.log('  ✓ ' + t); }

(async () => {
  await new Promise(r => server.listen(8130, r));
  console.log(`[demo] 本地服务 ${URL} · 节奏倍率 ×${SPEED}`);
  const HEADLESS = process.argv.includes('headless') || process.env.HEADLESS === '1';
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: HEADLESS,                 // 默认有头：看着它玩；'headless' 参数用于无头校验
    args: ['--window-size=1480,940', '--window-position=60,40']
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 880 } });
  page.on('pageerror', e => console.log('[JS错误]', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()); });

  /* 旁白：先等它出现（部分旁白有延迟弹出），再以阅读节奏逐行点掉 */
  async function narrate() {
    // 等旁白层出现（最多 3s；没有就是不出现）
    try {
      await page.waitForFunction(
        () => { const n = document.querySelector('#narrator'); return n && !n.hidden; },
        { timeout: P(3000) });
    } catch (e) { return; }
    for (let i = 0; i < 26; i++) {
      const vis = await page.evaluate(() => {
        const n = document.querySelector('#narrator');
        return !!(n && !n.hidden);
      });
      if (!vis) return;
      await page.mouse.click(720, 760);      // 旁白框区域（点击继续）
      await page.waitForTimeout(P(620));
    }
  }
  const pause = ms => page.waitForTimeout(P(ms));
  async function goTab(tab) {
    await page.locator(`.wb-tab[data-tab="${tab}"]`).click();
    await pause(500);
  }
  async function openDoc(id) {              // 从左侧列表打开一份资料
    await page.locator(`.doc-item[data-id="${id}"]`).first().click();
    await pause(700);
  }
  async function closeViewer() {
    await narrate();                          // 旁白层会罩住查看器，先清掉
    await page.locator('#viewer-close').click().catch(() => {});
    await pause(350);
  }
  async function waitAct(n, timeout = 15000) {
    await page.waitForFunction(a => LP.state.get().act >= a, n, { timeout });
  }

  /* ================= 开场 ================= */
  head('开场 · 封面');
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#boot-card:not([hidden])', { timeout: 15000 });
  await pause(1400);                          // 欣赏封面
  await page.click('#btn-start');
  await pause(700);
  await narrate();                            // 欢迎旁白
  ok('进入第一幕');

  /* ================= 第一幕 · 折痕与日记 ================= */
  head('第一幕 · 一张旧照片');
  await goTab('photo');
  await openDoc('photo_09');
  await page.locator('#viewer-tools .vt', { hasText: '翻面' }).click();
  await page.waitForSelector('.photo-card.flipped');
  await pause(1500);                          // 等翻面动画落定，看背面
  // 折痕热区是 clip-path 右下三角（斜边过元素中心），须点右下象限内部
  await page.locator('.photo-crease').first()
    .click({ position: { x: 39, y: 39 }, timeout: 15000 });
  await pause(1600);                          // 辨读折痕
  await narrate();
  await closeViewer();

  await goTab('diary');
  await openDoc('diary_21');                  // 三月十七日，钟楼
  await pause(1800);                          // 读日记
  await closeViewer();
  await waitAct(2);
  await narrate();
  ok('两条记录互相印证 → 第二幕');

  /* ================= 第二幕 · 旧钟楼 ================= */
  head('第二幕 · 钟声与公告栏');
  await goTab('map');
  await pause(1200);                          // 看墨水路线描画
  await page.locator('.map-node', { hasText: '旧钟楼' }).first().click();
  await pause(900);
  // 观察：墙壁与长椅
  await page.locator('.scene-obj[data-obj="obj_wall"]').click();
  await pause(1500);
  await page.locator('.scene-obj[data-obj="obj_bench"]').click();
  await pause(1500);
  await narrate();
  // 敲钟七声
  for (let i = 0; i < 7; i++) {
    await page.locator('.scene-obj[data-obj="obj_bell"]').click();
    await pause(i === 6 ? 1400 : 720);        // 第七声多留些时间看演出
  }
  ok('七声钟响，铁索松动');
  // 公告栏第七行
  await page.locator('.scene-obj[data-obj="obj_board"]').click();
  await pause(900);
  await page.locator('.board-paper .board-line').nth(6).click();
  await pause(1500);
  await narrate();
  // 旧木门
  await page.locator('.scene-obj[data-obj="obj_door"]').click();
  await pause(1600);
  await narrate();
  await waitAct(3);
  await narrate();
  await page.locator('#btn-scene-back').click();   // 返回工作台
  await pause(700);
  ok('「周宁」浮出水面 → 第三幕');

  /* ================= 第三幕 · 让代号回到名字 ================= */
  head('第三幕 · 证据板');
  // 陈川与李禾的署名线索（与测试一致：读信与照片编号说明获得）
  await page.evaluate(() => {
    LP.inv.discoverClue('clue_chen_name');
    LP.inv.discoverClue('clue_li_name');
  });
  await pause(900);
  await narrate();

  await goTab('evidence');
  await pause(900);
  // 建立三条身份关系：选节点 → 选「同一」→ 确认
  const links = [
    ['clue_zhou_name', 'person_zhou'],
    ['clue_chen_name', 'person_chen'],
    ['clue_li_name', 'person_li']
  ];
  const modeBtn = page.locator('.ev-modebar .btn-ghost').first();
  await modeBtn.click();
  await pause(500);
  for (const [a, b] of links) {
    await page.locator(`.ev-node[data-id="${a}"]`).first().click();
    await pause(650);
    await page.locator(`.ev-node[data-id="${b}"]`).first().click();
    await pause(700);
    await page.locator('.ev-dialog .ev-type', { has: page.locator('b', { hasText: '同一' }) }).first().click();
    await pause(500);
    await page.locator('.ev-dialog-acts .btn-primary').click();
    await pause(1200);                        // 看连线墨画 + 金环
    await narrate();
  }
  await waitAct(4);
  await narrate();
  ok('三条身份关系成立 → 第四幕');

  /* ================= 第四幕 · 时间线 ================= */
  head('第四幕 · 把记录放回时间里');
  // 先读几封信用作日期来源（演示用）
  await goTab('letter');
  await openDoc('letter_02'); await pause(1500); await closeViewer();
  await openDoc('letter_03'); await pause(1500); await closeViewer();
  await openDoc('letter_04'); await pause(1500); await closeViewer();
  // 看一眼 3·18 的雨街照片
  await goTab('photo');
  await openDoc('photo_11');
  await pause(1500);
  await closeViewer();

  await goTab('timeline');
  await pause(800);
  // 点选放置（键盘/点触可用的那套交互）
  const placements = [
    ['tl_photo09', 0], ['tl_letter03', 0],
    ['tl_photo01', 1], ['tl_diary24', 1],
    ['tl_photo05', 2], ['tl_letter02', 2], ['tl_diary25', 2]
  ];
  for (const [cid, slot] of placements) {
    await page.locator(`.tl-pool .tl-card[data-id="${cid}"]`).first().click();
    await pause(420);
    await page.locator(`.tl-slot[data-slot="${slot}"] .tl-slot-head`).first().click();
    await pause(520);
  }
  ok('七张卡已分堆');
  const weather = ['cold', 'sun', 'rain'];
  for (let i = 0; i < 3; i++) {
    await page.locator(`.tl-slot[data-slot="${i}"] .tl-sel`).first().selectOption(weather[i]);
    await pause(420);
  }
  for (const [i, d] of ['16', '17', '18'].entries()) {
    await page.locator(`.tl-slot[data-slot="${i}"] .tl-date-in`).first().fill(d);
    await pause(420);
  }
  await page.locator('.tl-actions .btn-primary').click();
  await pause(1800);                          // 看槽位逐段落位
  await narrate();
  await waitAct(5);
  await narrate();
  ok('时间线修复 → 第五幕');

  /* ================= 第五幕 · PAGE_032 ================= */
  head('第五幕 · 修复第32页');
  await goTab('diary');
  await openDoc('diary_31');
  await pause(1200);
  await closeViewer();                        // 查看器关掉，露出预览卡的关联芯片
  await page.locator('#wb-preview .rel-chip', { hasText: 'PAGE_032' }).first().click();
  await pause(900);
  await narrate();
  // 逐段修复（条件已齐：人物/地点/时间/照片/信件全部确证）
  for (let n = 0; n < 7; n++) {
    const gar = page.locator('.p32-doc .ocr-frag.garbled:not(.partner)');
    if (!(await gar.count())) break;
    await gar.first().click();
    await pause(1100);
    await narrate();
  }
  await pause(2200);                          // 看「留白」反转演出
  await narrate();
  await waitAct(6);
  ok('第32页修复 → 第六幕');

  /* ================= 第六幕 · 写给未来 ================= */
  head('第六幕 · 最后一句');
  await page.waitForSelector('#ending-stage textarea', { timeout: 15000 });
  await pause(1200);
  const answers = [
    '那天其实下了三场雨，我们只记得自己的那把伞。',
    '如果重来，我会在钟楼多敲一声，让时间记得我们来过。',
    '请替我们把没说完的话，说给春天听。'
  ];
  const tas = page.locator('#ending-stage .end-form textarea');
  for (let i = 0; i < 3; i++) { await tas.nth(i).fill(answers[i]); await pause(600); }
  await page.locator('#ending-stage .end-submit .btn-primary').click();
  await pause(4500);                          // 看逐行书写
  await page.locator('.fp-skip').click();     // 书写演出演完前跳过剩余部分
  await pause(1500);
  await narrate();
  await pause(1500);
  await page.screenshot({ path: path.join(OUT, 'demo_ending.png') });
  const fin = await page.evaluate(() => ({
    pct: (document.querySelector('#ending-stage .pct') || {}).textContent,
    stamp: (document.querySelector('#ending-stage .stamp') || {}).textContent
  }));
  ok(`结局达成：完整度 ${fin.pct} · ${fin.stamp}`);
  console.log('\n[demo] 试玩完成，浏览器将在 10 秒后关闭（可直接关掉窗口）。');
  await page.waitForTimeout(P(10000));
  await browser.close();
  server.close();
})().catch(e => { console.error('[demo] FATAL', e); process.exit(1); });
