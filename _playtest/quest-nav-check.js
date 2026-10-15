/* ============================================================
   任务卡「前往目标」导航门禁 —— 把「按钮点了没反应」钉住
   ------------------------------------------------------------
   背景：第五幕「当前调查」的主行动按钮「打开 PAGE_032」表现为死键。
   根因：PAGE_032.dat 是 type:'file' 的损坏文件，**不在任何标签页清单里**
   （左侧列表只列 diary / photo / letter / map）。旧实现一律走
   「切标签 + 列表项高亮」，对它就两步全落空：标签本来就是 diary，
   列表里也没有 data-id="page_032" 的条目 —— 玩家看到的就是没反应。

   本门禁对每一幕的主行动按钮都点一次，断言「真的跳到了对应页面」：
     act1 → 照片标签 + 合影条目高亮
     act3 → 证据板标签
     act4 → 时间线标签
     act5 → 打开查看器并停在 PAGE_032.dat（本次修复的核心）
     act6 → 进入结局页
   运行：npm run test:qg（需 PLAYWRIGHT_PATH / CHROME_PATH）
   ============================================================ */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright-core');

const URL = (process.env.TEST_URL || 'http://127.0.0.1:8123') + '/index.html';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const fails = [];
  const check = (cond, label, detail) => {
    console.log(`  ${cond ? '✓' : '✗'} ${label}${detail ? '  → ' + detail : ''}`);
    if (!cond) fails.push(label + (detail ? ' → ' + detail : ''));
  };

  /* 每一幕独立起一个干净页面：只种「动作按钮会出现」所需的最小状态 */
  async function openAt(seed) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(URL);
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) { } });
    await page.reload();
    await page.waitForTimeout(350);
    await page.evaluate(s => {
      LP.state.set(s);
      LP.router.go('archive');            // 工作台可见，按钮才可点
      LP.archive.refreshAll();
    }, seed);
    await page.waitForTimeout(500);
    return page;
  }

  /* 读一次按钮文案，确保点到的正是本幕的主行动按钮 */
  async function buttonLabel(page) {
    const btn = page.locator('#quest-card .qg-go').first();
    if (!(await btn.count())) return null;
    return (await btn.textContent()).trim();
  }
  async function clickAction(page) {
    await page.locator('#quest-card .qg-go').first().click();
    await page.waitForTimeout(500);
  }

  /* ---------- 第一幕：打开合影 → 照片标签 + 条目高亮 ---------- */
  console.log('\n── 第一幕 · 打开合影 ──');
  {
    const page = await openAt({ act: 1, mode: 'solo', discoveredEvidence: ['clue_317'] });
    const label = await buttonLabel(page);
    check(label === '打开合影', 'act1 按钮文案为「打开合影」', `实际「${label}」`);
    await clickAction(page);
    const st = await page.evaluate(() => ({
      tab: LP.archive.getTab(),
      touched: !!document.querySelector('.doc-item[data-id="photo_09"].qg-target')
    }));
    check(st.tab === 'photo', 'act1 点到照片标签', st.tab);
    check(st.touched, 'act1 合影条目被高亮（qg-target）');
    await page.close();
  }

  /* ---------- 第三幕：前往证据板 ---------- */
  console.log('\n── 第三幕 · 前往证据板 ──');
  {
    const page = await openAt({ act: 3, mode: 'solo' });
    const label = await buttonLabel(page);
    check(label === '前往证据板', 'act3 按钮文案为「前往证据板」', `实际「${label}」`);
    await clickAction(page);
    const tab = await page.evaluate(() => LP.archive.getTab());
    check(tab === 'evidence', 'act3 切到证据板标签', tab);
    await page.close();
  }

  /* ---------- 第四幕：前往时间线 ---------- */
  console.log('\n── 第四幕 · 前往时间线 ──');
  {
    const page = await openAt({ act: 4, mode: 'solo' });
    const label = await buttonLabel(page);
    check(label === '前往时间线', 'act4 按钮文案为「前往时间线」', `实际「${label}」`);
    await clickAction(page);
    const tab = await page.evaluate(() => LP.archive.getTab());
    check(tab === 'timeline', 'act4 切到时间线标签', tab);
    await page.close();
  }

  /* ---------- 第五幕：打开 PAGE_032（本门禁的核心） ---------- */
  console.log('\n── 第五幕 · 打开 PAGE_032 ──');
  {
    const page = await openAt({
      act: 5, mode: 'solo',
      discoveredDocuments: ['photo_09', 'photo_11', 'letter_02', 'letter_03', 'letter_04'],
      discoveredPeople: ['person_zhou', 'person_chen', 'person_li'],
      discoveredLocations: ['location_clocktower', 'location_oldstreet', 'location_ferry'],
      completedPuzzles: ['timeline']
    });
    const label = await buttonLabel(page);
    check(label === '打开 PAGE_032', 'act5 按钮文案为「打开 PAGE_032」', `实际「${label}」`);
    await clickAction(page);
    const st = await page.evaluate(() => {
      const v = document.querySelector('#viewer');
      return {
        open: !!v && !v.hidden,
        title: (document.querySelector('#viewer-title') || {}).textContent || '',
        frags: document.querySelectorAll('#viewer-stage .ocr-frag').length,
        tab: LP.archive.getTab()
      };
    });
    check(st.open, 'act5 点开了查看器（#viewer 可见）');
    check(st.title === 'PAGE_032.dat', 'act5 停在 PAGE_032.dat', `实际「${st.title}」`);
    check(st.frags > 0, 'act5 查看器里是 5 段乱码修复页', `乱码段落 ${st.frags}`);
    await page.close();
  }

  /* ---------- 第六幕：前往结局页 ---------- */
  console.log('\n── 第六幕 · 前往结局页 ──');
  {
    const page = await openAt({ act: 6, mode: 'solo', finalMessage: { name: '测试', a1: 'x' } });
    const label = await buttonLabel(page);
    check(label === '前往结局页', 'act6 按钮文案为「前往结局页」', `实际「${label}」`);
    await clickAction(page);
    await page.waitForTimeout(400);
    const active = await page.evaluate(() =>
      document.querySelector('#screen-ending').classList.contains('active'));
    check(active, 'act6 进入结局页');
    await page.close();
  }

  await browser.close();
  console.log(`\n任务卡导航门禁：${fails.length ? '失败 ' + fails.length : '全部通过'}`);
  fails.forEach(f => console.log('  ✗ ' + f));
  process.exit(fails.length ? 1 : 0);
})();
