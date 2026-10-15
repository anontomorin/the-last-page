/* ============================================================
   ui2 · 屏幕：地图（SVG 手绘档案地图）
   ------------------------------------------------------------
   对应原 mapSystem 的 renderMap() 与地点预览卡 showPreview()，
   拆为两个 ui2 视图：
     map        ← renderMap()       整幅地图（.map-wrap）
     mapPreview ← showPreview(loc)  地点预览卡（#map-preview）

   边界：viewModel 只读 state / data / ui；render 只产 DOM。
   进入现场、切换选中、提示 toast 等一律经 ctx 回传 mapSystem。
   ============================================================ */
window.LP = window.LP || {};
(function () {

  const has = (s, k, id) => Array.isArray(s[k]) && s[k].includes(id);

  /* 路线：档案馆 → 钟楼 → 老街 → 渡口 */
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

  const RIVER_D = 'M0,78 Q30,72 52,80 T100,86';

  /* 现场走访的归属：双人模式下现场只属于记录者（B） */
  function canEnterScene(s) { return s.mode !== 'A'; }

  function locationUnlocked(loc, s) {
    if (loc.unlock === 'start') return s.act >= 1;
    if (loc.unlock === 'act1_done') return s.act >= 2;
    if (loc.unlock === 'act3') return s.act >= 3;
    if (loc.unlock === 'act4') return s.act >= 4;
    return false;
  }

  /* ---------- 地点节点（纯计算） ---------- */
  function nodeVM(loc, s) {
    const unlocked = locationUnlocked(loc, s);
    const visited = unlocked && has(s, 'discoveredLocations', loc.id);
    return {
      id: loc.id,
      x: loc.x, y: loc.y,
      name: loc.name, year: loc.year,
      modern: !!loc.modern,
      unlocked, visited,
      isNew: unlocked && !visited && loc.id !== 'location_archive',
      scene: !!loc.scene,
      objCount: (loc.objects || []).length,
      desc: loc.desc
    };
  }

  /* ---------- 地点预览卡 ---------- */
  function previewVM(s, d, ui) {
    const loc = ui.loc;
    if (!loc) return null;
    const unlocked = locationUnlocked(loc, s);
    const visited = has(s, 'discoveredLocations', loc.id);
    const canEnter = canEnterScene(s);
    return {
      id: loc.id,
      name: unlocked ? loc.name : '？？？',
      meta: unlocked ? ('ARCHIVE · ' + loc.year) : 'ARCHIVE · 未开放',
      desc: !unlocked ? '档案里还没有开放这处地点的记录。' : loc.desc,
      unlocked, visited,
      /* 状态徽标：未开放 / 已勘察 / 待勘察(+可调查数量) */
      status: !unlocked ? 'closed' : visited ? 'done' : 'open',
      canEnter,
      scene: !!loc.scene,
      objCount: (loc.objects || []).length
    };
  }

  function previewRender(vm, hosts, ctx) {
    const box = hosts.root;
    if (!box || !vm) return;
    box.classList.remove('hidden');
    box.innerHTML = '';

    const svgNS = 'http://www.w3.org/2000/svg';
    const glyph = LP.el('div', { class: 'mp-glyph' });
    const gsvg = document.createElementNS(svgNS, 'svg');
    gsvg.setAttribute('viewBox', '-8 -9 16 15');
    const gp = document.createElementNS(svgNS, 'path');
    gp.setAttribute('d', LANDMARKS[vm.id] || 'M-3 0 L3 0');
    gsvg.appendChild(gp);
    glyph.appendChild(gsvg);

    const info = LP.el('div', {}, [
      LP.el('h4', { text: vm.name }),
      LP.el('div', { class: 'mp-meta mono', text: vm.meta }),
      LP.el('p', { class: 'mp-desc', text: vm.desc })
    ]);

    if (vm.status === 'closed') {
      info.appendChild(LP.el('span', { class: 'mp-status mono', text: '尚未开放' }));
    } else if (vm.status === 'done') {
      info.appendChild(LP.el('span', { class: 'mp-status done mono', text: '✓ 已勘察' }));
    } else {
      info.appendChild(LP.el('span', { class: 'mp-status open mono', text: '待勘察' }));
      if (vm.scene) {
        if (vm.canEnter) {
          info.appendChild(LP.el('span', {
            class: 'mp-status open mono',
            text: `${vm.objCount} 处可调查 · 点击地图标记进入`,
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

  /* ---------- 整幅地图 ---------- */
  function viewModel(s, d, ui) {
    const nodes = Object.values(d.locations).map(loc => nodeVM(loc, s));
    const byId = {};
    nodes.forEach(n => { byId[n.id] = n; });

    const links = [];
    LINKS.forEach(([a, b], i) => {
      const la = byId[a], lb = byId[b];
      if (!la || !lb) return;
      const lx = d.locations[a], ly = d.locations[b];
      if (!lx || !ly) return;
      if (!la.unlocked || !lb.unlocked) return;
      const dx = `M${lx.x},${lx.y} Q${(lx.x + ly.x) / 2},${(lx.y + ly.y) / 2 - 6} ${ly.x},${ly.y}`;
      links.push({
        d: dx, i,
        flow: !!(la.visited && lb.visited)
      });
    });

    return {
      canEnter: canEnterScene(s),
      noIntro: !!ui.introPlayed,
      nodes, links,
      sel: ui.sel || null
    };
  }

  function render(vm, hosts, ctx) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const el = LP.el;
    const container = hosts.root;
    container.innerHTML = '';
    const wrap = el('div', { class: 'map-wrap' });
    if (vm.noIntro) wrap.classList.add('no-intro');

    /* 执笔者卷：地图只是纸上的位置，现场不属于 ta */
    if (!vm.canEnter) {
      wrap.appendChild(el('div', { class: 'map-duo-note' }, [
        el('div', { class: 'mono', text: 'FIELD WORK · NOT IN THIS VOLUME', style: 'font-size:.6rem;letter-spacing:.3em;color:var(--red)' }),
        el('p', {
          class: 'serif',
          text: '你留在档案馆里翻纸页。钟楼、老街、渡口，都由你的记录者一趟趟走过去——ta 看到什么，会念给你听。'
        }),
        el('button', { class: 'btn-ghost small', text: '打开通话', onclick: () => ctx.onDuo() })
      ]));
    }

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
      const s2 = document.createElementNS(svgNS, 'path');
      s2.setAttribute('d', d);
      s2.classList.add('map-street');
      svg.appendChild(s2);
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
    vm.links.forEach(L => {
      const line = document.createElementNS(svgNS, 'path');
      line.setAttribute('d', L.d);
      line.setAttribute('pathLength', '1');
      line.classList.add('map-path');
      line.style.animationDelay = (0.5 + L.i * 0.35) + 's';
      svg.appendChild(line);
      /* 两端都已走访：金色行进光点（流动一次后停止） */
      if (L.flow) {
        const flow = document.createElementNS(svgNS, 'path');
        flow.setAttribute('d', L.d);
        flow.setAttribute('pathLength', '1');
        flow.classList.add('map-flow');
        flow.style.animationDelay = (0.9 + L.i * 0.35) + 's';
        svg.appendChild(flow);
      }
    });

    /* 节点：错峰入场 + 状态（锁定 / 待勘察 / 已勘察 / 新解锁 / 选中） */
    vm.nodes.forEach((n, idx) => {
      const g = document.createElementNS(svgNS, 'g');
      g.classList.add('map-node');
      if (!n.unlocked) g.classList.add('locked');
      if (n.isNew) g.classList.add('new');
      if (n.visited) g.classList.add('visited');
      if (vm.sel === n.id) g.classList.add('sel');
      g.style.animationDelay = (0.3 + idx * 0.13) + 's';
      g.setAttribute('tabindex', n.unlocked ? '0' : '-1');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', n.unlocked ? n.name : '未开放的地点');

      /* 触控热区（比可见节点大） */
      const hit = document.createElementNS(svgNS, 'circle');
      hit.setAttribute('cx', n.x); hit.setAttribute('cy', n.y);
      hit.setAttribute('r', 7);
      hit.classList.add('hit');
      g.appendChild(hit);

      /* 新解锁：落印章扩散环（一次性） */
      if (n.isNew) {
        const ring = document.createElementNS(svgNS, 'circle');
        ring.setAttribute('cx', n.x); ring.setAttribute('cy', n.y);
        ring.setAttribute('r', 4);
        ring.classList.add('stamp-ring');
        g.appendChild(ring);
      }

      /* 地标符号 */
      const lm = document.createElementNS(svgNS, 'g');
      lm.setAttribute('transform', `translate(${n.x},${n.y - 7.5})`);
      lm.classList.add('map-landmark');
      const lp = document.createElementNS(svgNS, 'path');
      lp.setAttribute('d', LANDMARKS[n.id] || 'M-3 0 L3 0');
      lm.appendChild(lp);
      g.appendChild(lm);

      const c = document.createElementNS(svgNS, 'circle');
      c.setAttribute('cx', n.x); c.setAttribute('cy', n.y);
      c.setAttribute('r', n.modern ? 2.2 : 1.9);
      c.classList.add('circle');
      g.appendChild(c);

      /* 选中环 */
      const sr = document.createElementNS(svgNS, 'circle');
      sr.setAttribute('cx', n.x); sr.setAttribute('cy', n.y);
      sr.setAttribute('r', 3.6);
      sr.classList.add('sel-ring');
      g.appendChild(sr);

      /* 已勘察记点 */
      if (n.visited) {
        const vm2 = document.createElementNS(svgNS, 'circle');
        vm2.setAttribute('cx', n.x + 3); vm2.setAttribute('cy', n.y - 3);
        vm2.setAttribute('r', .9);
        vm2.classList.add('visited-mark');
        g.appendChild(vm2);
      }

      const t = document.createElementNS(svgNS, 'text');
      t.setAttribute('x', n.x); t.setAttribute('y', n.y + 5.6);
      t.textContent = n.unlocked ? n.name : '？？？';
      g.appendChild(t);

      const yr = document.createElementNS(svgNS, 'text');
      yr.setAttribute('x', n.x); yr.setAttribute('y', n.y + 9.2);
      yr.classList.add('yr');
      yr.textContent = n.unlocked ? n.year : '——';
      g.appendChild(yr);

      /* 预览（悬停/聚焦） + 选中 + 进入（保持原有单击进入习惯与测试兼容） */
      g.addEventListener('mouseenter', () => ctx.onPreview(n.id));
      g.addEventListener('focus', () => ctx.onPreview(n.id));
      g.addEventListener('click', () => ctx.onChoose(n.id, g));
      g.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); g.dispatchEvent(new Event('click')); }
      });
      svg.appendChild(g);
    });

    wrap.appendChild(svg);

    /* 地点预览卡（默认显示当前选中或档案馆） */
    const preview = el('div', { class: 'map-preview hidden', id: 'map-preview', 'aria-live': 'polite' });
    wrap.appendChild(preview);

    /* 图例（可折叠） */
    const lg = el('details', { class: 'map-legend' });
    lg.appendChild(el('summary', { text: '图 例' }));
    const row = (icoHtml, txt) => el('div', { class: 'lg-row' }, [
      el('span', { class: 'lg-ico', html: icoHtml }),
      el('span', { text: txt })
    ]);
    const dot = color => `<svg viewBox="0 0 20 10" width="20" height="10"><circle cx="10" cy="5" r="3" fill="#FDFBF4" stroke="${color}" stroke-width="1.4"/></svg>`;
    lg.appendChild(row(dot('#B85E52'), '可调查地点（点击进入现场）'));
    lg.appendChild(row('<svg viewBox="0 0 20 10" width="20" height="10"><circle cx="10" cy="5" r="3" fill="#F2EEE1" stroke="#A79E8A" stroke-width="1.2" stroke-dasharray="1.6 1.2"/></svg>', '尚未开放的地点'));
    lg.appendChild(row('<svg viewBox="0 0 20 10" width="20" height="10"><circle cx="10" cy="5" r="3" fill="none" stroke="#A97F26" stroke-width="1.2"/><circle cx="14" cy="2.6" r="1.4" fill="#A97F26"/></svg>', '已勘察（金点记档）'));
    lg.appendChild(row('<svg viewBox="0 0 20 10" width="20" height="10"><path d="M2 7 Q10 2 18 6" fill="none" stroke="#B85E52" stroke-width="1.2"/></svg>', '线索路线（墨水描画）'));
    lg.appendChild(row('<svg viewBox="0 0 20 10" width="20" height="10"><path d="M2 6 Q10 3 18 5" fill="none" stroke="#A97F26" stroke-width="1.6" stroke-dasharray="1.5 2.5"/></svg>', '已走访路段（金色流光）'));
    wrap.appendChild(lg);

    /* 阅览室场景图：档案馆所在的旧阅览室 */
    wrap.appendChild(el('figure', { class: 'map-room' }, [
      el('img', { src: 'assets/images/scene_reading_room.webp', alt: '旧阅览室的木桌、卷宗与窗光', loading: 'lazy', decoding: 'async', width: '1536', height: '922' }),
      el('figcaption', { class: 'mono', text: '数字档案馆 · 旧阅览室' })
    ]));

    container.appendChild(wrap);

    /* 预览卡内容由 mapSystem 在渲染后立即填充（默认选中或档案馆） */
    ctx.afterRender(svg);
  }

  LP.ui2.register('map', viewModel, render);
  LP.ui2.register('mapPreview', previewVM, previewRender);
})();
