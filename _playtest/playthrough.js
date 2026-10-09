/* ============================================================
   《最后一页没有写完》双人拼卷 · 全流程双开浏览器实测
   ------------------------------------------------------------
   A / B 两个独立浏览器上下文（各自独立 localStorage），
   全程通过真实 UI 操作推进：点击、输入、选择、提交。
   仅在断言时使用 page.evaluate 读取状态。
   ============================================================ */
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

/* 依赖路径与站点地址均可通过环境变量覆盖（便于 CI / 换机） */
const PW_PATH = process.env.PLAYWRIGHT_PATH || '';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.env.TEST_PORT || '8123';
const URL = process.env.TEST_URL || `http://127.0.0.1:${PORT}/index.html`;
const SHOTS = path.join(__dirname, 'shots');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

/* 若指定了独立 playwright-core 目录，则从该目录加载 */
let pw = null;
try {
  pw = PW_PATH ? require(path.join(PW_PATH, 'index.js')) : { chromium };
} catch (e) {
  console.error('[playthrough] 无法加载 playwright-core：', e.message);
  process.exit(2);
}
const chromiumImpl = pw.chromium || chromium;

let failures = [];
let stepNo = 0;

function ok(msg) { console.log('   [OK] ' + msg); }
function fail(msg) { console.log('   [FAIL] ' + msg); failures.push(msg); }
function assert(c, msg) { c ? ok(msg) : fail(msg); }
function head(t) { console.log('\n── ' + t + ' ──'); }
async function step(role, msg) { console.log(`  ·[${role}] ${msg}`); }

/* ---------- 通用 UI 助手 ---------- */
async function clearNarrator(page) {
  for (let i = 0; i < 120; i++) {
    const hidden = await page.evaluate(() => document.getElementById('narrator').hidden);
    if (hidden) return;
    await page.click('#narrator', { force: true }).catch(() => {});
    await page.waitForTimeout(120);
  }
  console.log('   [WARN] 旁白层未能在预期次数内关闭');
}

async function closeViewer(page) {
  const visible = await page.evaluate(() => !document.getElementById('viewer').hidden);
  if (visible) {
    await page.click('#viewer-close').catch(() => {});
    await page.waitForTimeout(180);
  }
}

async function goTab(page, name) {
  await page.click(`.wb-tab[data-tab="${name}"]`);
  await page.waitForTimeout(250);
}

async function snap(page, name, role) {
  await page.screenshot({ path: path.join(SHOTS, `${String(++stepNo).padStart(2, '0')}-${role}-${name}.png`) })
    .catch(() => {});
}

/* 读取一篇资料：在当前标签页列表里点击该条目 */
async function readDoc(page, role, id) {
  const item = page.locator(`.doc-item[data-id="${id}"]`).first();
  if (!(await item.count())) throw new Error(`[${role}] 列表里找不到资料 ${id}`);
  if (await item.evaluate(el => el.classList.contains('locked'))) {
    throw new Error(`[${role}] 资料 ${id} 仍处于锁定状态`);
  }
  await item.click();
  await page.waitForTimeout(320);
  await clearNarrator(page);
  await closeViewer(page);
  const read = await page.evaluate(i => LP.state.get().discoveredDocuments.includes(i), id);
  assert(read, `[${role}] 已阅读 ${id}`);
}

/* 照片翻面 */
async function flipPhoto(page, role, id) {
  const item = page.locator(`.doc-item[data-id="${id}"]`).first();
  await item.click();
  await page.waitForTimeout(300);
  await clearNarrator(page);
  await page.locator('#viewer-tools .vt', { hasText: '翻面' }).first().click();
  await page.waitForTimeout(600);
  await clearNarrator(page);
  const flipped = await page.evaluate(i => LP.state.get().photoFlipped.includes(i), id);
  assert(flipped, `[${role}] 已翻面 ${id}`);
  return page;
}

/* ---------- 通话面板 ---------- */
async function openDuo(page) { await page.click('#btn-duo'); await page.waitForTimeout(250); }
async function closeDuo(page) {
  const has = await page.locator('.duo-overlay').count();
  if (has) {
    await page.locator('.duo-overlay .btn-ghost', { hasText: '挂断' }).first().click().catch(() => {});
    await page.waitForTimeout(200);
  }
}

async function sayableIds(page) {
  return page.evaluate(() => LP.duoScript.sayable(LP.state.get()).map(t => t.id));
}
async function hasPuzzle(page, id) {
  return page.evaluate(i => LP.state.get().completedPuzzles.includes(i), id);
}

/* 听写：由 who 记录 opponentIsReady 的话题 */
async function hear(page, role, topicId, answer) {
  await openDuo(page);
  const row = page.locator(`.duo-list[data-role="hear"] .duo-topic[data-topic="${topicId}"]`).first();
  if (!(await row.count())) throw new Error(`[${role}] 通话面板找不到待记话题 ${topicId}`);
  if (await row.evaluate(el => el.classList.contains('done'))) {
    ok(`[${role}] 话题 ${topicId} 此前已记下`);
    await closeDuo(page);
    return;
  }
  await row.locator('.duo-topic-head .btn-ghost').first().click();
  await page.waitForTimeout(200);
  await row.locator('.duo-hear-input').fill(answer);
  await row.locator('.duo-line-acts .btn-primary.small').first().click();
  await page.waitForTimeout(500);
  await clearNarrator(page);
  const done = await page.evaluate(t => {
    const t0 = LP.duoScript.byId(t);
    return LP.state.get().completedPuzzles.includes(t0.listen.done);
  }, topicId);
  assert(done, `[${role}] 记下《${topicId}》： ${answer}`);
  await closeDuo(page);
}

/* 一次完整的「口头交换」：先确认对方确实手上有这句话，再让这边记下 */
async function exchange(fromPage, fromRole, toPage, toRole, topicId, answer) {
  const ready = await sayableIds(fromPage);
  assert(ready.includes(topicId), `[${fromRole}] 通话面板已出现可念话题《${topicId}》（对方身上的确有这句话）`);
  await hear(toPage, toRole, topicId, answer);
}

/* ---------- 证据板：主动建立关系（P0） ---------- */
async function linkEvidence(page, role, nodeA, nodeB, typeLabel) {
  await goTab(page, 'evidence');
  await page.waitForTimeout(400);
  await page.locator('.ev-overlay').first().evaluate(el => el.remove()).catch(() => {});
  // 打开「建立关系」模式
  const modeBtn = page.locator('.ev-modebar .btn-ghost').first();
  const on = await modeBtn.evaluate(el => el.classList.contains('on')).catch(() => false);
  if (!on) { await modeBtn.click(); await page.waitForTimeout(250); }
  // 依次点两个节点
  const a = page.locator(`.ev-node[data-id="${nodeA}"]`).first();
  const b = page.locator(`.ev-node[data-id="${nodeB}"]`).first();
  if (!(await a.count()) || !(await b.count())) {
    const ids = await page.evaluate(() => [...document.querySelectorAll('.ev-node')].map(e => e.dataset.id));
    throw new Error(`[${role}] 证据板缺少节点 ${nodeA}/${nodeB}；现有：${ids.join(',')}`);
  }
  await a.click();
  await page.waitForTimeout(180);
  await b.click();
  await page.waitForTimeout(300);
  // 选关系类型：按 <b> 标签精确匹配（描述文字里可能也含同样的字）
  const typeBtn = page.locator('.ev-dialog .ev-type').filter({
    has: page.locator('b', { hasText: new RegExp(`^${typeLabel}$`) })
  }).first();
  if (!(await typeBtn.count())) throw new Error(`[${role}] 关系类型「${typeLabel}」不存在`);
  await typeBtn.click();
  await page.waitForTimeout(180);
  await page.locator('.ev-dialog-acts .btn-primary', { hasText: '确认建立' }).click();
  await page.waitForTimeout(600);
  await clearNarrator(page);
  // 关闭可能残留的对话框
  await page.locator('.ev-overlay').first().evaluate(el => el.remove()).catch(() => {});
}

/* ---------- 时间线 ---------- */
async function doTimeline(page, role, placements, weather, dates) {
  await goTab(page, 'timeline');
  await page.waitForTimeout(300);
  for (const [cardId, slot] of placements) {
    await page.locator(`.tl-pool .tl-card[data-id="${cardId}"]`).first().click();
    await page.waitForTimeout(200);
    await page.locator(`.tl-slot[data-slot="${slot}"] .tl-slot-head`).first().click();
    await page.waitForTimeout(300);
  }
  const placedCount = await page.evaluate(() =>
    Object.values(LP.state.get().timelineNodes).flat().length);
  assert(placedCount === placements.length, `[${role}] ${placements.length} 张卡已全部放入槽位（实际 ${placedCount}）`);

  for (let i = 0; i < 3; i++) {
    await page.locator(`.tl-slot[data-slot="${i}"] .tl-sel`).first().selectOption(weather[i]);
    await page.waitForTimeout(120);
  }
  const wOK = await page.evaluate(w => JSON.stringify(LP.state.get().tlWeather) === JSON.stringify(w), weather);
  assert(wOK, `[${role}] 三日的天色已选为 ${weather.join(' / ')}`);

  const dateDisabled = await page.locator('.tl-slot[data-slot="0"] .tl-date-in').first().isDisabled();
  assert(!dateDisabled, `[${role}] 完成双卷核对后，日期输入框已解锁`);

  for (let i = 0; i < 3; i++) {
    await page.locator(`.tl-slot[data-slot="${i}"] .tl-date-in`).first().fill(dates[i]);
    await page.waitForTimeout(120);
  }
  await page.locator('.tl-actions .btn-primary', { hasText: '交叉验证' }).click();
  await page.waitForTimeout(900);
  await clearNarrator(page);
  const done = await hasPuzzle(page, 'timeline');
  assert(done, `[${role}] 交叉验证通过，时间线修复`);
  await snap(page, 'timeline-done', role);
}

/* ---------- 第 32 页 ---------- */
async function repairPage32(page, role, fragLabels) {
  // 从《日记 · 其三十一》预览卡底部的关联入口进入
  await goTab(page, 'diary');
  await readDoc(page, role, 'diary_31');
  const chip = page.locator('#wb-preview .rel-chip', { hasText: 'PAGE_032' }).first();
  if (!(await chip.count())) throw new Error(`[${role}] 预览卡底部没有 PAGE_032 关联入口`);
  ok(`[${role}] 预览卡底部出现 PAGE_032 关联入口`);
  await chip.click();
  await page.waitForTimeout(500);
  await clearNarrator(page);

  for (let n = 0; n < fragLabels.length + 2; n++) {
    const gar = page.locator('.p32-doc .ocr-frag.garbled:not(.partner)');
    const cnt = await gar.count();
    if (!cnt) break;
    await gar.first().click();
    await page.waitForTimeout(450);
    await clearNarrator(page);
  }
  await page.waitForTimeout(1200);
  await clearNarrator(page);
  const done = await hasPuzzle(page, 'page32');
  assert(done, `[${role}] PAGE_032 本卷段落全部修复`);
  await snap(page, 'page32-done', role);
}

/* ---------- 六幕结局 ---------- */
async function writeFinalPage(page, role, answers, name) {
  await page.waitForSelector('#ending-stage textarea', { timeout: 15000 });
  const tas = page.locator('#ending-stage .end-form textarea');
  const n = await tas.count();
  if (n < 4) throw new Error(`[${role}] 结局页表单数量异常：${n}`);
  for (let i = 0; i < 3; i++) await tas.nth(i).fill(answers[i]);
  await tas.nth(3).fill(name);
  await page.locator('#ending-stage .end-submit .btn-primary').click();
  await page.waitForTimeout(4000);
  await clearNarrator(page);
  await page.waitForTimeout(4000);
  await clearNarrator(page);
  const st = await page.evaluate(() => ({
    act: LP.state.get().act,
    hasMsg: !!LP.state.get().finalMessage,
    stamp: (document.querySelector('#ending-stage .stamp') || {}).textContent || ''
  }));
  assert(st.hasMsg, `[${role}] 已写下我这半页`);
  ok(`[${role}] 结局页印章：${st.stamp}`);
  await snap(page, 'ending', role);
}

async function mergeHalves(pA, pB) {
  head('第六幕 · 合卷');
  const readCode = async (p) => {
    await p.locator('#ending-stage .btn-primary', { hasText: '合卷 · 碎片码' }).click();
    await p.waitForTimeout(400);
    const v = await p.locator('.mg-code[readonly]').first().inputValue();
    await p.locator('.mg-overlay .btn-ghost', { hasText: '收起' }).first().click();
    await p.waitForTimeout(200);
    return v;
  };
  const codeA = await readCode(pA);
  const codeB = await readCode(pB);
  assert(/^LP1\./.test(codeA) && codeA.length > 20, `A 卷碎片码已生成（${codeA.length} 字符）`);
  assert(/^LP1\./.test(codeB) && codeB.length > 20, `B 卷碎片码已生成（${codeB.length} 字符）`);

  const pasteIn = async (p, code, role) => {
    await p.locator('#ending-stage .btn-primary', { hasText: '合卷 · 碎片码' }).click();
    await p.waitForTimeout(400);
    await p.locator('.mg-code:not([readonly])').first().fill(code);
    await p.locator('.mg-overlay .btn-primary', { hasText: '拼入' }).click();
    await p.waitForTimeout(600);
    await clearNarrator(p);
    await p.waitForTimeout(1200);
    await clearNarrator(p);
    const m = await p.evaluate(() => ({
      merged: LP.state.get().merged,
      partner: LP.state.get().partnerName,
      partnerMsg: LP.state.get().partnerMessage
    }));
    assert(m.merged, `[${role}] 合卷完成，对方署名=${m.partner}`);
    assert(!!(m.partnerMsg && m.partnerMsg.q1 && m.partnerMsg.q2 && m.partnerMsg.q3),
      `[${role}] 对方的三问已拼入本页`);
    await snap(p, 'merged', role);
  };
  await pasteIn(pA, codeB, 'A');
  await pasteIn(pB, codeA, 'B');
}

/* ============================================================ */
/* 若本机没有另起的静态服务，自动拉起一个（测试结束后关闭） */
let _ownServer = null;
async function ensureServer() {
  const net = require('net');
  const alive = await new Promise(res => {
    const s = net.connect(parseInt(PORT, 10), '127.0.0.1');
    s.on('connect', () => { s.destroy(); res(true); });
    s.on('error', () => res(false));
  });
  if (alive) return;
  const { createServer } = require('./serve.js');
  _ownServer = createServer();
  await new Promise((res, rej) => {
    _ownServer.once('error', rej);
    _ownServer.listen(parseInt(PORT, 10), '127.0.0.1', res);
  });
  console.log(`[playthrough] 已自动启动本地服务 ${URL}`);
}

(async () => {
  await ensureServer();
  const browser = await chromiumImpl.launch({ executablePath: CHROME, headless: false, args: ['--window-position=0,0'] });
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const A = await ctxA.newPage();
  const B = await ctxB.newPage();

  const errors = { A: [], B: [] };
  [['A', A], ['B', B]].forEach(([k, p]) => {
    p.on('pageerror', e => errors[k].push('pageerror: ' + e.message));
    p.on('dialog', d => d.accept());
    p.on('console', m => { if (m.type() === 'error') errors[k].push('console: ' + m.text()); });
  });

  await A.goto(URL); await B.goto(URL);
  await A.waitForSelector('#boot-card:not([hidden])', { timeout: 25000 });
  await B.waitForSelector('#boot-card:not([hidden])', { timeout: 25000 });

  /* ---------- 开局：两卷分别入场 ---------- */
  head('开局 · 双人入场');
  await A.click('#btn-mode-a'); await A.waitForTimeout(400); await clearNarrator(A);
  await B.click('#btn-mode-b'); await B.waitForTimeout(400); await clearNarrator(B);
  const s0A = await A.evaluate(() => LP.state.get());
  const s0B = await B.evaluate(() => LP.state.get());
  assert(s0A.mode === 'A' && s0A.act === 1, 'A 卷以「执笔者卷 A」进入第一幕');
  assert(s0B.mode === 'B' && s0B.act === 1, 'B 卷以「记录者卷 B」进入第一幕');
  await snap(A, 'boot', 'A'); await snap(B, 'boot', 'B');

  /* ---------- 第一幕 ---------- */
  head('第一幕 · 折痕与那一天');
  await step('A', '阅读《日记 · 其二十一》');
  await readDoc(A, 'A', 'diary_21');
  await snap(A, 'act1-diary21', 'A');

  await goTab(B, 'photo');
  await step('B', '观察《旧照片 · 四人合影》背面折痕');
  await flipPhoto(B, 'B', 'photo_09');
  // 折痕热区是 clip-path 右下三角（斜边恰过元素中心），点元素中心不可靠，
  // 改点三角形内部（右下象限 75%,75%）—— 这本身是本次测试发现的一个可用性缺陷
  await B.locator('.photo-crease').first()
    .click({ position: { x: 39, y: 39 }, timeout: 15000 });
  await B.waitForTimeout(1200);
  await clearNarrator(B);
  assert(await B.evaluate(() => LP.state.get().discoveredEvidence.includes('clue_317')),
    'B 在合影折痕里辨出了线索 clue_317');
  await closeViewer(B);
  await snap(B, 'act1-crease', 'B');

  // 验证「缺失对方的 ingredient 时无法推进」：此刻双方都还不是第二幕
  assert((await A.evaluate(() => LP.state.get().act)) === 1, '未交换前 A 仍停在第一幕（设计上的单向封锁生效）');

  await step('双向', '交换折痕形状 / 三月十七日');
  await exchange(B, 'B', A, 'A', 'crease', '像是三，又像一和七挨在一起');
  await exchange(A, 'A', B, 'B', 'diary21', '三月十七日，钟楼下的合影');

  let aA = await A.evaluate(() => LP.state.get().act);
  let aB = await B.evaluate(() => LP.state.get().act);
  assert(aA === 2, `A 进入第二幕（act=${aA}）`);
  assert(aB === 2, `B 进入第二幕（act=${aB}）`);

  /* ---------- 第二幕 ---------- */
  head('第二幕 · 钟声');
  await step('A', '阅读《日记 · 其十八》');
  await readDoc(A, 'A', 'diary_18');

  await exchange(A, 'A', B, 'B', 'bell7', '响七次');

  await step('B', '走访旧钟楼');
  await goTab(B, 'map');
  await B.waitForTimeout(300);
  const nodeIdx = await B.evaluate(() =>
    [...document.querySelectorAll('.map-node')].findIndex(n => n.textContent.includes('旧钟楼')));
  if (nodeIdx < 0) throw new Error('[B] 地图上没有旧钟楼节点');
  await B.locator('.map-node').nth(nodeIdx).click();
  await B.waitForTimeout(600);

  await B.locator('.scene-obj[data-obj="obj_wall"]').click(); await B.waitForTimeout(200);
  await B.locator('.scene-obj[data-obj="obj_bench"]').click(); await B.waitForTimeout(400);
  await clearNarrator(B);
  for (let i = 0; i < 7; i++) {
    await B.locator('.scene-obj[data-obj="obj_bell"]').click();
    await B.waitForTimeout(320);
  }
  await B.waitForTimeout(500);
  assert(await hasPuzzle(B, 'bell7'), 'B 连敲七次，钟索牵动门闩');
  await snap(B, 'act2-bell', 'B');

  await B.locator('.scene-obj[data-obj="obj_board"]').click();
  await B.waitForTimeout(500);
  const lines = B.locator('.board-paper .board-line');
  assert((await lines.count()) === 12, `公告栏共 ${await lines.count()} 行（应为 12）`);
  await lines.nth(6).click();
  await B.waitForTimeout(1300);
  await clearNarrator(B);
  assert(await hasPuzzle(B, 'board_row7'), 'B 读出被水渍泡糊的第七行');
  await snap(B, 'act2-board', 'B');

  await B.locator('.scene-obj[data-obj="obj_door"]').click();
  await B.waitForTimeout(900);
  await clearNarrator(B);
  assert(await hasPuzzle(B, 'clocktower_door'), 'B 打开旧木门，捡到门缝里的信');
  await B.locator('#btn-scene-back').click();
  await B.waitForTimeout(400);

  await exchange(B, 'B', A, 'A', 'row7', '联络人是周宁');
  await exchange(B, 'B', A, 'A', 'letter02', '我记得走的那天下着雨，冷得很');

  aA = await A.evaluate(() => LP.state.get().act);
  aB = await B.evaluate(() => LP.state.get().act);
  assert(aA === 3, `A 进入第三幕（act=${aA}）`);
  assert(aB === 3, `B 进入第三幕（act=${aB}）`);

  /* ---------- 第三幕 ---------- */
  head('第三幕 · 四个名字');
  await goTab(A, 'letter');
  await readDoc(A, 'A', 'letter_02');   // 先读它：门缝信在 act2 已由 B 口述解锁
  await readDoc(A, 'A', 'letter_03');
  await readDoc(A, 'A', 'letter_04');
  await goTab(B, 'photo');
  await readDoc(B, 'B', 'photo_04');
  await flipPhoto(B, 'B', 'photo_11');
  await closeViewer(B);
  await clearNarrator(B);
  await exchange(A, 'A', B, 'B', 'chen', '落款是陈川');
  await exchange(A, 'A', B, 'B', 'li', '落款是李禾');
  await exchange(B, 'B', A, 'A', 'faces', '从左到右：陈川、周宁、林远、李禾');

  const four = async (p) => p.evaluate(() => ['person_linyuan', 'person_zhou', 'person_chen', 'person_li']
    .every(id => LP.data.people[id].known || LP.state.get().discoveredPeople.includes(id)));
  assert(await four(A), 'A 卷四人身份全部确认');
  assert(await four(B), 'B 卷四人身份全部确认');

  /* —— P0：证据板主动推理 —— 四人认出来还不够，必须亲手连出三条身份关系 —— */
  head('第三幕 · 证据板主动推理');
  const notYet = await A.evaluate(() => LP.state.get().act);
  assert(notYet === 3, `仅「四人确认」不足以推进 —— A 仍停在第三幕（act=${notYet}）`);

  /* 负面用例：错误的关系类型 / 无关的两节点，都不应计入 */
  await linkEvidence(A, 'A', 'clue_zhou_name', 'person_zhou', '矛盾');
  const stillEmpty = await A.evaluate(() => LP.state.get().evidenceLinks.length);
  assert(stillEmpty === 0, `选错关系类型不计入（已建立关系数=${stillEmpty}）`);
  await linkEvidence(A, 'A', 'clue_bell7', 'person_li', '支持');
  const stillEmpty2 = await A.evaluate(() => LP.state.get().evidenceLinks.length);
  assert(stillEmpty2 === 0, `无关的两节点不计入（已建立关系数=${stillEmpty2}）`);
  const actStill3 = await A.evaluate(() => LP.state.get().act);
  assert(actStill3 === 3, `误判不会误推进幕次（act=${actStill3}）`);

  for (const [nodeA, nodeB, typeLabel, ruleKey] of [
    ['clue_zhou_name', 'person_zhou', '同一', 'id_zhou'],
    ['clue_chen_name', 'person_chen', '同一', 'id_chen'],
    ['clue_li_name', 'person_li', '同一', 'id_li']
  ]) {
    await linkEvidence(A, 'A', nodeA, nodeB, typeLabel);
    const has = await A.evaluate(k => LP.state.get().evidenceLinks.includes(k), ruleKey);
    assert(has, `[A] 建立身份关系 ${ruleKey}（${nodeA} ↔ ${nodeB}）`);
  }
  // B 卷同样需要亲手连出这三条（两卷状态相互隔离）
  for (const [nodeA, nodeB, typeLabel, ruleKey] of [
    ['clue_zhou_name', 'person_zhou', '同一', 'id_zhou'],
    ['clue_chen_name', 'person_chen', '同一', 'id_chen'],
    ['clue_li_name', 'person_li', '同一', 'id_li']
  ]) {
    await linkEvidence(B, 'B', nodeA, nodeB, typeLabel);
    const has = await B.evaluate(k => LP.state.get().evidenceLinks.includes(k), ruleKey);
    assert(has, `[B] 建立身份关系 ${ruleKey}`);
  }

  aA = await A.evaluate(() => LP.state.get().act);
  aB = await B.evaluate(() => LP.state.get().act);
  assert(aA === 4, `A 连出三条关系后进入第四幕（act=${aA}）`);
  assert(aB === 4, `B 进入第四幕（act=${aB}）`);
  await snap(A, 'act3-evidence', 'A');

  /* ---------- 第四幕 ---------- */
  head('第四幕 · 那一天');
  await goTab(B, 'photo');
  await flipPhoto(B, 'B', 'photo_08');
  await closeViewer(B);
  await goTab(A, 'diary');
  await readDoc(A, 'A', 'diary_24');

  await exchange(B, 'B', A, 'A', 'tl_photo', '0316 阴冷，0317 晴，0318 雨，证据来源各不相同');
  await exchange(A, 'A', B, 'B', 'tl_text', '0316 倒春寒，0317 天气很好，她的信没有日期，只说下着雨');
  await exchange(A, 'A', B, 'B', 'route', '住处、老街、钟楼、渡口，那天演练的路线');
  await exchange(A, 'A', B, 'B', 'photoback', '月日在前，顺序在后');

  await doTimeline(A, 'A',
    [['tl_letter03', 0], ['tl_diary24', 1], ['tl_letter02', 2], ['tl_diary25', 2]],
    ['cold', 'sun', 'rain'], ['16', '17', '18']);
  await doTimeline(B, 'B',
    [['tl_photo09', 0], ['tl_photo01', 1], ['tl_photo05', 2]],
    ['cold', 'sun', 'rain'], ['16', '17', '18']);

  aA = await A.evaluate(() => LP.state.get().act);
  aB = await B.evaluate(() => LP.state.get().act);
  assert(aA === 5, `A 进入第五幕（act=${aA}）`);
  assert(aB === 5, `B 进入第五幕（act=${aB}）`);

  /* ---------- 第五幕 ---------- */
  head('第五幕 · PAGE_032');
  // B 补走访老街与渡口（地点段的前置）
  await step('B', '走访老街、渡口');
  await goTab(B, 'map'); await B.waitForTimeout(400);
  for (const locName of ['老街', '渡口']) {
    const idx = await B.evaluate(n => [...document.querySelectorAll('.map-node')].findIndex(x => x.textContent.includes(n)), locName);
    if (idx >= 0) {
      await B.locator('.map-node').nth(idx).click();
      await B.waitForTimeout(600);
      const objs = await B.locator('.scene-obj').count();
      for (let i = 0; i < objs; i++) {
        await B.locator('.scene-obj').nth(i).click().catch(() => {});
        await B.waitForTimeout(250);
        await clearNarrator(B);
      }
      await B.locator('#btn-scene-back').click();
      await B.waitForTimeout(400);
    }
  }
  const locs = await B.evaluate(() => LP.state.get().discoveredLocations);
  assert(['location_clocktower', 'location_oldstreet', 'location_ferry'].every(l => locs.includes(l)),
    `B 三处地点均已确证：${locs.join('、')}`);

  await repairPage32(A, 'A', ['人物', '时间', '信件']);
  await repairPage32(B, 'B', ['地点', '照片']);

  await A.waitForTimeout(1500); await clearNarrator(A);
  await B.waitForTimeout(1500); await clearNarrator(B);
  aA = await A.evaluate(() => LP.state.get().act);
  aB = await B.evaluate(() => LP.state.get().act);
  assert(aA === 6, `A 进入第六幕（act=${aA}）`);
  assert(aB === 6, `B 进入第六幕（act=${aB}）`);

  /* ---------- 第六幕 ---------- */
  head('第六幕 · 写给未来');
  await writeFinalPage(A, 'A',
    ['你们没写完的那句话，我替你们留白了。', '今天的我们有笔，也有时间。', '谢谢你肯把字念给我听。'],
    '执笔者');
  await writeFinalPage(B, 'B',
    ['我用这台相机替未来按下了快门。', '请记得他们只是普通的年轻人。', '下次换我替你按下快门。'],
    '记录者');
  await mergeHalves(A, B);

  /* ---------- 收尾核对 ---------- */
  head('收尾核对');
  const finalA = await A.evaluate(() => {
    const s = LP.state.get();
    return {
      act: s.act, mode: s.mode, merged: s.merged, partner: s.partnerName,
      pct: (document.querySelector('#ending-stage .pct') || {}).textContent || '',
      stamp: (document.querySelector('#ending-stage .stamp') || {}).textContent || '',
      percent: (document.getElementById('wb-percent') || {}).textContent || ''
    };
  });
  const finalB = await B.evaluate(() => {
    const s = LP.state.get();
    return {
      act: s.act, mode: s.mode, merged: s.merged, partner: s.partnerName,
      pct: (document.querySelector('#ending-stage .pct') || {}).textContent || '',
      stamp: (document.querySelector('#ending-stage .stamp') || {}).textContent || ''
    };
  });
  console.log('  A 卷终态：', JSON.stringify(finalA));
  console.log('  B 卷终态：', JSON.stringify(finalB));
  assert(finalA.merged && finalB.merged, '两卷均已合卷');
  assert(finalA.partner === '记录者' && finalB.partner === '执笔者', '两卷互相拿到对方署名');

  head('运行期错误');
  Object.entries(errors).forEach(([k, arr]) => {
    const real = arr.filter(x => !/favicon|404/.test(x));
    console.log(`  ${k} 卷：${real.length ? real.join('\n    ') : '无 JS 错误'}`);
    if (real.length) failures.push(`${k} 卷存在 JS 错误`);
  });

  console.log('\n════════════════════════════════');
  console.log(failures.length ? `测试存在失败项（${failures.length}）：` : '全部断言通过 ✔');
  failures.forEach(f => console.log('  × ' + f));
  console.log('════════════════════════════════');

  await browser.close();
  if (_ownServer) _ownServer.close();
  process.exit(failures.length ? 1 : 0);
})().catch(async e => {
  console.error('\n[FATAL]', e.message);
  console.error(e.stack.split('\n').slice(1, 4).join('\n'));
  if (_ownServer) _ownServer.close();
  process.exit(2);
});
