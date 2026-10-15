/* ============================================================
   图标行内门禁 —— 内联 SVG 必须与相邻文字在同一行
   ------------------------------------------------------------
   守三件事：
     1. 全站扫描：每个可见的内联 SVG，若其宿主内有文字，则 SVG 的垂直中心
        与文字**首个行盒**的垂直中心偏差 ≤ 4px。偏差大 = 图标另起一行。
     2. 非 flex 宿主里的 SVG 不得是 display:block —— 这是根因形态。
        reset.css 有一条 img,canvas,svg,video{display:block}，凡是没有把
        父容器设成 flex、也没给 SVG 补 display:inline-block 的地方都会中招。
     3. 抬头「通话」按钮：文字恒为 1 行，且按钮不被右栏压扁、不出界。
        右栏是 grid 的 1fr 列，双人模式下要装「编号牌 + 按钮 + 两个数据块」，
        1440 及以下本来装不下 —— 靠 `.wb-status` 的 flex-wrap 让数据块整体
        换行，而不是让按钮内部折行。

   运行：npm run test:icon
   ============================================================ */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright-core');

const URL = 'http://127.0.0.1:8123/index.html';
const DY_TOL = 4;

/* 在页面里扫描所有「带文字的内联 SVG」，返回每处的几何关系。 */
const SCAN = `(() => {
  const firstTextNode = el => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) if (n.nodeValue.trim()) return n;
    return null;
  };
  const out = [];
  document.querySelectorAll('svg').forEach(svg => {
    const r = svg.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;                 // 不可见
    const host = svg.parentElement;
    if (!host) return;
    const tn = firstTextNode(host);
    if (!tn) return;                                          // 图标独立，跳过
    const range = document.createRange();
    range.selectNodeContents(tn);
    const rects = [...range.getClientRects()];
    if (!rects.length) return;
    const svgMid = r.top + r.height / 2;
    const txtMid = rects[0].top + rects[0].height / 2;
    out.push({
      host: host.id ? '#' + host.id : (host.className || host.tagName),
      dy: +Math.abs(svgMid - txtMid).toFixed(1),
      hostDisplay: getComputedStyle(host).display,
      svgDisplay: getComputedStyle(svg).display,
    });
  });
  return out;
})()`;

/* 抬头「通话」按钮：文字行数 / 高度 / 是否出界 */
const BTN = `(() => {
  const btn = document.querySelector('#btn-duo');
  if (!btn || btn.hidden) return null;
  const br = btn.getBoundingClientRect();
  const tn = [...btn.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim());
  const rg = document.createRange(); rg.selectNodeContents(tn);
  const tops = [...new Set([...rg.getClientRects()].map(r => Math.round(r.top)))];
  return { lines: tops.length, w: Math.round(br.width), h: Math.round(br.height),
           left: +br.left.toFixed(1), right: +br.right.toFixed(1), vw: innerWidth };
})()`;

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const fails = [];
  const note = s => console.log('  · ' + s);
  const check = (cond, label, detail) => {
    console.log(`  ${cond ? '✓' : '✗'} ${label}${detail ? '  → ' + detail : ''}`);
    if (!cond) fails.push(label + (detail ? ' → ' + detail : ''));
  };

  /* 扫描并断言某个场景下没有「图标另起一行」 */
  async function scanScene(page, label) {
    const rows = await page.evaluate(SCAN);
    const bad = rows.filter(r => r.dy > DY_TOL);
    const blocky = rows.filter(r => !/flex/.test(r.hostDisplay) && r.svgDisplay === 'block');
    check(rows.length > 0, `${label}：扫到带文字的内联图标`, `${rows.length} 处`);
    check(bad.length === 0, `${label}：图标与文字同行`,
      bad.length ? bad.map(r => `${r.host} Δ${r.dy}px`).join('; ') : `最大偏 ${Math.max(...rows.map(r => r.dy))}px`);
    check(blocky.length === 0, `${label}：非 flex 宿主内的图标未被块级化（reset 陷阱）`,
      blocky.length ? blocky.map(r => r.host).join('; ') : '全部行内');
    return rows;
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { } });
  await page.reload();
  await page.waitForTimeout(700);

  /* ---------- 1. 启动页 ---------- */
  await scanScene(page, '启动页');

  /* ---------- 2. 工作台（单人：编号牌与通话按钮隐藏） ---------- */
  await page.evaluate(() => {
    document.querySelectorAll('.screen').forEach(e => e.classList.remove('active'));
    document.querySelector('#screen-archive')?.classList.add('active');
    LP.archive.refreshAll();
  });
  await page.waitForTimeout(400);
  await scanScene(page, '工作台·单人');

  /* ---------- 3. 工作台（双人：编号牌 + 通话按钮上场） ---------- */
  await page.evaluate(() => { LP.state.set({ mode: 'A' }); LP.archive.refreshAll(); });
  await page.waitForTimeout(400);
  const duoRows = await scanScene(page, '工作台·双人');
  const duoIcon = duoRows.find(r => r.host === '#btn-duo');
  check(!!duoIcon, '抬头「通话」按钮在扫描范围内');

  /* ---------- 4. 「通话」按钮：恒为一行、不被压扁、不出界 ---------- */
  for (const w of [1680, 1440, 1366, 1280, 1120, 1024, 860, 640, 420]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(260);
    const b = await page.evaluate(BTN);
    if (!b) { check(false, `通话按钮可见 @${w}`); continue; }
    check(b.lines === 1, `通话按钮文字 1 行 @${w}`,
      `${b.w}×${b.h}px / ${b.lines} 行`);
    check(b.h <= 44, `通话按钮未被压扁 @${w}`, `高 ${b.h}px（阈值 44）`);
    check(b.left >= -0.5 && b.right <= b.vw + 0.5, `通话按钮不出界 @${w}`,
      `左 ${b.left} / 右 ${b.right} / 宽 ${b.vw}`);
  }

  /* ---------- 5. 实地现场 ---------- */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    document.querySelectorAll('.screen').forEach(e => e.classList.remove('active'));
    document.querySelector('#screen-scene')?.classList.add('active');
  });
  await page.waitForTimeout(400);
  const sceneRows = await page.evaluate(SCAN);
  if (sceneRows.length) {
    const bad = sceneRows.filter(r => r.dy > DY_TOL);
    check(bad.length === 0, '实地现场：图标与文字同行',
      bad.length ? bad.map(r => `${r.host} Δ${r.dy}px`).join('; ') : `${sceneRows.length} 处`);
  } else {
    note('实地现场无带文字的内联图标，跳过');
  }

  await browser.close();
  console.log(`\n图标行内门禁：失败 ${fails.length}`);
  if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
})().catch(e => { console.error('ERR', e.message); process.exit(2); });
