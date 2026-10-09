/* ============================================================
   听写校验回归测试
   ------------------------------------------------------------
   目标：证明收紧后的判定「正确答案 + 合理同义」能过，
         「常见误答」过不去。
   做法：把 duoScript 与 duoSystem 的校验逻辑以最小依赖方式加载：
        · 给一个假的 window / LP 环境
        · 直接把 duoScript.js 求值，拿到 topics
        · 把 duoSystem.js 里的 checkAnswer 抽出来复算（不依赖 UI）
   ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

/* ---------- 1. 造假环境 ---------- */
function makeSandbox() {
  const win = {};
  win.window = win;
  win.LP = win.LP || {};
  win.LP.data = win.LP.data || {};
  win.LP.state = {
    get: () => ({ discoveredPeople: [], discoveredDocuments: [], discoveredEvidence: [],
      completedPuzzles: [], photoFlipped: [], act: 6, mode: 'solo' }),
    addTo: () => true, set: () => {}
  };
  win.LP.inv = { discoverClue: () => {} };
  win.LP.ui = { narrate: () => {}, toast: () => {} };
  win.LP.audio = { click: () => {}, error: () => {} };
  win.console = console;
  return win;
}

const sandbox = makeSandbox();
const ctx = vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data/duoScript.js'), 'utf8'), ctx, { filename: 'duoScript.js' });

const topics = sandbox.LP.duoScript.topics;

/* ---------- 2. 复算校验逻辑（与 duoSystem.js 保持一致） ---------- */
function norm(s) {
  return String(s == null ? '' : s)
    .replace(/\s+/g, '')
    .replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[　]/g, '')
    .replace(/[，。、．,.\-—_/·「」『』（）()【】""''：:；;？?！!]/g, '')
    .toLowerCase();
}
function isExact(n, k) {
  const nk = norm(k);
  if (!nk) return false;
  if (n === nk) return true;
  if (n.indexOf(nk) < 0) return false;
  const slack = nk.length <= 2 ? 24 : nk.length <= 4 ? 20 : 14;
  return n.length <= nk.length + slack;
}
function hasWord(n, k) {
  const nk = norm(k);
  if (!nk) return false;
  if (nk.length < 2 && !/^[0-9]+$/.test(nk)) return false;
  return n.indexOf(nk) >= 0;
}
function groupHit(n, k) { const nk = norm(k); return !!nk && n.indexOf(nk) >= 0; }
function checkAnswer(item, input) {
  const n = norm(input);
  if (!n) return false;
  const L = item.listen;
  let ok = false;
  if (L.kind === 'short' && L.accept && L.accept.length) {
    ok = L.accept.some(k => isExact(n, k));
  } else if (L.acceptGroups && L.acceptGroups.length) {
    ok = L.acceptGroups.every(g => g.some(k => groupHit(n, k)));
  } else {
    const hits = (L.accept || []).filter(k => hasWord(n, k)).length;
    ok = hits >= (L.minHits || 1);
  }
  if (!ok) return false;
  if (L.rejectPair) {
    const bad = L.rejectPair.some(([anchors, wrongs]) =>
      anchors.some(a => groupHit(n, a)) && wrongs.some(w => groupHit(n, w)));
    if (bad) return false;
  }
  if (L.reject && L.reject.length) {
    const isShort = L.kind === 'short';
    const hit = L.reject.some(k => {
      const nk = norm(k);
      if (!nk) return false;
      return isShort ? (n === nk || (n.length <= nk.length + 4 && n.indexOf(nk) >= 0))
                     : n.indexOf(nk) >= 0;
    });
    if (hit) return false;
  }
  return true;
}

/* ---------- 3. 测试向量 ---------- */
/* 每条：{ id, correct: [...], synonym: [...], wrong: [...], softWrong: [...] }
   softWrong = 擦边但语义未达标的输入，我们「希望」判否（软断言，仅记录不计失败） */
const CASES = {
  crease: {
    correct: ['3-17', '317', '3月17', '三月十七'],
    synonym: ['3 17', '三一七', '一和七', '3/17', '3月17日', '1和7',
      '像是三，又像一和七挨在一起', '折痕里是三和一七'],
    wrong: ['7', '三', '一', '3', '137', '三月十八', '3-18', '三月十六']
  },
  diary21: {
    correct: ['三月十七', '3月17日在钟楼拍的合影'],
    synonym: ['钟楼合影', '3-17 快门', '旧钟楼', '三月十七钟楼',
      '三月十七日，钟楼下的合影'],
    wrong: ['三月十八', '3月18', '渡口', '面摊']
  },
  bell7: {
    correct: ['7', '七次'],
    synonym: ['七下', '7声', 'seven'],
    wrong: ['4', '三', '12', '五']
  },
  row7: {
    correct: ['周宁'],
    synonym: ['zhouning', 'zhou ning'],
    wrong: ['林远', '陈川', '李禾', '周']
  },
  letter02: {
    correct: ['下雨', '那天下着雨'],
    synonym: ['雨天'],
    wrong: ['晴天', '天气很好']
  },
  chen: {
    correct: ['陈川'],
    synonym: ['chenchuan', 'chen chuan'],
    wrong: ['周宁', '李禾', '林远', '陈']
  },
  li: {
    correct: ['李禾'],
    synonym: ['lihe'],
    wrong: ['周宁', '陈川', '林远', '李']
  },
  faces: {
    correct: ['陈川在最左，李禾在最右', '从左到右：陈川 周宁 林远 李禾'],
    synonym: ['陈川 周宁', '李禾抱着相机', '最右边是李禾'],
    wrong: ['不知道', '看不清', '有几个人']
  },
  tl_photo: {
    correct: ['16日阴冷 17日晴 18日雨'],
    synonym: ['0316 阴 0317 影子 0318 空街'],
    wrong: ['16日 17日', '只有16日'],
    /* 已记录的设计边界：听写只校验「五个事实都听到」，不校验日期↔天气的配对。
       「16日晴 17日雨」这类张冠李戴，交由「时间线」逐槽位判定拦截。 */
    softWrong: ['16日晴 17日雨 18日阴']
  },
  tl_text: {
    correct: ['16日 17日 倒春寒 天气很好 无日期的雨天'],
    synonym: ['三月十六 三月十七 冷 晴 下雨'],
    wrong: ['16日 17日']
  },
  photoback: {
    correct: ['月日在前，顺序在后'],
    synonym: ['编号就是日期', '317 空街'],
    wrong: ['顺序在前，日期在后']
  },
  route: {
    correct: ['住处 老街 钟楼 渡口'],
    synonym: ['老街 渡口'],
    wrong: ['钟楼']
  }
};

/* ---------- 4. 运行 ---------- */
let pass = 0, fail = 0;
const report = [];
const byId = id => topics.find(t => t.id === id);

for (const [id, c] of Object.entries(CASES)) {
  const item = byId(id);
  if (!item) { report.push(`✗ [${id}] 找不到该话题`); fail++; continue; }
  const rows = [];

  c.correct.forEach(v => {
    const r = checkAnswer(item, v);
    if (r) pass++; else fail++;
    rows.push(`    ${r ? '✓' : '✗'} 正确  「${v}」`);
  });
  c.synonym.forEach(v => {
    const r = checkAnswer(item, v);
    if (r) pass++; else fail++;
    rows.push(`    ${r ? '✓' : '✗'} 同义  「${v}」`);
  });
  c.wrong.forEach(v => {
    const r = checkAnswer(item, v);
    if (!r) pass++; else fail++;
    rows.push(`    ${!r ? '✓' : '✗'} 误答  「${v}」${r ? ' ← 不该通过！' : ''}`);
  });
  (c.softWrong || []).forEach(v => {
    const r = checkAnswer(item, v);
    rows.push(`    ${r ? '△' : '✓'} 边界  「${v}」${r ? '（已知边界：不由听写拦截）' : ''}`);
  });

  report.push(`  [${id}] kind=${item.listen.kind || (item.listen.acceptGroups ? 'groups' : 'natural')}`);
  report.push(...rows);
}

const output = '================ 听写校验测试报告 ================\n\n'
  + report.join('\n')
  + `\n\n---------------- 汇总 ----------------\n通过 ${pass} 项，失败 ${fail} 项`;

/* 作为被引用的模块导出；直接运行则打印并以退出码反映结果 */
if (require.main === module) {
  console.log(output);
  fs.writeFileSync(path.join(__dirname, 'dictation.result.json'),
    JSON.stringify({ pass, fail, total: pass + fail }, null, 2));
  process.exit(fail ? 1 : 0);
}

module.exports = { run: () => ({ pass, fail, total: pass + fail, output }) };

