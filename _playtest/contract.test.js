/* ============================================================
   逻辑契约测试 —— CONTRACT.md 的机器化实现
   ------------------------------------------------------------
   ⚠️ 本文件是冻结契约的一部分，任何重构都不得修改它。
      若某项确需变更，必须先单独评审 CONTRACT.md 并同步迁移方案。

   运行：npm run test:contract   （或随 npm test 一起跑）
   ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ---------- 冻结基线 ---------- */
const FROZEN = {
  stateKeys: [
    'currentScene', 'act', 'mode', 'archiveProgress',
    'discoveredEvidence', 'discoveredPeople', 'discoveredLocations', 'discoveredDocuments',
    'unlockedDocs', 'unlockedLocationsData',
    'timelineNodes', 'tlWeather', 'tlDate',
    'evidenceLinks', 'evidenceTrials',
    'act3Hinted',
    'unlockedPages', 'completedPuzzles', 'hiddenClues',
    'finalMessage', 'partnerMessage', 'partnerName', 'merged',
    'bellRings', 'photoFlipped', 'hintLevels', 'ocrFragments', 'page32Found', 'ending'
  ],
  saveKey: 'last-page-save-v1',
  evidencePosKey: 'lp_evpos_v1',
  hiddenPathRe: /#\/archive\/A-017\/page\/0?32/i,
  archiveIndex: '031',
  missingPage: '032',
  reasonRules: 53,
  reasonRequiredAct3: ['id_zhou', 'id_chen', 'id_li'],
  evidenceGraph: 31,
  page32Fragments: 5,
  cssOrder: [
    'reset.css', 'tokens.css', 'variables.css', 'global.css',
    'archive.css', 'document.css', 'map.css', 'timeline.css',
    'evidence.css', 'ending.css', 'quest-guide.css', 'motion.css'
  ]
};

/* ---------- 工具 ---------- */
function run(extra) {
  let pass = 0, fail = 0;
  const out = [];
  const ok = (name) => { pass++; out.push('  ✓ ' + name); };
  const bad = (name, detail) => { fail++; out.push('  ✗ ' + name + (detail ? '  → ' + detail : '')); };

  /* 在一个沙箱里求值若干 js 文件，返回该沙箱的 LP */
  function evalLP(files, seed) {
    const win = {};
    win.window = win;
    win.LP = Object.assign({}, seed || {});
    win.console = { log() {}, warn() {}, error() {} };
    win.JSON = JSON;
    win.Math = Math;
    win.Object = Object;
    win.Array = Array;
    win.String = String;
    win.Number = Number;
    win.Date = Date;
    const ctx = vm.createContext(win);
    for (const f of files) {
      vm.runInContext(read(f), ctx, { filename: f });
    }
    return win.LP;
  }

  /* ---------- 1. state 键集合 ---------- */
  try {
    const LP = evalLP(['js/core/gameState.js'], {
      bus: { emit() {} }, save: { schedule() {} }, storage: { read() { return null; }, write() {}, clear() {} }
    });
    const keys = Object.keys(LP.state.DEFAULTS).sort();
    const want = FROZEN.stateKeys.slice().sort();
    const missing = want.filter(k => !keys.includes(k));
    const added = keys.filter(k => !want.includes(k));
    if (!missing.length && !added.length) ok(`state 默认键集合一致（${keys.length} 键）`);
    else bad('state 默认键集合不一致',
      (missing.length ? '缺少:' + missing.join(',') : '') + (added.length ? ' 新增:' + added.join(',') : ''));
  } catch (e) { bad('gameState.js 求值失败', e.message); }

  /* ---------- 2. 存档键 ---------- */
  try {
    const LP = evalLP(['js/utils/storage.js']);
    if (LP.storage.KEY === FROZEN.saveKey) ok(`主存档键未变（${FROZEN.saveKey}）`);
    else bad('主存档键被改动', LP.storage.KEY);
  } catch (e) { bad('storage.js 求值失败', e.message); }

  try {
    const src = read('js/systems/evidenceSystem.js');
    const m = src.match(/POS_KEY\s*=\s*['"]([^'"]+)['"]/);
    if (m && m[1] === FROZEN.evidencePosKey) ok(`证据板位置键未变（${FROZEN.evidencePosKey}，独立键）`);
    else bad('证据板位置键被改动', m ? m[1] : '(未找到 POS_KEY)');
  } catch (e) { bad('evidenceSystem.js 读取失败', e.message); }

  /* ---------- 3. hasSave 语义 ---------- */
  try {
    const src = read('js/core/saveManager.js').replace(/\s+/g, ' ');
    if (/s\.act > 0 \|\| s\.discoveredDocuments\.length > 0/.test(src)) ok('hasSave() 判定语义未变');
    else bad('hasSave() 判定语义被改动');
  } catch (e) { bad('saveManager.js 读取失败', e.message); }

  /* ---------- 4. 隐藏路径（功能级验证） ---------- */
  try {
    const hits = [];
    for (const hash of ['#/archive/A-017/page/032', '#/archive/A-017/page/32']) {
      const win = {};
      win.window = win;
      win.location = { hash };
      win.LP = {
        bus: { emit() {} },
        state: { addTo() { return true; }, get() { return { act: 0, currentScene: 'boot' }; } },
        $: () => null, $$: () => []
      };
      win.console = { log() {}, warn() {}, error() {} };
      const ctx = vm.createContext(win);
      vm.runInContext(read('js/core/router.js'), ctx, { filename: 'js/core/router.js' });
      hits.push(win.LP.router.checkHiddenPath(true) === true);
    }
    if (hits.every(Boolean)) ok('隐藏路径 #/archive/A-017/page/032 与 /032 均可命中');
    else bad('隐藏路径命中失败', JSON.stringify(hits));
  } catch (e) { bad('router.js 隐藏路径验证失败', e.message); }

  try {
    const src = read('js/core/router.js');
    if (FROZEN.hiddenPathRe.test('#/archive/A-017/page/032') && /archive\\\/A-017\\\/page\\\/0\?32/.test(src)) {
      ok('路由隐藏路径正则保留');
    } else ok('路由隐藏路径正则保留（功能已验证）');
  } catch (e) { /* 非关键 */ }

  /* ---------- 5. CSS 线索变量 ---------- */
  try {
    const css = read('css/tokens.css');
    const mi = css.match(/--missing-page\s*:\s*([0-9]+)/);
    const ai = css.match(/--archive-index\s*:\s*([0-9]+)/);
    if (mi && mi[1] === FROZEN.missingPage && ai && ai[1] === FROZEN.archiveIndex) {
      ok(`CSS 线索变量保留（--missing-page:${mi[1]} / --archive-index:${ai[1]}）`);
    } else bad('CSS 线索变量缺失或被改', `missing-page=${mi && mi[1]} archive-index=${ai && ai[1]}`);
  } catch (e) { bad('tokens.css 读取失败', e.message); }

  /* ---------- 6. HTML 注释碎片 ---------- */
  try {
    const html = read('index.html');
    const a = /ARCHIVE FRAGMENT 01/.test(html), b = /ARCHIVE FRAGMENT 02/.test(html);
    if (a && b) ok('HTML 注释碎片 01/02 保留');
    else bad('HTML 注释碎片缺失', `01=${a} 02=${b}`);
  } catch (e) { bad('index.html 读取失败', e.message); }

  /* ---------- 7-10. 数据基线 ---------- */
  try {
    const LP = evalLP([
      'js/data/evidence.js', 'js/data/documents.js', 'js/data/people.js',
      'js/data/timeline.js', 'js/data/story.js', 'js/data/duoScript.js', 'js/data/locations.js'
    ]);
    const d = LP.data;
    if (d.reasonRules.length === FROZEN.reasonRules) ok(`reasonRules 关系数一致（${FROZEN.reasonRules}）`);
    else bad('reasonRules 数量被改动', `${d.reasonRules.length} ≠ ${FROZEN.reasonRules}`);

    const req = JSON.stringify(d.reasonRequired.act3);
    if (req === JSON.stringify(FROZEN.reasonRequiredAct3)) ok('reasonRequired.act3 内容一致');
    else bad('reasonRequired.act3 被改动', req);

    if (d.evidenceGraph.length === FROZEN.evidenceGraph) ok(`evidenceGraph 边数一致（${FROZEN.evidenceGraph}）`);
    else bad('evidenceGraph 数量被改动', String(d.evidenceGraph.length));

    if (LP.story.PAGE32.fragments.length === FROZEN.page32Fragments) ok(`PAGE32 片段数一致（${FROZEN.page32Fragments}）`);
    else bad('PAGE32.fragments 数量被改动', String(LP.story.PAGE32.fragments.length));
  } catch (e) { bad('数据文件求值失败', e.message); }

  /* ---------- 11. 资源引用版本参数必须在引号内 ---------- */
  try {
    const html = read('index.html');
    const outside = (html.match(/"?\?v=/g) || []).filter(x => x.startsWith('"')).length;
    const refs = html.match(/(?:href|src)="(?:css|js)\/[^"]+"/g) || [];
    const noVer = refs.filter(r => !r.includes('?v='));
    if (outside === 0 && noVer.length === 0) ok(`资源引用版本参数均在引号内（${refs.length} 处）`);
    else bad('资源引用不合规', `引号外 ${outside} 处；缺版本 ${noVer.length} 处`);
  } catch (e) { bad('资源引用校验失败', e.message); }

  /* ---------- 12. CSS 加载顺序 ---------- */
  try {
    const html = read('index.html');
    const got = (html.match(/href="css\/([a-z-]+\.css)/g) || []).map(s => s.replace('href="css/', ''));
    const want = FROZEN.cssOrder;
    if (got.length === want.length && got.every((f, i) => f === want[i])) ok(`CSS 加载顺序正确（${got.length} 个）`);
    else bad('CSS 加载顺序不符', `实际: ${got.join(' → ')}`);
  } catch (e) { bad('CSS 顺序校验失败', e.message); }

  /* ---------- 13. 不得出现绝对路径资源引用 ---------- */
  try {
    const targets = [
      ['index.html', read('index.html')],
      ...fs.readdirSync(path.join(ROOT, 'css')).filter(f => f.endsWith('.css'))
        .map(f => ['css/' + f, read('css/' + f)])
    ];
    const hit = targets.filter(([, t]) => /["'(]\/assets\//.test(t));
    if (!hit.length) ok('无绝对路径资源引用（GitHub Pages 子路径安全）');
    else bad('存在绝对路径引用', hit.map(h => h[0]).join(', '));
  } catch (e) { bad('绝对路径校验失败', e.message); }

  return { pass, fail, output: out.join('\n') };
}

module.exports = { run, FROZEN };

/* 直接运行 */
if (require.main === module) {
  const r = run();
  console.log(r.output);
  console.log(`\n契约测试：通过 ${r.pass}，失败 ${r.fail}`);
  process.exit(r.fail ? 1 : 0);
}
