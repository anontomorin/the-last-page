/* ============================================================
   抬头（HUD）门禁 —— 把 P9 这次改版钉住
   ------------------------------------------------------------
   守四件事：
     1. 幕标题真居中：与页面中线的偏差 ≤ 1px，且在 1024/1280/1440/1680 下都成立。
        改版前用 flex:1 + text-align:center，只在「剩余空间」里居中，
        偏移量随左右内容宽度浮动（实测 32.9px / 46.6px）。
     2. 图形与数字一致：刻度亮起数 == 主线数字；进度条 scaleX == 完整度百分比。
        图形只是把数字换个形状再讲一遍，不允许与数字不一致。
     3. 抬头内所有可见文字 ≥ 11px（STYLE_CONTRACT 规则 S5）。
     4. 窄屏两行定式：章节名在上、编号牌与状态在下，不横向溢出，
        且在唯一滚动容器里滚动后抬头不动（本来就常驻，不需要 sticky）。

   运行：npm run test:hud
   ============================================================ */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright-core');

const URL = 'http://127.0.0.1:8123/index.html';
const MIN_FONT = 11;
const CENTER_TOL = 1;

const MW = [1024, 1280, 1440, 1680];

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const fails = [];
  const note = s => console.log('  · ' + s);
  const check = (cond, label, detail) => {
    console.log(`  ${cond ? '✓' : '✗'} ${label}${detail ? '  → ' + detail : ''}`);
    if (!cond) fails.push(label + (detail ? ' → ' + detail : ''));
  };

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { } });
  await page.reload();
  await page.waitForTimeout(400);

  /* 让抬头拿到一组真实且非退化的状态：用数据层里真实存在的 id，
     避免给其它监听 state 的子系统喂不存在的条目。 */
  const seeded = await page.evaluate(() => {
    const docs = Object.keys(LP.data.documents).slice(0, 5);
    const clues = Object.keys(LP.data.clues).slice(0, 3);
    LP.state.set({ act: 3, discoveredDocuments: docs, discoveredEvidence: clues });
    LP.archive.refreshStatus();
    return { act: LP.state.get().act, docs: docs.length, clues: clues.length };
  });
  await page.waitForTimeout(1200);          // 等 countUp 数字动画收敛
  note(`种子状态：act=${seeded.act}，已读资料 ${seeded.docs}，线索 ${seeded.clues}`);

  /* ---------- 1. 数值与图形一致 ---------- */
  const nums = await page.evaluate(() => {
    const actShown = parseInt((document.querySelector('#wb-act-progress') || {}).textContent, 10);
    const pctShown = parseFloat((document.querySelector('#wb-percent') || {}).textContent);
    const ticks = [...document.querySelectorAll('#wb-ticks i')];
    const bar = document.querySelector('#wb-bar');
    const m = /scaleX\(([-0-9.]+)\)/.exec(bar ? getComputedStyle(bar).transform : '');
    const matrix = bar ? getComputedStyle(bar).transform : 'none';
    return {
      actShown, pctShown,
      tickTotal: ticks.length,
      tickOn: ticks.filter(t => t.classList.contains('on')).length,
      barTransform: matrix,
      barRegex: m ? parseFloat(m[1]) : null
    };
  });
  const barScale = (() => {
    if (!nums.barTransform || nums.barTransform === 'none') return 0;
    const p = nums.barTransform.match(/matrix\(([-0-9.]+)/);
    return p ? parseFloat(p[1]) : 0;
  })();
  check(nums.tickTotal === 6, '主线刻度共 6 段', `实际 ${nums.tickTotal}`);
  check(nums.tickOn === nums.actShown, '刻度亮起数 == 主线数字',
    `亮 ${nums.tickOn} / 显示 ${nums.actShown}`);
  check(Math.abs(barScale - nums.pctShown / 100) <= 0.02, '进度条长度 == 完整度百分比',
    `条 ${(barScale * 100).toFixed(1)}% / 数字 ${nums.pctShown}%`);

  /* ---------- 2. 抬头文字字号下限（S5） ---------- */
  const fontOffenders = await page.evaluate((min) => {
    const top = document.querySelector('.wb-top');
    const bad = [];
    for (const el of top.querySelectorAll('*')) {
      const txt = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!txt) continue;
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') continue;
      const fs = parseFloat(s.fontSize);
      if (fs < min) bad.push(`${el.className || el.tagName} ${fs}px`);
    }
    return bad;
  }, MIN_FONT);
  check(fontOffenders.length === 0, '抬头内可见文字均 ≥ 11px',
    fontOffenders.length ? fontOffenders.join('; ') : `下限 ${MIN_FONT}px`);

  /* ---------- 3. 抬头双线与常驻 ---------- */
  const chrome = await page.evaluate(() => {
    const top = document.querySelector('.wb-top');
    const after = getComputedStyle(top, '::after');
    const s = getComputedStyle(top);
    return { afterH: after.height, afterBg: after.backgroundColor, border: s.borderBottomWidth, z: s.zIndex };
  });
  check(chrome.afterH === '1px' && chrome.afterBg !== 'rgba(0, 0, 0, 0)',
    '台账双线存在（主线下 1px 发丝线）', `${chrome.afterH} / ${chrome.afterBg}`);

  /* ---------- 4. 各宽度下的真居中 + 不溢出 ---------- */
  for (const w of MW) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(260);
    const r = await page.evaluate(() => {
      const top = document.querySelector('.wb-top');
      const act = document.querySelector('#wb-act-title');
      const brand = document.querySelector('.wb-brand');
      const status = document.querySelector('.wb-status');
      const ab = act.getBoundingClientRect(), bb = brand.getBoundingClientRect(), sb = status.getBoundingClientRect();
      return {
        delta: +(ab.x + ab.width / 2 - innerWidth / 2).toFixed(2),
        overflow: top.scrollWidth - top.clientWidth,
        sameRow: Math.abs((bb.y + bb.height / 2) - (sb.y + sb.height / 2)) < 3,
        inside: bb.x >= 0 && sb.right <= innerWidth + 0.5,
        h: +top.getBoundingClientRect().height.toFixed(1)
      };
    });
    check(Math.abs(r.delta) <= CENTER_TOL, `标题居中 @${w}`, `偏移 ${r.delta}px`);
    check(r.overflow <= 1, `抬头无横向溢出 @${w}`, `溢出 ${r.overflow}px`);
    if (w >= 1280) check(r.sameRow && r.inside, `三段同一行且不出界 @${w}`, `对齐 ${r.sameRow} / 界内 ${r.inside}`);
    if (w === 1440) note(`抬头高度 ${r.h}px`);
  }

  /* ---------- 5. 窄屏：两行定式 + 常驻 ---------- */
  const page2 = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page2.goto(URL);
  await page2.evaluate(() => { try { localStorage.clear(); } catch (e) { } });
  await page2.reload();
  await page2.waitForTimeout(400);
  await page2.evaluate(() => {
    const n = document.querySelector('#narrator'); if (n) n.hidden = true;
    LP.state.set({ act: 3 });
    LP.archive.refreshStatus();
  });
  await page2.waitForTimeout(1100);
  const m = await page2.evaluate(() => {
    const top = document.querySelector('.wb-top');
    const act = document.querySelector('#wb-act-title').getBoundingClientRect();
    const brand = document.querySelector('.wb-brand').getBoundingClientRect();
    const status = document.querySelector('.wb-status').getBoundingClientRect();
    return {
      h: +top.getBoundingClientRect().height.toFixed(1),
      overflow: top.scrollWidth - top.clientWidth,
      delta: +(act.x + act.width / 2 - innerWidth / 2).toFixed(2),
      stacked: act.bottom <= brand.top + 0.5 && act.bottom <= status.top + 0.5,
      brandLeft: brand.x, statusRight: status.right, vw: innerWidth,
      pctVisible: !!document.querySelector('#wb-percent').offsetParent,
      brandTextHidden: getComputedStyle(document.querySelector('.wb-brand-text')).display === 'none',
      tabFont: parseFloat(getComputedStyle(document.querySelector('.wb-tab')).fontSize)
    };
  });
  check(m.h <= 92, '窄屏抬头 ≤ 92px（两行）', `${m.h}px`);
  check(m.stacked, '窄屏为定式两行：章节名在上，编号牌与状态在下');
  check(Math.abs(m.delta) <= CENTER_TOL, '窄屏标题仍居中', `偏移 ${m.delta}px`);
  check(m.overflow <= 1, '窄屏抬头无横向溢出', `溢出 ${m.overflow}px`);
  check(m.brandLeft >= 0 && m.statusRight <= m.vw + 0.5, '窄屏两端不出界',
    `左 ${m.brandLeft} / 右 ${m.statusRight} / 宽 ${m.vw}`);
  check(m.pctVisible, '窄屏完整度数字仍可见（不靠图形表达状态，S9）');
  check(m.brandTextHidden, '窄屏隐去英文全称，只留方印与编号牌');

  const pinned = await page2.evaluate(async () => {
    const body = document.querySelector('.wb-body');
    body.scrollTop = 99999;
    await new Promise(r => setTimeout(r, 200));
    const t = document.querySelector('.wb-top').getBoundingClientRect();
    return { top: +t.top.toFixed(1), winY: scrollY, scrolled: body.scrollTop };
  });
  check(pinned.top === 0 && pinned.winY === 0, '唯一滚动容器滚到底后抬头仍在 top:0',
    `抬头 top ${pinned.top} / 页面滚动 ${pinned.winY} / 容器已滚 ${pinned.scrolled}px`);

  await browser.close();
  console.log(`\n抬头门禁：失败 ${fails.length}`);
  if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
})();
