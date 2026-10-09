/* ============================================================
   统一测试入口 —— npm test
   ------------------------------------------------------------
   按成本从低到高依次跑：
     1. 语法自检       —— 遍历 js 目录下全部 .js，node --check
     2. 数据一致性自检 —— 线索/关系/时间线引用的 id 是否都存在
     3. 听写校验测试   —— _playtest/dictation.test.js（离线，必跑）
     4. 六幕通关实测   —— _playtest/playthrough.js（需本机 Chrome，可选）
   任一层失败都会让 npm test 以非零码退出。
   可用 SKIP_PLAYTHROUGH=1 跳过第 4 层。
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const NODE = process.execPath;

let failures = 0;
const results = [];

function ok(name, extra) { results.push(`  ✓ ${name}${extra ? '  ' + extra : ''}`); }
function bad(name, extra) { results.push(`  ✗ ${name}${extra ? '  ' + extra : ''}`); failures++; }
function section(t) { results.push(`\n── ${t} ──`); }

/* ---------- 1. 语法自检 ---------- */
function walkJs(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkJs(p, acc);
    else if (e.name.endsWith('.js')) acc.push(p);
  }
  return acc;
}
section('语法自检');
const vm = require('vm');
const jsFiles = walkJs(path.join(ROOT, 'js'), []);
let synFail = 0;
for (const f of jsFiles) {
  try {
    // 只编译不执行：等价于 node --check
    new vm.Script(fs.readFileSync(f, 'utf8'), { filename: f });
  } catch (e) {
    bad(path.relative(ROOT, f), String(e.message || e).split('\n')[0]); synFail++;
  }
}
if (!synFail) ok(`${jsFiles.length} 个 JS 文件全部通过`);

/* ---------- 2. 数据一致性自检 ---------- */
section('数据一致性自检');
(function dataCheck() {
  const win = { window: null }; win.window = win; win.LP = {}; win.console = console;
  const ctx = vm.createContext(win);
  ['js/data/evidence.js', 'js/data/documents.js', 'js/data/people.js',
   'js/data/timeline.js', 'js/data/story.js', 'js/data/duoScript.js', 'js/data/locations.js']
    .forEach(f => {
      try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); }
      catch (e) { bad(f + ' 求值失败', e.message); }
    });
  const LP = win.LP;
  const clueIds = new Set(Object.keys((LP.data && LP.data.clues) || {}));
  const docIds = new Set(Object.keys((LP.data && LP.data.documents) || {}));
  const peopleIds = new Set(Object.keys((LP.data && LP.data.people) || {}));
  const locIds = new Set(Object.keys((LP.data && LP.data.locations) || {}));
  const typeIds = new Set(((LP.data && LP.data.reasonTypes) || []).map(t => t.key));

  let miss = 0;
  const ruleKeys = [];
  const lk = (a, b) => [a, b].sort().join('>');
  ((LP.data && LP.data.reasonRules) || []).forEach(r => {
    ruleKeys.push(r.key);
    [r.from, r.to].forEach(id => {
      const known = clueIds.has(id) || docIds.has(id) || peopleIds.has(id) ||
        locIds.has(id) || ['timeline', 'page_032'].includes(id);
      if (!known) { bad(`reasonRules「${r.key}」引用了不存在的节点 ${id}`); miss++; }
    });
    const types = r.types || (r.type ? [r.type] : []);
    if (!types.length) { bad(`reasonRules「${r.key}」没有指定关系类型`); miss++; }
    types.forEach(t => { if (!typeIds.has(t)) { bad(`reasonRules「${r.key}」的类型「${t}」无效`); miss++; } });
    (r.src || []).forEach(sid => {
      if (!docIds.has(sid) && !clueIds.has(sid) && !peopleIds.has(sid) && !locIds.has(sid)) {
        bad(`reasonRules「${r.key}」引用了不存在的依据 ${sid}`); miss++;
      }
    });
  });
  const dupKeys = ruleKeys.filter((k, i) => ruleKeys.indexOf(k) !== i);
  if (dupKeys.length) { bad('reasonRules 存在重复 key', [...new Set(dupKeys)].join(',')); miss++; }
  /* 板上画得出的每条静态关联，都应当能被玩家确认（否则「看得见却连不上」） */
  const rulePairs = new Set(((LP.data && LP.data.reasonRules) || []).map(r => lk(r.from, r.to)));
  const uncovered = ((LP.data && LP.data.evidenceGraph) || []).filter(e => !rulePairs.has(lk(e.from, e.to)));
  if (uncovered.length) {
    bad('以下静态关联无法被玩家确认', uncovered.map(e => e.from + '→' + e.to).join(', ')); miss++;
  }
  ((LP.data && LP.data.reasonRequired && LP.data.reasonRequired.act3) || []).forEach(k => {
    if (!((LP.data.reasonRules) || []).some(r => r.key === k)) {
      bad(`reasonRequired.act3 指定的「${k}」不在 reasonRules 中`); miss++;
    }
  });
  /* 时间线卡片 refId 是否都指向真实文档 */
  ((LP.data && LP.data.timeline) || []).forEach(c => {
    if (c.refId && !docIds.has(c.refId)) { bad(`时间线卡片 ${c.id} 的 refId ${c.refId} 不存在`); miss++; }
  });
  if (!miss) ok('线索 / 关系 / 时间线引用全部有效');
})();

/* ---------- 3. 听写校验测试 ---------- */
section('听写校验测试');
(function dictation() {
  try {
    const r = require('./dictation.test.js').run();
    if (r.fail === 0) ok('正确答案 / 同义答案 / 误答向量全部符合预期', `(通过 ${r.pass})`);
    else { bad('听写校验存在不符合预期的用例', `(失败 ${r.fail})`); process.stdout.write(r.output + '\n'); }
  } catch (e) { bad('听写测试无法运行', e.message); }
})();

/* ---------- 4. 冒烟 + 六幕通关实测（可选） ---------- */
section('浏览器冒烟 / 六幕通关实测（可选）');
const pwPath = process.env.PLAYWRIGHT_PATH ||
  'C:/Users/郭家兴/.workbuddy/binaries/node/workspace/node_modules/playwright-core';
const chromePath = process.env.CHROME_PATH ||
  'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browserReady = fs.existsSync(pwPath) && fs.existsSync(chromePath);

if (process.env.SKIP_PLAYTHROUGH === '1') {
  ok('已按 SKIP_PLAYTHROUGH=1 跳过');
} else if (!browserReady) {
  ok('环境未就绪，已跳过', '(缺 playwright-core 或 Chrome；见 README「可复现测试环境」)');
} else {
  const env = Object.assign({}, process.env, { PLAYWRIGHT_PATH: pwPath, CHROME_PATH: chromePath });
  // 4a. 冒烟：逐标签页渲染 + 隐藏 ARG + 焦点样式
  const sm = spawnSync(NODE, [path.join(__dirname, 'smoke.js')], { encoding: 'utf8', env });
  const smLine = (sm.stdout || '').split('\n').filter(l => /运行期错误|隐藏线索/.test(l)).join(' | ');
  if (sm.status === 0) ok('冒烟：全标签页渲染 / 隐藏 ARG / 焦点样式', smLine);
  else { bad('冒烟测试未通过', smLine); process.stdout.write((sm.stdout || '').slice(-1500)); }
  // 4b. 六幕通关
  const r = spawnSync(NODE, [path.join(__dirname, 'playthrough.js')], { encoding: 'utf8', env });
  const line = (r.stdout || '').split('\n').filter(l => /全部断言通过|测试存在失败项|断言/.test(l)).slice(-2).join(' ');
  if (r.status === 0) ok('双开通关：六幕全通、结局达成', line);
  else { bad('双开通关未通过', line); process.stdout.write((r.stdout || '').slice(-2000)); }
}

/* ---------- 汇总 ---------- */
console.log('\n================ _playtest / harness ================');
console.log(results.join('\n'));
console.log('\n-----------------------------------------------------');
console.log(failures ? `失败 ${failures} 项` : '全部测试通过 ✓');
console.log('=====================================================\n');
process.exit(failures ? 1 : 0);
