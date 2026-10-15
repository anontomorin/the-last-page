/* ============================================================
   地图系统 —— SVG 城区旧图 + 地点场景（旧钟楼 / 老街 / 渡口）
   ============================================================ */
window.LP = window.LP || {};
LP.map = (function () {

  /* ---------------- SVG 手绘档案地图 ---------------- */
  const LINKS = [
    ['location_archive', 'location_clocktower'],
    ['location_clocktower', 'location_oldstreet'],
    ['location_oldstreet', 'location_ferry']
  ];

  /* 各地点的手绘地标符号（SVG path，居中于节点上方） */
  const LANDMARKS = {
    location_archive:
      'M-3.4 -1.6 L3.4 -1.6 L3.4 2.8 L-3.4 2.8 Z M-1.5 -1.6 L-1.5 -3.4 L1.5 -3.4 L1.5 -1.6 M-3.9 -3.4 L3.9 -3.4',
    location_clocktower:
      'M-3.2 2.4 L-3.2 -2.6 L-1.8 -2.6 L-1.8 -5.4 L1.8 -5.4 L1.8 -2.6 L3.2 -2.6 L3.2 2.4 ' +
      'M0 -5.4 L0 -7.6 M-1.1 -1.4 A1.1 1.1 0 1 1 1.1 -1.4 A1.1 1.1 0 1 1 -1.1 -1.4 M0 -1.4 L0 -2.2 M0 -1.4 L.7 -.9',
    location_oldstreet:
      'M-4.4 .8 L-4.4 -2.6 L-2.6 -4.4 L-.8 -2.6 L-.8 .8 M.8 .8 L.8 -2.2 L2.4 -3.8 L4.2 -2.2 L4.2 .8 ' +
      'M-5 -2.6 L-2.6 -5 L-.4 -2.6 M-3.2 -4 L.4 -4',
    location_ferry:
      'M-4 -1 L4 -1 L2.6 1.4 L-2.6 1.4 Z M0 -1 L0 -3.8 M-3.2 -4.6 C-1.6 -3.6 1.6 -3.6 3.2 -4.6 ' +
      'M-4.4 3.2 C-2.2 2.4 2.2 2.4 4.4 3.2 M-3 4.6 C-1.4 4 1.4 4 3 4.6'
  };

  /* 街区块面 / 巷道 / 树丛 / 桥（纯装饰，与地点坐标协调） */
  const MAP_DECOR = {
    blocks: [
      'M10 16 L24 14 L25 24 L11 26 Z',
      'M38 12 L52 10 L53 20 L40 22 Z',
      'M12 44 L26 42 L27 52 L13 54 Z',
      'M60 44 L74 42 L75 52 L61 54 Z',
      'M34 26 L44 25 L45 33 L35 34 Z'
    ],
    streets: [
      'M6 32 Q24 30 40 33', 'M8 54 Q30 52 52 55', 'M56 28 Q70 26 84 28',
      'M20 8 Q19 30 22 58', 'M58 8 Q60 34 62 60', 'M84 34 Q82 56 76 72'
    ],
    trees: [[15, 61], [18.5, 59], [63, 18], [66.5, 20], [88, 58], [85, 61.5], [44, 76]],
    bridge: 'M58 79 Q64 75.5 70 80'
  };

  let mapSel = null;   // 记住玩家在地图上的选中地点（返回时恢复）
  let mapIntroPlayed = false;   // 完整入场（纸面淡入/边框描画/路线/节点错峰）只播一次

  /* ---------------- 现场走访的归属 ----------------
     双人模式下，现场只属于记录者（B）：ta 扛着相机跑现场。
     执笔者（A）留在档案馆里翻纸页，一切都只能靠听。 */
  function canEnterScene() {
    return LP.state.get().mode !== 'A';
  }
  function tellNoScene(locName) {
    LP.audio.error();
    LP.ui.toast('现场由你的记录者走访 —— 让 ta 把看到的东西念给你听。', 'gold');
    setTimeout(() => { if (LP.duo) LP.duo.openPanel(); }, 260);
  }

  /* ------------- 地图 → 实地的纸张过场 -------------
     纯装饰层：pointer-events:none，不延迟建场、不阻塞交互；
     过场期间场景已可点击，测试与快速操作均不受影响。 */
  let veilTimer = null;
  function sceneTransition(loc) {
    const old = LP.$('.scene-transition');
    if (old) old.remove();
    if (LP.anim.reducedMotion && LP.anim.reducedMotion()) return;
    const veil = LP.el('div', { class: 'scene-transition', 'aria-hidden': 'true' });
    const svgNS = 'http://www.w3.org/2000/svg';
    const gsvg = document.createElementNS(svgNS, 'svg');
    gsvg.setAttribute('viewBox', '-8 -9 16 15');
    gsvg.classList.add('st-glyph');
    const gp = document.createElementNS(svgNS, 'path');
    gp.setAttribute('d', LANDMARKS[loc.id] || 'M-3 0 L3 0');
    gsvg.appendChild(gp);
    veil.appendChild(LP.el('div', { class: 'st-label' }, [
      gsvg,
      LP.el('span', { text: (loc.name || '') + ' · 前往现场' })
    ]));
    document.body.appendChild(veil);
    clearTimeout(veilTimer);
    veilTimer = setTimeout(() => { veil.remove(); veilTimer = null; }, 600);
  }

  /* ---------------- 地点预览卡 ---------------- */
  function mapPreviewEl() { return LP.$('#map-preview'); }

  function showPreview(loc) {
    const box = mapPreviewEl();
    if (!box || !loc) return;
    /* 新壳：预览卡由 ui2/view/map.js 的 mapPreview 视图渲染 */
    if (LP.ui2 && LP.ui2.mount('mapPreview', { root: box }, {
      state: LP.state.get(), data: LP.data, ui: { loc }
    })) return;
    const s = LP.state.get();
    const unlocked = LP.archive.locationUnlocked(loc);
    const visited = LP.state.has('discoveredLocations', loc.id);
    box.classList.remove('hidden');
    box.innerHTML = '';

    const glyph = LP.el('div', { class: 'mp-glyph' });
    const svgNS = 'http://www.w3.org/2000/svg';
    const gsvg = document.createElementNS(svgNS, 'svg');
    gsvg.setAttribute('viewBox', '-8 -9 16 15');
    const gp = document.createElementNS(svgNS, 'path');
    gp.setAttribute('d', LANDMARKS[loc.id] || 'M-3 0 L3 0');
    gsvg.appendChild(gp);
    glyph.appendChild(gsvg);

    const info = LP.el('div', {}, [
      LP.el('h4', { text: unlocked ? loc.name : '？？？' }),
      LP.el('div', { class: 'mp-meta mono', text: unlocked ? ('ARCHIVE · ' + loc.year) : 'ARCHIVE · 未开放' }),
      LP.el('p', {
        class: 'mp-desc',
        text: !unlocked ? '档案里还没有开放这处地点的记录。'
          : loc.scene && loc.objects ? loc.desc
          : loc.desc
      })
    ]);
    if (!unlocked) {
      info.appendChild(LP.el('span', { class: 'mp-status mono', text: '尚未开放' }));
    } else if (visited) {
      info.appendChild(LP.el('span', { class: 'mp-status done mono', text: '✓ 已勘察' }));
    } else {
      const st = LP.el('span', { class: 'mp-status open mono', text: '待勘察' });
      info.appendChild(st);
      if (loc.scene) {
        if (canEnterScene()) {
          info.appendChild(LP.el('span', {
            class: 'mp-status open mono',
            text: `${loc.objects.length} 处可调查 · 点击地图标记进入`,
            style: 'margin-left:.4rem'
          }));
        } else {
          info.appendChild(LP.el('span', {
            class: 'mp-status mono',
            text: '现场由记录者走访',
            style: 'margin-left:.4rem'
          }));
        }
      }
    }
    box.appendChild(glyph);
    box.appendChild(info);
  }

  /* 选中地点并进入（旧壳/新壳共用的动作） */
  function chooseNode(id, g) {
    const loc = LP.data.locations[id];
    if (!loc) return;
    LP.audio.click();
    mapSel = id;
    const svg = (g && g.ownerSVGElement) || LP.$('.map-svg');
    if (svg) LP.$$('.map-node', svg).forEach(n => n.classList.toggle('sel', n === g));
    showPreview(loc);
    if (!LP.archive.locationUnlocked(loc)) {
      LP.ui.toast('这处地点还没有在档案中开放。');
      return;
    }
    if (loc.scene) {
      if (!canEnterScene()) return tellNoScene(loc.name);
      LP.state.addTo('discoveredLocations', loc.id);
      openScene(loc.id);          // 先建好目标内容
      sceneTransition(loc);       // 再用纸张过场揭示（不阻塞）
    } else {
      LP.ui.toast(loc.desc);
    }
  }

  function mapCtx() {
    return {
      state: LP.state.get(),
      data: LP.data,
      ui: { sel: mapSel, introPlayed: mapIntroPlayed },
      onPreview: id => showPreview(LP.data.locations[id]),
      onChoose: (id, g) => chooseNode(id, g),
      onDuo: () => { if (LP.duo) LP.duo.openPanel(); },
      /* 渲染完成后填充预览卡（默认选中或档案馆） */
      afterRender: () => {
        const defLoc = LP.data.locations[mapSel] || LP.data.locations.location_archive;
        showPreview(defLoc);
      }
    };
  }

  function renderMap(container) {
    /* 新壳：整幅地图由 ui2/view/map.js 的 map 视图渲染 */
    if (LP.ui2 && LP.ui2.mount('map', { root: container }, mapCtx())) {
      mapIntroPlayed = true;       // 完整入场只播一次（与旧壳一致）
      return;
    }
    container.innerHTML = '';
    const s = LP.state.get();
    const wrap = LP.el('div', { class: 'map-wrap' });
    /* 二次进入不再重播完整长动画（仅保留一次性的新解锁印章） */
    if (mapIntroPlayed) wrap.classList.add('no-intro');
    else mapIntroPlayed = true;

    // 执笔者卷：地图只是纸上的位置，现场不属于 ta
    if (!canEnterScene()) {
      wrap.appendChild(LP.el('div', { class: 'map-duo-note' }, [
        LP.el('div', { class: 'mono', text: 'FIELD WORK · NOT IN THIS VOLUME', style: 'font-size:.6rem;letter-spacing:.3em;color:var(--red)' }),
        LP.el('p', {
          class: 'serif',
          text: '你留在档案馆里翻纸页。钟楼、老街、渡口，都由你的记录者一趟趟走过去——ta 看到什么，会念给你听。'
        }),
        LP.el('button', { class: 'btn-ghost small', text: '打开通话', onclick: () => LP.duo.openPanel() })
      ]));
    }

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.classList.add('map-svg');

    /* 制图边框与角线 */
    const frame = document.createElementNS(svgNS, 'rect');
    frame.setAttribute('x', 2); frame.setAttribute('y', 2);
    frame.setAttribute('width', 96); frame.setAttribute('height', 96);
    frame.setAttribute('rx', 1);
    frame.classList.add('map-frame');
    svg.appendChild(frame);
    [[2, 2, 1, 1], [98, 2, -1, 1], [2, 98, 1, -1], [98, 98, -1, -1]].forEach(([x, y, dx, dy]) => {
      const t1 = document.createElementNS(svgNS, 'line');
      t1.setAttribute('x1', x); t1.setAttribute('y1', y);
      t1.setAttribute('x2', x + 3 * dx); t1.setAttribute('y2', y);
      const t2 = document.createElementNS(svgNS, 'line');
      t2.setAttribute('x1', x); t2.setAttribute('y1', y);
      t2.setAttribute('x2', x); t2.setAttribute('y2', y + 3 * dy);
      t1.classList.add('map-tick'); t2.classList.add('map-tick');
      svg.appendChild(t1); svg.appendChild(t2);
    });

    /* 方向罗盘（装饰，非真实测量） */
    const compass = document.createElementNS(svgNS, 'g');
    compass.setAttribute('transform', 'translate(90,11)');
    compass.classList.add('map-compass');
    const cc = document.createElementNS(svgNS, 'circle');
    cc.setAttribute('r', 4.6); compass.appendChild(cc);
    const needle = document.createElementNS(svgNS, 'path');
    needle.setAttribute('d', 'M0 -3.6 L1.1 1 L0 .4 L-1.1 1 Z');
    compass.appendChild(needle);
    const cn = document.createElementNS(svgNS, 'text');
    cn.setAttribute('y', -5.8); cn.textContent = '北';
    compass.appendChild(cn);
    svg.appendChild(compass);

    /* 比例尺装饰 */
    const scale = document.createElementNS(svgNS, 'g');
    scale.setAttribute('transform', 'translate(7,92.5)');
    scale.classList.add('map-scale');
    const sb = document.createElementNS(svgNS, 'line');
    sb.setAttribute('x1', 0); sb.setAttribute('x2', 14);
    scale.appendChild(sb);
    [0, 7, 14].forEach(x => {
      const tk = document.createElementNS(svgNS, 'line');
      tk.setAttribute('x1', x); tk.setAttribute('x2', x);
      tk.setAttribute('y1', -1); tk.setAttribute('y2', 1);
      tk.classList.add('tick');
      scale.appendChild(tk);
    });
    const st = document.createElementNS(svgNS, 'text');
    st.setAttribute('x', 16); st.setAttribute('y', .8);
    st.textContent = '档案测绘 · 示意';
    scale.appendChild(st);
    svg.appendChild(scale);

    /* 河流：三层手绘笔触 + 缓慢高光 */
    const RIVER_D = 'M0,78 Q30,72 52,80 T100,86';
    [['base', 0], ['mid', .8], ['hl', 1.6]].forEach(([cls, delay]) => {
      const river = document.createElementNS(svgNS, 'path');
      river.setAttribute('d', RIVER_D);
      river.classList.add('map-river', cls);
      river.style.animationDelay = delay + 's';
      svg.appendChild(river);
    });

    /* 街区块面 / 巷道 / 树 / 桥 */
    MAP_DECOR.blocks.forEach(d => {
      const b = document.createElementNS(svgNS, 'path');
      b.setAttribute('d', d);
      b.classList.add('map-block');
      svg.appendChild(b);
    });
    MAP_DECOR.streets.forEach(d => {
      const st = document.createElementNS(svgNS, 'path');
      st.setAttribute('d', d);
      st.classList.add('map-street');
      svg.appendChild(st);
    });
    MAP_DECOR.trees.forEach(([x, y]) => {
      const t = document.createElementNS(svgNS, 'circle');
      t.setAttribute('cx', x); t.setAttribute('cy', y);
      t.setAttribute('r', 1.1);
      t.classList.add('map-tree');
      svg.appendChild(t);
    });
    const bridge = document.createElementNS(svgNS, 'path');
    bridge.setAttribute('d', MAP_DECOR.bridge);
    bridge.classList.add('map-bridge');
    svg.appendChild(bridge);

    /* 路线：墨水描画（pathLength 归一，长短路线节奏一致） */
    LINKS.forEach(([a, b], i) => {
      const la = LP.data.locations[a], lb = LP.data.locations[b];
      if (!la || !lb) return;
      if (!LP.archive.locationUnlocked(la) || !LP.archive.locationUnlocked(lb)) return;
      const d = `M${la.x},${la.y} Q${(la.x + lb.x) / 2},${(la.y + lb.y) / 2 - 6} ${lb.x},${lb.y}`;
      const line = document.createElementNS(svgNS, 'path');
      line.setAttribute('d', d);
      line.setAttribute('pathLength', '1');
      line.classList.add('map-path');
      line.style.animationDelay = (0.5 + i * 0.35) + 's';
      svg.appendChild(line);
      /* 两端都已走访：金色行进光点（流动一次后停止） */
      if (LP.state.has('discoveredLocations', a) && LP.state.has('discoveredLocations', b)) {
        const flow = document.createElementNS(svgNS, 'path');
        flow.setAttribute('d', d);
        flow.setAttribute('pathLength', '1');
        flow.classList.add('map-flow');
        flow.style.animationDelay = (0.9 + i * 0.35) + 's';
        svg.appendChild(flow);
      }
    });

    /* 节点：错峰入场 + 状态（锁定 / 待勘察 / 已勘察 / 新解锁 / 选中） */
    let nodeIdx = 0;
    Object.values(LP.data.locations).forEach(loc => {
      const unlocked = LP.archive.locationUnlocked(loc);
      const isNew = unlocked && !LP.state.has('discoveredLocations', loc.id) && loc.id !== 'location_archive';
      const visited = unlocked && LP.state.has('discoveredLocations', loc.id);
      const g = document.createElementNS(svgNS, 'g');
      g.classList.add('map-node');
      if (!unlocked) g.classList.add('locked');
      if (isNew) g.classList.add('new');
      if (visited) g.classList.add('visited');
      if (mapSel === loc.id) g.classList.add('sel');
      g.style.animationDelay = (0.3 + nodeIdx * 0.13) + 's';
      nodeIdx++;
      g.setAttribute('tabindex', unlocked ? '0' : '-1');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', unlocked ? loc.name : '未开放的地点');

      /* 触控热区（比可见节点大） */
      const hit = document.createElementNS(svgNS, 'circle');
      hit.setAttribute('cx', loc.x); hit.setAttribute('cy', loc.y);
      hit.setAttribute('r', 7);
      hit.classList.add('hit');
      g.appendChild(hit);

      /* 新解锁：落印章扩散环（一次性） */
      if (isNew) {
        const ring = document.createElementNS(svgNS, 'circle');
        ring.setAttribute('cx', loc.x); ring.setAttribute('cy', loc.y);
        ring.setAttribute('r', 4);
        ring.classList.add('stamp-ring');
        g.appendChild(ring);
      }

      /* 地标符号 */
      const lm = document.createElementNS(svgNS, 'g');
      lm.setAttribute('transform', `translate(${loc.x},${loc.y - 7.5})`);
      lm.classList.add('map-landmark');
      const lp = document.createElementNS(svgNS, 'path');
      lp.setAttribute('d', LANDMARKS[loc.id] || 'M-3 0 L3 0');
      lm.appendChild(lp);
      g.appendChild(lm);

      const c = document.createElementNS(svgNS, 'circle');
      c.setAttribute('cx', loc.x); c.setAttribute('cy', loc.y);
      c.setAttribute('r', loc.modern ? 2.2 : 1.9);
      c.classList.add('circle');
      g.appendChild(c);

      /* 选中环 */
      const sr = document.createElementNS(svgNS, 'circle');
      sr.setAttribute('cx', loc.x); sr.setAttribute('cy', loc.y);
      sr.setAttribute('r', 3.6);
      sr.classList.add('sel-ring');
      g.appendChild(sr);

      /* 已勘察记点 */
      if (visited) {
        const vm = document.createElementNS(svgNS, 'circle');
        vm.setAttribute('cx', loc.x + 3); vm.setAttribute('cy', loc.y - 3);
        vm.setAttribute('r', .9);
        vm.classList.add('visited-mark');
        g.appendChild(vm);
      }

      const t = document.createElementNS(svgNS, 'text');
      t.setAttribute('x', loc.x); t.setAttribute('y', loc.y + 5.6);
      t.textContent = unlocked ? loc.name : '？？？';
      g.appendChild(t);

      const yr = document.createElementNS(svgNS, 'text');
      yr.setAttribute('x', loc.x); yr.setAttribute('y', loc.y + 9.2);
      yr.classList.add('yr');
      yr.textContent = unlocked ? loc.year : '——';
      g.appendChild(yr);

      /* 预览（悬停/聚焦） + 选中 + 进入（保持原有单击进入习惯与测试兼容） */
      g.addEventListener('mouseenter', () => showPreview(loc));
      g.addEventListener('focus', () => showPreview(loc));
      g.addEventListener('click', () => chooseNode(loc.id, g));
      g.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); g.dispatchEvent(new Event('click')); }
      });
      svg.appendChild(g);
    });

    wrap.appendChild(svg);

    /* 地点预览卡（默认显示当前选中或档案馆） */
    const preview = LP.el('div', { class: 'map-preview hidden', id: 'map-preview', 'aria-live': 'polite' });
    wrap.appendChild(preview);
    if (mapSel) {
      const g = svg.querySelector('.map-node.sel');
      if (g) g.classList.add('sel');
    }

    /* 图例（可折叠） */
    const lg = LP.el('details', { class: 'map-legend' });
    lg.appendChild(LP.el('summary', { text: '图 例' }));
    const row = (icoHtml, txt) => LP.el('div', { class: 'lg-row' }, [
      LP.el('span', { class: 'lg-ico', html: icoHtml }),
      LP.el('span', { text: txt })
    ]);
    const dot = color => `<svg viewBox="0 0 20 10" width="20" height="10"><circle cx="10" cy="5" r="3" fill="#FDFBF4" stroke="${color}" stroke-width="1.4"/></svg>`;
    lg.appendChild(row(dot('#B85E52'), '可调查地点（点击进入现场）'));
    lg.appendChild(row('<svg viewBox="0 0 20 10" width="20" height="10"><circle cx="10" cy="5" r="3" fill="#F2EEE1" stroke="#A79E8A" stroke-width="1.2" stroke-dasharray="1.6 1.2"/></svg>', '尚未开放的地点'));
    lg.appendChild(row('<svg viewBox="0 0 20 10" width="20" height="10"><circle cx="10" cy="5" r="3" fill="none" stroke="#A97F26" stroke-width="1.2"/><circle cx="14" cy="2.6" r="1.4" fill="#A97F26"/></svg>', '已勘察（金点记档）'));
    lg.appendChild(row('<svg viewBox="0 0 20 10" width="20" height="10"><path d="M2 7 Q10 2 18 6" fill="none" stroke="#B85E52" stroke-width="1.2"/></svg>', '线索路线（墨水描画）'));
    lg.appendChild(row('<svg viewBox="0 0 20 10" width="20" height="10"><path d="M2 6 Q10 3 18 5" fill="none" stroke="#A97F26" stroke-width="1.6" stroke-dasharray="1.5 2.5"/></svg>', '已走访路段（金色流光）'));
    wrap.appendChild(lg);

    /* 阅览室场景图：档案馆所在的旧阅览室 */
    wrap.appendChild(LP.el('figure', { class: 'map-room' }, [
      LP.el('img', { src: 'assets/images/scene_reading_room.webp', alt: '旧阅览室的木桌、卷宗与窗光', loading: 'lazy' }),
      LP.el('figcaption', { class: 'mono', text: '数字档案馆 · 旧阅览室' })
    ]));
    container.appendChild(wrap);

    /* 默认预览卡（当前选中地点，否则档案馆）
       —— 必须在 wrap 挂到文档之后再填：showPreview 通过 #map-preview 查找，
          挂载前调用会静默失败，预览卡会一直停在 hidden（历史缺陷，已修）。 */
    const defLoc = LP.data.locations[mapSel] || LP.data.locations.location_archive;
    showPreview(defLoc);
  }

  function focusMap() { LP.archive.setTab('map'); }

  /* ---------------- 场景 ---------------- */
  const OBJ_ICONS = {
    obj_bell:  'M32 8 C18 8 12 22 12 34 L10 42 L54 42 L52 34 C52 22 46 8 32 8 Z M32 46 L32 52 M26 56 L38 56',
    obj_wall:  'M8 16 L56 16 L56 52 L8 52 Z M8 28 L56 28 M8 40 L56 40 M20 16 L20 28 M44 16 L44 28 M32 28 L32 40 M14 40 L14 52 M50 40 L50 52',
    obj_board: 'M10 10 L54 10 L54 44 L10 44 Z M16 18 L48 18 M16 24 L48 24 M16 30 L48 30 M16 36 L40 36 M20 44 L20 54 M44 44 L44 54',
    obj_bench: 'M8 30 L56 30 M12 30 L12 44 M52 30 L52 44 M8 38 L56 38 M12 44 L10 52 M52 44 L54 52',
    obj_door:  'M18 8 L46 8 L46 56 L18 56 Z M40 32 L43 32 M18 8 L46 8',
    obj_shop:  'M10 24 L54 24 L50 12 L14 12 Z M14 24 L14 52 L50 52 L50 24 M24 34 L40 34 M24 42 L40 42',
    obj_stone: 'M10 40 L54 40 M14 40 L12 52 L52 52 L50 40 M20 28 L44 28 M22 28 L20 40 M42 28 L44 40 M28 16 L36 16',
    obj_river: 'M8 24 C18 20 26 28 36 24 C44 21 50 27 56 24 M8 36 C18 32 26 40 36 36 C44 33 50 39 56 36 M8 48 C18 44 26 52 36 48 C44 45 50 51 56 48',
    obj_post:  'M24 8 L24 56 M40 8 L40 56 M18 20 L46 20 M18 32 L46 32 M16 56 L48 56',
    obj_sign:  'M12 10 L52 10 L52 34 L12 34 Z M20 34 L20 54 M44 34 L44 54 M18 18 L46 18 M18 26 L40 26'
  };

  function objIcon(id) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 64 64');
    const p = document.createElementNS(svgNS, 'path');
    p.setAttribute('d', OBJ_ICONS[id] || 'M32 8 L56 56 L8 56 Z');
    svg.appendChild(p);
    return svg;
  }

  /* 物件的持久「已勘察」状态映射（来自真实 completedPuzzles） */
  const OBJ_DONE_PUZZLE = {
    obj_bell: 'bell7',
    obj_board: 'board_row7',
    obj_door: 'clocktower_door',
    obj_bench: 'bench_paper'
  };

  /* 场景视图层所需的回调（热点判定与状态变更留在本模块） */
  function sceneCtx(body, locId) {
    return {
      state: LP.state.get(),
      data: LP.data,
      ui: { locId },
      onObject: (objId, el, e, stage, msgBox) => {
        if (objId === 'obj_river') spawnRipples(stage, e);
        if (objId === 'obj_sign') {
          el.classList.remove('swing'); void el.offsetWidth; el.classList.add('swing');
        }
        const loc = LP.data.locations[locId];
        const donePuzzle = OBJ_DONE_PUZZLE[objId];
        const beforeDone = donePuzzle ? LP.state.has('completedPuzzles', donePuzzle) : false;
        handleObject(loc.scene, objId, el, msgBox, stage);
        /* 首次发现：仅当真实状态由未完成 → 完成时播放一次聚焦入档反馈 */
        const afterDone = donePuzzle ? LP.state.has('completedPuzzles', donePuzzle) : false;
        if (!beforeDone && afterDone) {
          if (LP.ui2.scene) LP.ui2.scene.found(el);
          else { el.classList.add('done', 'found'); setTimeout(() => el.classList.remove('found'), 700); }
        }
      },
      afterRender: stage => bindSceneLifecycle(body, stage)
    };
  }

  function openScene(locId) {
    const loc = LP.data.locations[locId];
    if (!loc || !loc.scene) return;
    if (!canEnterScene()) return tellNoScene(loc.name);
    LP.router.go('scene');
    LP.$('#scene-title').textContent = loc.name;
    LP.$('#scene-sub').textContent = loc.desc;
    const body = LP.$('#scene-body');
    if (body.__cleanup) body.__cleanup();      // 释放上一场景遗留的定时器/动画
    body.innerHTML = '';

    /* 新壳：舞台结构由 ui2/view/scene.js 渲染，交互仍走本模块 */
    if (LP.ui2 && LP.ui2.mount('scene', { body }, sceneCtx(body, locId))) return;

    const stage = LP.el('div', { class: 'scene-stage' });
    const msgBox = LP.el('div', { class: 'scene-msg', text: loc.desc });

    /* 场景宽幅老照片（本地生成， sepia 与档案原件一致） */
    const SCENE_IMG = { clocktower: 'scene_clocktower', oldstreet: 'scene_oldstreet', ferry: 'scene_ferry' };
    if (SCENE_IMG[loc.scene]) {
      stage.appendChild(LP.el('img', {
        class: 'scene-photo', src: 'assets/images/' + SCENE_IMG[loc.scene] + '.webp',
        alt: loc.name + '的旧照片'
      }));
    }
    /* 环境动态层：低密度的漂移光斑与尘粒 */
    stage.appendChild(LP.el('div', { class: 'scene-dust', 'aria-hidden': 'true' }));

    const svgNS = 'http://www.w3.org/2000/svg';
    (loc.objects || []).forEach(obj => {
      const el = LP.el('div', {
        class: 'scene-obj', 'data-pos': obj.pos, 'data-obj': obj.id,
        tabindex: '0', role: 'button', 'aria-label': '检查：' + obj.name
      }, [
        objIcon(obj.id),
        LP.el('div', { class: 'obj-label', text: obj.name }),
        LP.el('span', { class: 'obj-pulse', 'aria-hidden': 'true' }),
        /* 已勘察记号（真实状态，刷新后仍正确） */
        (() => {
          const chk = document.createElementNS(svgNS, 'svg');
          chk.setAttribute('viewBox', '0 0 16 16');
          chk.classList.add('obj-check');
          const c = document.createElementNS(svgNS, 'circle');
          c.setAttribute('cx', 8); c.setAttribute('cy', 8); c.setAttribute('r', 7);
          const p = document.createElementNS(svgNS, 'path');
          p.setAttribute('d', 'M4.5 8.2 L7 10.6 L11.5 5.6');
          chk.appendChild(c); chk.appendChild(p);
          return chk;
        })()
      ]);
      /* 已勘察物件恢复记号（依据真实 completedPuzzles） */
      const donePuzzle = OBJ_DONE_PUZZLE[obj.id];
      if (donePuzzle && LP.state.has('completedPuzzles', donePuzzle)) el.classList.add('done');
      el.addEventListener('click', e => {
        /* 检查反馈：柔和扩散环 + 局部聚焦 + 专属动效，随后走原有故事逻辑 */
        el.classList.remove('pulsing'); void el.offsetWidth; el.classList.add('pulsing');
        el.classList.add('pressed');
        el.classList.remove('focus-in'); void el.offsetWidth; el.classList.add('focus-in');
        if (LP.anim.after) {
          LP.anim.after(el, () => el.classList.remove('pressed'), 260);
          LP.anim.after(el, () => el.classList.remove('focus-in'), 700);
        } else {
          setTimeout(() => el.classList.remove('pressed'), 260);
          setTimeout(() => el.classList.remove('focus-in'), 700);
        }
        if (obj.id === 'obj_river') spawnRipples(stage, e);
        if (obj.id === 'obj_sign') {
          el.classList.remove('swing'); void el.offsetWidth; el.classList.add('swing');
        }
        const beforeDone = donePuzzle ? LP.state.has('completedPuzzles', donePuzzle) : false;
        handleObject(loc.scene, obj.id, el, msgBox, stage);
        /* 首次发现：仅当真实状态由未完成 → 完成时播放一次聚焦入档反馈 */
        const afterDone = donePuzzle ? LP.state.has('completedPuzzles', donePuzzle) : false;
        if (!beforeDone && afterDone) {
          el.classList.add('done', 'found');
          if (LP.anim.after) LP.anim.after(el, () => el.classList.remove('found'), 700);
          else setTimeout(() => el.classList.remove('found'), 700);
        }
      });
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
      });
      stage.appendChild(el);
    });

    body.appendChild(stage);
    body.appendChild(msgBox);
    bindSceneLifecycle(body, stage);
  }

  /* 场景生命周期：离开时停止环境动效、清除临时动画与定时器（避免堆叠/串场） */
  function bindSceneLifecycle(body, stage) {
    if (LP.anim.reducedMotion && LP.anim.reducedMotion()) {
      const d0 = LP.$('.scene-dust', stage);
      if (d0) d0.style.animation = 'none';
    }
    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(es => {
        const d = LP.$('.scene-dust', stage);
        if (!d) return;
        es.forEach(en => { d.style.animationPlayState = en.isIntersecting ? 'running' : 'paused'; });
      }, { threshold: 0 });
      io.observe(stage);
    }
    body.__cleanup = () => {
      if (io) io.disconnect();
      clearTimeout(veilTimer); veilTimer = null;
      const veil = LP.$('.scene-transition'); if (veil) veil.remove();
      if (LP.anim.cleanup) LP.anim.cleanup(body);
    };
  }

  /* 渡口：点击水面位置扩散同心波纹（自动消散，限制并发） */
  function spawnRipples(stage, e) {
    if (LP.anim.reducedMotion && LP.anim.reducedMotion()) return;
    /* 同一时刻最多 6 个涟漪，连点时不堆叠 */
    const existing = stage.querySelectorAll('.river-ripple');
    if (existing.length >= 6) existing[0].remove();
    const r = stage.getBoundingClientRect();
    const x = (e.clientX || r.left + r.width / 2) - r.left;
    const y = (e.clientY || r.top + r.height / 2) - r.top;
    ['', 'r2'].forEach(cls => {
      const rip = LP.el('span', { class: 'river-ripple ' + cls, 'aria-hidden': 'true' });
      rip.style.left = x + 'px';
      rip.style.top = y + 'px';
      stage.appendChild(rip);
      if (LP.anim.after) LP.anim.after(rip, () => rip.remove(), 1400);
      else setTimeout(() => rip.remove(), 1400);
    });
  }

  function setMsg(box, text) {
    LP.audio.paper();
    box.textContent = text;
    LP.anim.flash && box.animate(
      [{ opacity: .3 }, { opacity: 1 }], { duration: 400 });
  }
  function markDone(el) { el.classList.add('done'); }

  function handleObject(scene, objId, el, msgBox, stage) {
    const S = LP.story[scene.toUpperCase()];
    const obj = S && S[objId];
    if (!obj) return;

    /* ---- 旧钟楼 ---- */
    if (objId === 'obj_bell') return ringBell(el, msgBox, stage);
    if (objId === 'obj_wall') {
      markDone(el);
      return setMsg(msgBox, obj.text + '\n' + obj.text2);
    }
    if (objId === 'obj_bench') {
      markDone(el);
      // 长椅缝里的纸条：只说明「以钟声为号」，那个数字被水泡烂了 —— 必须听执笔者念日记
      if (LP.state.addTo('completedPuzzles', 'bench_paper')) {
        setTimeout(() => {
          LP.ui.toast('记下了：以钟声为号。可响几下，纸上看不出来。', 'gold');
          if (LP.state.get().mode === 'B') {
            setTimeout(() => LP.ui.toast('这张纸是从执笔者那本日记上撕下来的 —— 让 ta 把那一页念给你听。', 'gold'), 1300);
          }
        }, 500);
      }
      return setMsg(msgBox, obj.text + '\n' + obj.paper);
    }
    if (objId === 'obj_board') return openBoard(obj, el, msgBox, stage);
    if (objId === 'obj_door') return tryDoor(obj, el, msgBox);
    if (objId === 'obj_sign') return openFerrySign(obj, el, msgBox, stage);

    /* ---- 老街 / 渡口 ---- */
    markDone(el);
    setMsg(msgBox, obj.text);
  }

  /* 旧钟：连点七次 */
  function ringBell(el, msgBox, stage) {
    const s = LP.state.get();
    const C = LP.story.CLOCKTOWER.obj_bell;

    // 记录者卷：日记里那句被墨盖住了 —— 次数必须由执笔者口述获得（钟楼里没有第二处写着这个数）
    const needCount = s.mode === 'B' && !s.completedPuzzles.includes('duo_bell7');
    if (needCount) {
      LP.audio.error();
      setMsg(msgBox, C.needCount + '\n' + C.needCount2);
      LP.ui.toast('你还不知道该敲几下 —— 打开「通话」，让执笔者念日记给你听。', 'gold');
      return;
    }

    if (s.bellRings >= 7) {
      return setMsg(msgBox, C.after);
    }
    let clockEl = LP.$('.clock-face', stage);
    if (!clockEl) {
      clockEl = LP.el('div', { class: 'clock-face' }, [
        LP.el('div', { class: 'clock-hand h', style: 'transform:rotate(218.5deg)' }), // 7:17, matches photo
        LP.el('div', { class: 'clock-hand m', style: 'transform:rotate(102deg)' }),
        LP.el('div', { class: 'clock-center' })
      ]);
      clockEl.style.cssText = 'position:absolute;top:14%;left:50%;transform:translateX(-50%) scale(.55)';
      stage.appendChild(clockEl);
    }
    const n = s.bellRings + 1;
    LP.state.set({ bellRings: n });
    LP.audio.clock();
    /* 前六声只做钟面回应与声波，不做全屏闪白，避免喧宾夺主 */
    clockEl.classList.remove('ringing'); void clockEl.offsetWidth; clockEl.classList.add('ringing');

    /* 钟声波：两层环形扩散，随后自动消散（登记以便离开场景时清理） */
    [0, 220].forEach(delay => {
      if (LP.anim.after) LP.anim.after(stage, () => {
        const wave = LP.el('span', { class: 'bell-wave', 'aria-hidden': 'true' });
        stage.appendChild(wave);
        if (LP.anim.after) LP.anim.after(wave, () => wave.remove(), 1100);
        else setTimeout(() => wave.remove(), 1100);
      }, delay);
      else setTimeout(() => {
        const wave = LP.el('span', { class: 'bell-wave', 'aria-hidden': 'true' });
        stage.appendChild(wave);
        setTimeout(() => wave.remove(), 1100);
      }, delay);
    });

    // 双人 B 卷：不报"第几声"，只给钟声本身，让玩家口头数给搭档听
    if (s.mode === 'B') {
      setMsg(msgBox, n >= 7 ? C.after : '咚——');
    } else {
      setMsg(msgBox, C.ringing(n));
    }

    if (n >= 7) {
      LP.inv.completePuzzle('bell7');
      LP.inv.discoverClue('clue_717');
      /* 第七声高潮：一次柔和暖光 + 场景低幅震动 + 金门微光（铁索拉动的视觉暗示）
         仅此一次；再次点击钟时上面已提前 return，不会重放高潮演出。 */
      LP.anim.flash();
      stage.classList.remove('quake'); void stage.offsetWidth; stage.classList.add('quake');
      const doorEl = LP.$('.scene-obj[data-obj="obj_door"]', stage);
      if (doorEl) {
        doorEl.classList.add('door-glow');
        if (LP.anim.after) LP.anim.after(stage, () => doorEl.classList.remove('door-glow'), 2600);
        else setTimeout(() => doorEl.classList.remove('door-glow'), 2600);
      }
      // 钟面始终停在照片记录的 7:17；七声只触发连到门闩的铁索。
      if (s.mode === 'B') {
        setTimeout(() => setMsg(msgBox,
          C.after + '\n钟敲了七下。告诉你的执笔者——ta 那边的日记，也是这么写的。'), 900);
      } else {
        setTimeout(() => setMsg(msgBox, C.after), 900);
      }
    }
  }

  /* 公告栏：十二行，第七行 */
  function openBoard(obj, el, msgBox, stage) {
    const old = LP.$('.board-paper', stage.parentElement);
    if (old) { old.remove(); return; }
    LP.audio.paper();

    const has717 = LP.state.has('discoveredEvidence', 'clue_717');
    const revealed = LP.state.has('completedPuzzles', 'board_row7');

    const paper = LP.el('div', { class: 'board-paper board-photo' });
    paper.appendChild(LP.el('h4', { text: '阅览室轮值通知' }));
    const lines = ['正月 初一　李　禾', '正月 十五　陈　川', '二月 初二　林　远', '二月 十六　周　宁',
      '三月 初一　李　禾', '三月 初十　陈　川', '联络人　周　宁', '三月 十七　林　远',
      '三月 廿二　李　禾', '四月 初一　陈　川', '四月 初九　周　宁', '四月 二十　林　远'];
    lines.forEach((txt, i) => {
      const row = i + 1;
      const isRow7 = row === 7;
      const blurred = isRow7 && !revealed;
      const line = LP.el('div', {
        class: 'board-line' + (blurred ? ' blurred' : '') + (isRow7 && revealed ? ' revealed' : '')
      }, [
        LP.el('span', { class: 'ln', text: String(row).padStart(2, '0') }),
        LP.el('span', { class: 'lt', text: txt })
      ]);
      line.addEventListener('click', () => {
        if (isRow7 && revealed) return setMsg(msgBox, obj.row7);
        if (!has717) { LP.audio.error(); return setMsg(msgBox, obj.needClue); }
        if (!isRow7) { LP.audio.click(); return setMsg(msgBox, obj.wrongRow); }
        // 第七行 + 已知 7:17 → 分段显影：水渍先退去（~700ms），随后加金色底线
        line.classList.remove('blurred');
        line.classList.add('revealing');
        if (LP.anim.after) LP.anim.after(line, () => {
          line.classList.remove('revealing');
          line.classList.add('revealed', 'correct');
        }, 700);
        else { line.classList.remove('revealing'); line.classList.add('revealed', 'correct'); }
        LP.audio.complete();
        markDone(el);
        LP.inv.completePuzzle('board_row7');
        setMsg(msgBox, obj.row7);
        // 双人 B 卷：名字要"念给"执笔者听；A 拼入碎片后才真正确认人物
        if (LP.state.get().mode === 'B') {
          setTimeout(() => {
            LP.ui.toast('把第七行的名字念给你的执笔者——人物档案在 ta 手里。', 'gold');
            LP.inv.discoverClue('clue_zhou_name', true);
          }, 800);
        } else {
          setTimeout(() => LP.inv.discoverClue('clue_zhou_name'), 800);
        }      });
      paper.appendChild(line);
    });
    stage.parentElement.appendChild(paper);
    paper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* 旧木门：钟响七次后可开 */
  function tryDoor(obj, el, msgBox) {
    if (LP.state.has('completedPuzzles', 'clocktower_door')) {
      return setMsg(msgBox, obj.inside);
    }
    if (LP.state.get().bellRings >= 7) {
      LP.audio.unlock();
      markDone(el);
      LP.inv.completePuzzle('clocktower_door');
      setMsg(msgBox, obj.open + '\n' + obj.inside);
      // 双人 B 卷：信件归执笔者——B 把内容念给 A，A 才能"读全"
      if (LP.state.get().mode === 'B') {
        setTimeout(() => LP.ui.narrate([
          '门缝里卡着一个折得很小的纸包。是一封信。',
          '「远：布告我贴在钟楼里了。记住，第七行。」',
          '「我记得走的那天下着雨，冷得很。你在本子上却写『天气很好』。」',
          '——这封信属于执笔者卷，ta 手里那张被水渍糊了半句。',
          '打开「通话」，把信念给 ta 听。'
        ]), 700);
      } else {
        LP.state.addTo('unlockedDocs', 'letter_02');
        setTimeout(() => {
          LP.ui.toast('获得资料：信件 · 门缝里的纸（残页 —— 最后一句被水渍糊住了）', 'gold');
          LP.anim.flash();
          if (LP.state.get().mode === 'A') {
            setTimeout(() => LP.ui.toast('让记录者把完整的信念给你听。', 'gold'), 1200);
          }
        }, 700);
      }
      return;
    }
    LP.audio.error();
    setMsg(msgBox, obj.locked);
  }

  /* 渡口：船班木牌，「卯时三刻」被反复描深 */
  function openFerrySign(obj, el, msgBox, stage) {
    const old = LP.$('.board-paper', stage.parentElement);
    if (old) { old.remove(); return; }
    LP.audio.paper();

    const found = LP.state.has('discoveredEvidence', 'clue_ferry_time');
    const paper = LP.el('div', { class: 'board-paper' });
    paper.appendChild(LP.el('h4', { text: '渡 船 时 刻' }));
    paper.appendChild(LP.el('p', {
      class: 'dim', text: obj.text,
      style: 'font-size:.78rem;margin-bottom:.6rem'
    }));
    obj.times.forEach(t => {
      const isDeep = t === obj.deep;
      const line = LP.el('div', {
        class: 'board-line' + (isDeep && found ? ' revealed' : '')
      }, [
        LP.el('span', { class: 'ln', text: '·' }),
        LP.el('span', { class: 'lt', text: t })
      ]);
      line.addEventListener('click', () => {
        if (!isDeep) { LP.audio.click(); return setMsg(msgBox, obj.ordinary); }
        if (found) return setMsg(msgBox, obj.deepText);
        markDone(el);
        LP.audio.complete();
        LP.anim.flash();
        line.classList.add('revealed');
        setMsg(msgBox, obj.deepText + '\n' + obj.deepText2);
        setTimeout(() => LP.inv.discoverClue('clue_ferry_time'), 800);
      });
      paper.appendChild(line);
    });
    stage.parentElement.appendChild(paper);
    paper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function init() {
    LP.$('#btn-scene-back').addEventListener('click', () => {
      LP.audio.click();
      const body = LP.$('#scene-body');
      if (body && body.__cleanup) { body.__cleanup(); body.__cleanup = null; }
      LP.router.go('archive');
      LP.archive.refreshAll();
    });
  }

  return { renderMap, openScene, focusMap, init };
})();
