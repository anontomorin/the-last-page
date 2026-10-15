/* ============================================================
   新壳（ui2）视觉一致性对比
   ------------------------------------------------------------
   在完全相同的一组真实状态下，分别以「旧壳」（默认）与
   「新壳」（?ui=next）渲染，逐张做像素差对比。
   差异在阈值内即证明「换壳不换样子」——P2 的硬门禁。

   用法：
     node _playtest/ui-compare.js                       # 只截图
     node _playtest/ui-compare.js --diff                # 截图并对比
   产物：
     _playtest/ui-compare/legacy/*.png
     _playtest/ui-compare/next/*.png
   ============================================================ */
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawnSync } = require('child_process');

const PW = process.env.PLAYWRIGHT_PATH
  || 'C:/Users/郭家兴/.workbuddy/binaries/node/workspace/node_modules/playwright-core';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const { chromium } = require(PW);

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'ui-compare');
const DIR_LEGACY = path.join(OUT, 'legacy');
const DIR_NEXT = path.join(OUT, 'next');
for (const d of [DIR_LEGACY, DIR_NEXT]) fs.mkdirSync(d, { recursive: true });

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});

/* 真实状态用例（覆盖六幕 · A 卷等待 · 部分完成 · 折叠 · 查看器）
   注意：必须包含「已完成若干步骤 / 已解锁若干资料」的用例，
   否则新旧壳的判定差异会被「全未完成」掩盖成假绿。 */
const CASES = [
  /* ---- 主线任务卡 ---- */
  { name: 'act1_solo_partial', cfg: { act: 1, mode: 'solo', discoveredEvidence: ['clue_317'] } },
  { name: 'act2_A_wait', cfg: { act: 2, mode: 'A', completedPuzzles: ['bell7'] } },
  { name: 'act3_solo_reason', cfg: { act: 3, mode: 'solo', discoveredPeople: ['person_linyuan', 'person_zhou', 'person_chen', 'person_li'] } },
  { name: 'act3_solo_linked', cfg: { act: 3, mode: 'solo', discoveredPeople: ['person_linyuan', 'person_zhou', 'person_chen', 'person_li'], evidenceLinks: ['id_zhou', 'id_chen', 'id_li'] } },
  { name: 'act5_A', cfg: { act: 5, mode: 'A' } },
  { name: 'act6_solo_done', cfg: { act: 6, mode: 'solo', finalMessage: { q1: 'a', q2: 'b', q3: 'c' } } },
  { name: 'act3_solo_folded', cfg: { act: 3, mode: 'solo' }, fold: true },

  /* ---- 查看器：文档 / 信件 / 编目梗概 ---- */
  { name: 'viewer_diary_solo', sel: '.viewer-frame', openDoc: 'diary_01', cfg: { act: 2, mode: 'solo' } },
  { name: 'viewer_letter_solo', sel: '.viewer-frame', openDoc: 'letter_02', cfg: { act: 3, mode: 'solo' } },
  { name: 'viewer_gist_B', sel: '.viewer-frame', openDoc: 'diary_01', cfg: { act: 2, mode: 'B' } },

  /* ---- 查看器：PAGE_032 两态 ---- */
  { name: 'viewer_p32_partial', sel: '.viewer-frame', openDoc: 'page_032', cfg: { act: 5, mode: 'solo', ocrFragments: ['f1', 'f2'] } },
  { name: 'viewer_p32_final', sel: '.viewer-frame', openDoc: 'page_032', cfg: { act: 5, mode: 'solo', ocrFragments: ['f1', 'f2', 'f3', 'f4', 'f5'], completedPuzzles: ['page32'] } },

  /* ---- 照片查看器 ---- */
  { name: 'photo_group_solo', sel: '.viewer-frame', openPhoto: 'photo_09', cfg: { act: 2, mode: 'solo' } },
  { name: 'photo_group_partial_ids', sel: '.viewer-frame', openPhoto: 'photo_09', cfg: { act: 2, mode: 'solo', discoveredPeople: ['person_zhou'] } },
  { name: 'photo_11_B', sel: '.viewer-frame', openPhoto: 'photo_11', cfg: { act: 4, mode: 'B' } },

  /* ---- 证据板 ---- */
  {
    name: 'evidence_empty', sel: '#wb-preview', setTab: 'evidence',
    cfg: { act: 1, mode: 'solo' }
  },
  {
    name: 'evidence_act3', sel: '#wb-preview', setTab: 'evidence',
    cfg: {
      act: 3, mode: 'solo',
      discoveredPeople: ['person_linyuan', 'person_zhou', 'person_chen', 'person_li'],
      discoveredEvidence: ['clue_317', 'clue_zhou_name', 'clue_717'],
      discoveredDocuments: ['diary_01', 'photo_09', 'letter_02'],
      evidenceLinks: ['id_zhou']
    }
  },
  {
    name: 'evidence_linked3', sel: '#wb-preview', setTab: 'evidence',
    cfg: {
      act: 3, mode: 'solo',
      discoveredPeople: ['person_linyuan', 'person_zhou', 'person_chen', 'person_li'],
      discoveredEvidence: ['clue_317', 'clue_zhou_name', 'clue_717'],
      discoveredDocuments: ['diary_01', 'photo_09', 'letter_02'],
      evidenceLinks: ['id_zhou', 'id_chen', 'id_li']
    }
  },

  /* ---- 时间线 ---- */
  { name: 'timeline_locked', sel: '#wb-preview', setTab: 'timeline', cfg: { act: 3, mode: 'solo' } },
  { name: 'timeline_act4', sel: '#wb-preview', setTab: 'timeline', cfg: { act: 4, mode: 'solo' } },
  { name: 'timeline_placed', sel: '#wb-preview', setTab: 'timeline', fillTimeline: true, cfg: { act: 4, mode: 'solo' } },
  { name: 'timeline_done', sel: '#wb-preview', setTab: 'timeline', fillTimeline: true, cfg: { act: 4, mode: 'solo', completedPuzzles: ['timeline'] } },

  /* ---- 工作台 · 左侧清单 ---- */
  { name: 'wb_list_diary_act2', sel: '#wb-list', setTab: 'diary', cfg: { act: 2, mode: 'solo' } },
  { name: 'wb_list_map_locked', sel: '#wb-list', setTab: 'map', cfg: { act: 1, mode: 'solo' } },
  { name: 'wb_list_map_act4', sel: '#wb-list', setTab: 'map', cfg: { act: 4, mode: 'solo' } },
  { name: 'wb_list_person_mixed', sel: '#wb-list', setTab: 'person', cfg: { act: 3, mode: 'solo', discoveredPeople: ['person_zhou'] } },
  { name: 'wb_list_letter_B', sel: '#wb-list', setTab: 'letter', cfg: { act: 3, mode: 'B' } },
  { name: 'wb_list_search_hit', sel: '#wb-list', setTab: 'diary', search: '三月', cfg: { act: 3, mode: 'solo' } },
  { name: 'wb_list_search_empty', sel: '#wb-list', setTab: 'diary', search: '不存在的东西', cfg: { act: 3, mode: 'solo' } },

  /* ---- 工作台 · 中央空态（照片顺序校验横幅） ---- */
  { name: 'wb_empty_photo_A', sel: '#wb-empty', setTab: 'photo', cfg: { act: 4, mode: 'A' } },
  { name: 'wb_empty_photo_banner', sel: '#wb-empty', setTab: 'photo', cfg: { act: 4, mode: 'solo' } },
  { name: 'wb_empty_photo_done', sel: '#wb-empty', setTab: 'photo', cfg: { act: 4, mode: 'solo', completedPuzzles: ['photo_sort'] } },

  /* ---- 工作台 · 资料预览卡 ---- */
  { name: 'wb_preview_diary', sel: '#wb-preview', openPreview: 'diary_01', cfg: { act: 2, mode: 'solo' } },
  { name: 'wb_preview_gist_B', sel: '#wb-preview', openPreview: 'diary_01', cfg: { act: 2, mode: 'B' } },
  /* PAGE_032 属 type:'file'，不在任何标签页清单里 —— 只能经「相关资料」芯片进入 */
  {
    name: 'wb_preview_damaged', sel: '#wb-preview', openPreview: 'diary_31', clickRel: 'PAGE_032',
    cfg: { act: 5, mode: 'solo', discoveredDocuments: ['diary_31'] }
  },

  /* ---- 工作台 · 人物网格 ---- */
  { name: 'wb_people_locked', sel: '#wb-preview', setTab: 'person', cfg: { act: 2, mode: 'solo' } },
  {
    name: 'wb_people_mixed', sel: '#wb-preview', setTab: 'person',
    cfg: { act: 3, mode: 'solo', discoveredPeople: ['person_zhou', 'person_chen'] }
  },

  /* ---- 地图 ---- */
  { name: 'map_act1_first', sel: '.map-wrap', setTab: 'map', cfg: { act: 1, mode: 'solo' } },
  { name: 'map_act2_new', sel: '.map-wrap', setTab: 'map', cfg: { act: 2, mode: 'solo' } },
  {
    name: 'map_act4_visited', sel: '.map-wrap', setTab: 'map',
    cfg: { act: 4, mode: 'solo', discoveredLocations: ['location_clocktower', 'location_oldstreet'] }
  },
  { name: 'map_A_duo_note', sel: '.map-wrap', setTab: 'map', cfg: { act: 4, mode: 'A' } },
  {
    name: 'map_preview_visited', sel: '#map-preview', setTab: 'map', hoverNode: '钟楼',
    cfg: { act: 4, mode: 'solo', discoveredLocations: ['location_clocktower'] }
  },
  { name: 'map_preview_locked', sel: '#map-preview', setTab: 'map', hoverNode: '渡口', cfg: { act: 1, mode: 'solo' } },

  /* ---- 实地探索场景 ---- */
  { name: 'scene_clocktower_new', sel: '#scene-body', openScene: 'location_clocktower', cfg: { act: 2, mode: 'solo' } },
  {
    name: 'scene_clocktower_progress', sel: '#scene-body', openScene: 'location_clocktower',
    cfg: { act: 2, mode: 'solo', discoveredLocations: ['location_clocktower'], completedPuzzles: ['bell7', 'board_row7'] }
  },
  { name: 'scene_oldstreet', sel: '#scene-body', openScene: 'location_oldstreet', cfg: { act: 3, mode: 'solo' } },
  { name: 'scene_ferry', sel: '#scene-body', openScene: 'location_ferry', cfg: { act: 4, mode: 'solo' } },
  { name: 'scene_ferry_B', sel: '#scene-body', openScene: 'location_ferry', cfg: { act: 4, mode: 'B' } },

  /* ---- 结局 ---- */
  { name: 'end_form_solo', sel: '#ending-stage', openEnding: 'start', cfg: { act: 6, mode: 'solo' } },
  { name: 'end_form_duoA', sel: '#ending-stage', openEnding: 'start', cfg: { act: 6, mode: 'A' } },
  {
    name: 'end_lines_normal', sel: '#ending-stage', openEnding: 'resume', waitExtra: 6500,
    cfg: { act: 6, mode: 'solo', finalMessage: { q1: '答一', q2: '答二', q3: '答三' } }
  },
  {
    name: 'end_lines_ferry_clue', sel: '#ending-stage', openEnding: 'resume', waitExtra: 7000,
    cfg: { act: 6, mode: 'solo', discoveredEvidence: ['clue_ferry_time'], finalMessage: { q1: '答一', q2: '答二', q3: '答三' } }
  },
  {
    name: 'end_lines_hidden', sel: '#ending-stage', openEnding: 'resume', waitExtra: 6500,
    cfg: { act: 6, mode: 'solo', hiddenClues: ['x_hidden'], finalMessage: { q1: '答一', q2: '答二', q3: '答三' } }
  },
  {
    name: 'end_lines_duoA_unmerged', sel: '#ending-stage', openEnding: 'resume', waitExtra: 6500,
    cfg: { act: 6, mode: 'A', finalMessage: { name: '林', q1: '答一', q2: '答二', q3: '答三' } }
  }
];

async function clearNarrator(page) {
  for (let i = 0; i < 22; i++) {
    const vis = await page.evaluate(() => { const n = document.querySelector('#narrator'); return n && !n.hidden; });
    if (!vis) break;
    await page.click('#narrator').catch(() => {});
    await page.waitForTimeout(220);
  }
}

/* ---------------- 环境动画冻结 ----------------
   截图前把「无限循环 / 长时一次性」的装饰动画停住，让测量确定化。
   它们与本轮「换壳」无关，却会让同一份 DOM 在不同帧上产出不同像素
   （噪点层 #fx-noise 覆盖整个视口，水位/流光/尘粒同理），
   造成「结构完全一致却非 0.000%」的假阴。
   注意：只冻结这些环境层；入场类动画（依赖 forwards 填末态）保留，
   否则会停在 opacity:0 的初始态。 */
const FREEZE_AMBIENT = `
  #fx-noise,#fx-scanlines,#red-ribbon{animation:none!important}
  .doc-item .new-flag{animation:none!important}
  .map-river,.map-flow,.map-tick,.map-frame{animation:none!important}
  .scene-dust,.river-ripple,.bell-wave{animation:none!important}
`;

(async () => {
  await new Promise(r => server.listen(8128, r));
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  async function snap(page, outDir, c) {
    /* P6 起默认已是新壳，故旧壳需显式指定 ?ui=legacy */
    await page.goto('http://127.0.0.1:8128/index.html' + (outDir === DIR_NEXT ? '?ui=next' : '?ui=legacy'));
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#boot-card:not([hidden])', { timeout: 15000 });
    await page.click('#btn-start');
    await page.waitForTimeout(420);
    await clearNarrator(page);

    await page.evaluate(cfg => {
      LP.state.set(Object.assign({ currentScene: 'archive' }, cfg));
      LP.archive.refreshAll();
    }, c.cfg);
    await clearNarrator(page);

    if (c.openDoc) {
      await page.evaluate(id => LP.doc.open(id), c.openDoc);
      await page.waitForTimeout(900);              // 等纸页进场 + 段落显影
      await clearNarrator(page);
    }
    if (c.openPhoto) {
      await page.evaluate(id => LP.photo.open(id), c.openPhoto);
      await page.waitForTimeout(700);              // 等照片就位
      await clearNarrator(page);
    }
    if (c.fillTimeline) {
      await page.evaluate(() => {
        const nodes = {}, w = [], d = [];
        LP.data.timelineDays.forEach((day, i) => { nodes[i] = day.accept.slice(); w[i] = day.weather; d[i] = day.num; });
        LP.state.set({ timelineNodes: nodes, tlWeather: w, tlDate: d });
        LP.archive.refreshAll();
      });
    }
    if (c.setTab) {
      await page.evaluate(t => LP.archive.setTab(t), c.setTab);
      await page.waitForTimeout(700);
      await clearNarrator(page);
    }
    if (c.search) {
      await page.fill('#wb-search-input', c.search);
      await page.waitForTimeout(260);
    }
    if (c.openPreview) {
      await page.evaluate(id => {
        const el = document.querySelector('.doc-item[data-id="' + id + '"]');
        if (el) el.click();
      }, c.openPreview);
      await page.waitForTimeout(700);
      await clearNarrator(page);
      /* 关掉查看器，只留工作台里的资料预览卡 */
      await page.evaluate(() => { const v = document.getElementById('viewer'); if (v) v.hidden = true; });
      await page.waitForTimeout(240);
    }
    if (c.clickRel) {
      await page.evaluate(txt => {
        const chip = Array.from(document.querySelectorAll('#wb-preview .rel-chip'))
          .find(x => (x.textContent || '').indexOf(txt) >= 0);
        if (chip) chip.click();
      }, c.clickRel);
      await page.waitForTimeout(700);
      await clearNarrator(page);
      await page.evaluate(() => { const v = document.getElementById('viewer'); if (v) v.hidden = true; });
      await page.waitForTimeout(240);
    }
    if (c.openEnding) {
      await page.evaluate(kind => {
        if (kind === 'resume') LP.ending.resume(); else LP.ending.start();
      }, c.openEnding);
      await page.waitForTimeout(900);
      await clearNarrator(page);
    }
    if (c.openScene) {
      await page.evaluate(id => LP.map.openScene(id), c.openScene);
      await page.waitForTimeout(900);
      await clearNarrator(page);
    }
    if (c.hoverNode) {
      await page.evaluate(txt => {
        const g = Array.from(document.querySelectorAll('.map-node'))
          .find(n => (n.textContent || '').indexOf(txt) >= 0);
        if (g) g.dispatchEvent(new Event('mouseenter'));
      }, c.hoverNode);
      await page.waitForTimeout(300);
    }
    if (c.fold) {
      await page.locator('#quest-card button:has-text("收起")').click().catch(() => {});
    }
    await page.waitForTimeout((c.openDoc || c.openPhoto || c.setTab || c.openPreview || c.openScene || c.openEnding) ? 500 : 760);   // 等动画结束，取稳定态
    if (c.waitExtra) await page.waitForTimeout(c.waitExtra);   // 结语逐行淡入需等满
    await page.addStyleTag({ content: FREEZE_AMBIENT });      // 冻结环境动画，消除帧序抖动
    await page.waitForTimeout(120);
    await page.locator(c.sel || '#quest-card').screenshot({ path: path.join(outDir, c.name + '.png') });
  }

  for (const mode of [{ dir: DIR_LEGACY, tag: 'legacy' }, { dir: DIR_NEXT, tag: 'next' }]) {
  for (const c of CASES) {
    if (process.env.ONLY && c.name.indexOf(process.env.ONLY) < 0) continue;   // 可按需只跑子集
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
      const errs = [];
      page.on('pageerror', e => errs.push(e.message));
      const ui2err = [];
      page.on('console', m => { if (m.type() === 'error') ui2err.push(m.text()); });
      try {
        await snap(page, mode.dir, c);
      } catch (e) {
        console.log(`✗ ${mode.tag}/${c.name}`, e.message);
      }
      if (errs.length) console.log(`  [pageerror:${mode.tag}/${c.name}]`, errs.join(' | '));
      if (ui2err.length) console.log(`  [console:${mode.tag}/${c.name}]`, ui2err.join(' | '));
      await page.close();
      console.log('✓', mode.tag + '/' + c.name);
    }
  }

  await browser.close();
  server.close();

  if (process.argv.includes('--diff')) {
    const r = spawnSync(process.execPath, [path.join(__dirname, 'visual-diff.js'), DIR_LEGACY, DIR_NEXT], { stdio: 'inherit' });
    process.exit(r.status === null ? 2 : r.status);
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
