/* ============================================================
   风格 lint —— STYLE_CONTRACT.md 的机器化实现
   ------------------------------------------------------------
   两类规则：
     A. 硬性规则（必须立即通过）
        · tokens.css 与 tokens.json 一致性
        · 资源引用版本参数在引号内
        · 扫描线 / 噪点 / 闪光 透明度不超过上限
        · 禁止纯黑实心底与高饱和霓虹色
     B. 棘轮规则（只能变好，不能变差）
        · 颜色字面量数量、动画时长字面量数量
          首次运行会建立基线 _playtest/style-baseline.json；
          之后任何一次「数量增加」都会失败。
          P1 收编令牌后，用 --update-baseline 下调基线。

   运行：npm run test:style     建立/下调基线：node _playtest/style-lint.js --update-baseline
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASELINE = path.join(__dirname, 'style-baseline.json');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

const CSS_FILES = fs.readdirSync(path.join(ROOT, 'css')).filter(f => f.endsWith('.css'));
const cssAll = () => CSS_FILES.map(f => ['css/' + f, read('css/' + f)]);

/* camelCase → kebab-case；并给「字母+数字」边界补连字符：red08 → red-08 */
const kebab = s => s.replace(/[A-Z]/g, c => '-' + c.toLowerCase()).replace(/([a-z])(\d)/g, '$1-$2');

function run(opts) {
  opts = opts || {};
  let pass = 0, fail = 0;
  const out = [];
  const ok = (n) => { pass++; out.push('  ✓ ' + n); };
  const bad = (n, d) => { fail++; out.push('  ✗ ' + n + (d ? '  → ' + d : '')); };
  const info = (n) => { out.push('  · ' + n); };

  const tokens = JSON.parse(read('tokens.json'));
  const limits = tokens.limits;

  /* ---------- A1. tokens.css ↔ tokens.json 一致性 ---------- */
  try {
    const css = read('css/tokens.css');
    const getVar = (name) => {
      const m = css.match(new RegExp('--' + name.replace(/[-]/g, '\\-') + '\\s*:\\s*([^;]+);'));
      return m ? m[1].trim() : null;
    };
    const problems = [];

    /* 颜色：color.paperDeep → --c-paper-deep */
    for (const [k, v] of Object.entries(tokens.color)) {
      const name = 'c-' + kebab(k);
      const got = getVar(name);
      if (got === null) problems.push(`${name} 缺失`);
      else if (got.toLowerCase() !== String(v).toLowerCase()) problems.push(`${name}: ${got} ≠ ${v}`);
    }
    /* 幕数阶梯：tintLadder.0 → --c-tint-0 */
    for (const [k, v] of Object.entries(tokens.tintLadder)) {
      const name = 'c-tint-' + k;
      const got = getVar(name);
      if (got === null) problems.push(`${name} 缺失`);
      else if (got.toLowerCase() !== String(v).toLowerCase()) problems.push(`${name}: ${got} ≠ ${v}`);
    }
    /* 透明度阶梯：alpha.red08 → --a-red-08 */
    for (const [k, v] of Object.entries(tokens.alpha)) {
      const name = 'a-' + kebab(k);
      const got = getVar(name);
      if (got === null) problems.push(`${name} 缺失`);
      else if (got.replace(/\s/g, '').toLowerCase() !== String(v).replace(/\s/g, '').toLowerCase()) {
        problems.push(`${name}: ${got} ≠ ${v}`);
      }
    }
    /* 时长：duration.micro → --t-micro: 180ms */
    for (const [k, v] of Object.entries(tokens.duration)) {
      const name = 't-' + kebab(k);
      const got = getVar(name);
      if (got === null) problems.push(`${name} 缺失`);
      else if (got !== v + 'ms') problems.push(`${name}: ${got} ≠ ${v}ms`);
    }
    /* 缓动 */
    for (const [k, v] of Object.entries(tokens.ease)) {
      const name = 'ease-' + kebab(k);
      const got = getVar(name);
      if (got === null) problems.push(`${name} 缺失`);
      else if (got.replace(/\s/g, '') !== String(v).replace(/\s/g, '')) problems.push(`${name}: ${got} ≠ ${v}`);
    }
    /* 阴影 */
    const sh = getVar('shadow');
    if (sh === null) problems.push('--shadow 缺失');
    else if (sh.replace(/\s/g, '') !== tokens.shadow.replace(/\s/g, '')) problems.push('--shadow 不一致');

    if (!problems.length) ok('tokens.css 与 tokens.json 完全一致');
    else bad('tokens.css 与 tokens.json 不一致', problems.slice(0, 6).join('; ') + (problems.length > 6 ? ` 等 ${problems.length} 项` : ''));
  } catch (e) { bad('tokens 一致性校验失败', e.message); }

  /* ---------- A2. 资源引用版本参数必须在引号内 ---------- */
  try {
    const html = read('index.html');
    const outside = (html.match(/"?\?v=/g) || []).filter(x => x.startsWith('"')).length;
    const refs = html.match(/(?:href|src)="(?:css|js)\/[^"]+"/g) || [];
    const noVer = refs.filter(r => !r.includes('?v='));
    if (outside === 0 && noVer.length === 0) ok(`资源引用合规（${refs.length} 处，版本参数均在引号内）`);
    else bad('资源引用不合规', `引号外 ${outside} 处；缺版本 ${noVer.length} 处`);
  } catch (e) { bad('资源引用校验失败', e.message); }

  /* ---------- A3. 透明度上限 ---------- */
  try {
    const g = read('css/global.css');
    const grab = (sel) => {
      const m = g.match(new RegExp(sel.replace(/[#.]/g, m => '\\' + m) + '\\{[^}]*?opacity\\s*:\\s*([0-9.]+)'));
      return m ? parseFloat(m[1]) : null;
    };
    const scan = grab('#fx-scanlines');
    const noise = grab('#fx-noise');
    const flashM = g.match(/@keyframes\s+flashOnce\s*\{[^}]*?opacity\s*:\s*\.?([0-9.]+)[^}]*?100%/s);
    const flash = flashM ? parseFloat('0.' + flashM[1].replace(/^0?\./, '')) : null;
    const peak = (() => {
      const m = g.match(/@keyframes\s+flashOnce\s*\{([\s\S]*?)\}\s*\n/);
      if (!m) return null;
      const vals = (m[1].match(/opacity\s*:\s*([0-9.]+)/g) || [])
        .map(s => parseFloat(s.replace(/opacity\s*:\s*/, '')));
      return vals.length ? Math.max(...vals) : null;
    })();

    const errs = [];
    if (scan === null) errs.push('#fx-scanlines 未找到 opacity');
    else if (scan > limits.scanlines) errs.push(`扫描线 ${scan} > ${limits.scanlines}`);
    if (noise === null) errs.push('#fx-noise 未找到 opacity');
    else if (noise > limits.noise) errs.push(`噪点 ${noise} > ${limits.noise}`);
    if (peak === null) errs.push('flashOnce 峰値未解析到');
    else if (peak > limits.flashPeak) errs.push(`闪光峰值 ${peak} > ${limits.flashPeak}`);

    if (!errs.length) ok(`覆盖层透明度达标（扫描线 ${scan} / 噪点 ${noise} / 闪光峰值 ${peak}）`);
    else bad('覆盖层透明度超上限', errs.join('; '));
  } catch (e) { bad('透明度校验失败', e.message); }

  /* ---------- A4. 禁止色 ---------- */
  try {
    const errs = [];
    for (const [f, t] of cssAll().concat([['index.html', read('index.html')]])) {
      /* 纯黑实心底（低透明度描线/渐变中的 #000 允许） */
      const m = t.match(/(?:background|background-color)\s*:\s*#0{3,6}\b/gi);
      if (m) errs.push(`${f}: 纯黑实心底 ${m.length} 处`);
      /* 高饱和霓虹色：max 通道 ≥ 235 且 min 通道 ≤ 40 */
      const hexes = t.match(/#[0-9a-fA-F]{6}\b/g) || [];
      hexes.forEach(h => {
        const r = parseInt(h.slice(1, 3), 16), gg = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
        const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
        if (mx >= 235 && mn <= 40) errs.push(`${f}: 高饱和色 ${h}`);
      });
    }
    if (!errs.length) ok('无纯黑实心底、无高饱和霓虹色');
    else bad('存在禁止色', [...new Set(errs)].slice(0, 6).join('; '));
  } catch (e) { bad('禁止色校验失败', e.message); }

  /* ---------- B. 棘轮规则 ---------- */
  const current = (() => {
    let colorHex = 0, colorRgba = 0, durLiterals = 0, varDur = 0;
    const distinct = new Set();
    /* 排除令牌定义层本身：css/tokens.css 是字面量的合法居所，不计入棘轮 */
    for (const [f, t] of cssAll()) {
      if (f === 'css/tokens.css') continue;
      const hex = t.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
      colorHex += hex.length;
      hex.forEach(h => distinct.add(h.toLowerCase()));
      colorRgba += (t.match(/rgba?\s*\(/g) || []).length;
      durLiterals += (t.match(/[0-9.]+m?s\b/g) || []).length;
      varDur += (t.match(/var\(--t-/g) || []).length;
    }
    return {
      colorHexLiterals: colorHex,
      colorRgbaLiterals: colorRgba,
      colorLiteralsTotal: colorHex + colorRgba,
      durationLiterals: durLiterals,
      varDurationRefs: varDur,
      distinctHex: distinct.size
    };
  })();

  if (opts.updateBaseline || !fs.existsSync(BASELINE)) {
    fs.writeFileSync(BASELINE, JSON.stringify({
      generatedAt: new Date().toISOString().slice(0, 10),
      note: '棘轮基线：这些数量只能下降，不能上升。P1 收编令牌后用 --update-baseline 下调。',
      counts: current
    }, null, 2) + '\n', 'utf8');
    ok(opts.updateBaseline ? '棘轮基线已更新' : '棘轮基线已建立（首次运行）');
    info(`颜色字面量 ${current.colorLiteralsTotal}（hex ${current.colorHexLiterals} + rgba ${current.colorRgbaLiterals}）｜不同 hex ${current.distinctHex}｜时长字面量 ${current.durationLiterals}｜var(--t-*) ${current.varDurationRefs}`);
  } else {
    const base = JSON.parse(read('_playtest/style-baseline.json')).counts;
    const rows = [
      ['颜色字面量', 'colorLiteralsTotal'],
      ['动画时长字面量', 'durationLiterals']
    ];
    const worse = [];
    rows.forEach(([label, key]) => {
      if (current[key] > base[key]) worse.push(`${label} ${base[key]} → ${current[key]}`);
    });
    if (!worse.length) {
      ok('棘轮规则通过（无新增颜色 / 时长字面量）');
      info(`颜色字面量 ${current.colorLiteralsTotal}（基线 ${base.colorLiteralsTotal}）｜时长字面量 ${current.durationLiterals}（基线 ${base.durationLiterals}）｜var(--t-*) ${current.varDurationRefs}`);
    } else {
      bad('棘轮规则失败：新增了字面量', worse.join('; '));
    }
  }

  return { pass, fail, output: out.join('\n') };
}

module.exports = { run };

if (require.main === module) {
  const r = run({ updateBaseline: process.argv.includes('--update-baseline') });
  console.log(r.output);
  console.log(`\n风格 lint：通过 ${r.pass}，失败 ${r.fail}`);
  process.exit(r.fail ? 1 : 0);
}
