/* ============================================================
   ui2 视图层 · 证据板
   ------------------------------------------------------------
   viewModel(state, data, ui) → vm     纯计算：节点集 / 布局 / 进度 / 推理清单
   render(vm, hosts, ctx)              DOM + 交互（拖拽 / 连线 / 位置持久化）

   边界说明（与方案 §5.3 的偏差，已在 REBUILD_REPORT 记录）：
     · viewModel 不在内部读写 LP.state —— state 由 mount 注入；
     · render 持有**视图本地状态**（连线模式、已选起点、DOM 引用、
       拖动位置持久化）与指针交互。这些不属于游戏状态，也非业务判定；
     · 判定与状态变更（建立关系、记录尝试、检出推进）通过 ctx 回传
       evidenceSystem 执行。
   ============================================================ */
(function () {

  /* ---------- 视图本地状态（会话内，不入存档） ---------- */
  const nodes = new Map();          // id -> { el, kind }
  let linkMode = false;             // 是否处于「建立关系」模式
  let selFirst = null;              // 连线模式下先选中的节点 id
  let pendingFx = [];               // 待播放的节点反馈（重建节点后施加）

  /* 节点位置持久化（独立 localStorage 键，独立于存档结构） */
  const POS_KEY = 'lp_evpos_v1';
  function loadPositions() {
    try { return JSON.parse(localStorage.getItem(POS_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function savePositions() {
    const data = {};
    nodes.forEach((n, id) => {
      if (n.el.style.left) data[id] = { left: n.el.style.left, top: n.el.style.top };
    });
    try { localStorage.setItem(POS_KEY, JSON.stringify(data)); } catch (e) { /* 忽略 */ }
  }

  const linkKey = (a, b) => [a, b].sort().join('>');
  const acceptedTypes = rule => rule.types || (rule.type ? [rule.type] : []);
  const primaryType = rule => acceptedTypes(rule)[0] || 'support';
  function typeLabel(t) {
    const r = LP.data.reasonTypes.find(x => x.key === t);
    return r ? r.label : t;
  }

  /* ---------- 纯计算 ---------- */
  function knownNode(id, s, d) {
    if (d.clues[id]) return s.discoveredEvidence.includes(id) ? { kind: 'clue', label: d.clues[id].label } : null;
    if (d.documents[id]) return s.discoveredDocuments.includes(id) ? { kind: 'doc', label: d.documents[id].title } : null;
    if (d.people[id]) {
      const p = d.people[id];
      if (!(p.known || s.discoveredPeople.includes(id))) return null;
      return { kind: 'person', label: p.code || p.name, hint: p.name };
    }
    if (d.locations[id]) return s.discoveredLocations.includes(id) ? { kind: 'doc', label: d.locations[id].name } : null;
    if (id === 'timeline') return s.completedPuzzles.includes('timeline') ? { kind: 'clue', label: '时间线已修复' } : null;
    if (id === 'page_032') return s.discoveredDocuments.includes('page_032') ? { kind: 'doc', label: 'PAGE_032' } : null;
    return null;
  }

  /* 列数封顶 6 列，行高固定，板子随行数变高 */
  function layout(count) {
    const cols = Math.max(2, Math.min(6, Math.ceil(Math.sqrt(count * 1.15))));
    const rows = Math.max(1, Math.ceil(count / cols));
    const pos = [];
    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const inRow = (r === rows - 1) ? (count - r * cols) : cols;
      pos.push({ x: ((c + 0.5) / inRow) * 84 + 8, y: ((r + 0.5) / rows) * 84 + 8 });
    }
    return { pos, rows };
  }

  /* 板上的节点 = 静态关联图的两端 ∪ 可连线关系的两端 */
  function collectVisible(s, d) {
    const visible = new Map();
    const add = id => { if (!visible.has(id)) { const m = knownNode(id, s, d); if (m) visible.set(id, m); } };
    d.evidenceGraph.forEach(e => { add(e.from); add(e.to); });
    (d.reasonRules || []).forEach(r => { add(r.from); add(r.to); });
    return visible;
  }

  /* ---------- ① view-model ---------- */
  function viewModel(s, d, ui) {
    const req = (d.reasonRequired && d.reasonRequired.act3) || [];
    const doneCount = req.filter(k => s.evidenceLinks.includes(k)).length;

    const visible = collectVisible(s, d);
    const savedPos = loadPositions();
    let list = [], rows = 1;
    if (visible.size) {
      const L = layout(visible.size);
      rows = L.rows;
      let i = 0;
      visible.forEach((meta, id) => {
        let left, top;
        if (savedPos[id]) { left = savedPos[id].left; top = savedPos[id].top; }
        else { const p = L.pos[i++]; left = p.x + '%'; top = p.y + '%'; }
        list.push({ id, kind: meta.kind, label: meta.label, hint: meta.hint || null, left, top, picked: selFirst === id });
      });
    }

    const links = (s.evidenceLinks || []).map(key => {
      const rule = d.reasonRules.find(r => r.key === key);
      if (!rule) return null;
      const t = primaryType(rule);
      return { key, type: t, typeLabel: typeLabel(t), why: rule.why };
    }).filter(Boolean);

    return {
      visible: true,
      linkMode,
      selText: selFirst ? '已选起点 —— 再点第二个节点' : '先点一个节点作为起点',
      hasSel: !!selFirst,
      total: (s.evidenceLinks || []).length,
      reqDone: doneCount,
      reqTotal: req.length,
      nodeList: list,
      rows,
      dense: visible.size > 34,
      empty: visible.size === 0,
      links
    };
  }

  /* ---------- ② render ---------- */
  function render(vm, hosts, ctx) {
    const el = LP.el;
    const container = hosts.root;
    container.innerHTML = '';
    nodes.clear();

    const wrap = el('div', { class: 'ev-wrap' });

    /* 头部 */
    wrap.appendChild(el('div', { class: 'ev-head' }, [
      el('h3', { text: '证 据 板' }),
      el('p', { text: '把能互相印证的线索连起来，并说清它们是哪种关系。节点可以拖动整理。' }),
      el('div', { class: 'ev-progress mono' }, [
        el('span', { text: '已建立的推理关系' }),
        el('b', { text: `${vm.total}` }),
        el('span', { class: 'dim', text: `　· 第三幕关键关系 ${vm.reqDone}/${vm.reqTotal}` })
      ])
    ]));

    /* 连线模式开关 */
    const bar = el('div', { class: 'ev-modebar' });
    const modeBtn = el('button', {
      class: 'btn-ghost small' + (vm.linkMode ? ' on' : ''),
      text: vm.linkMode ? '连线中 · 点击两个节点' : '＋ 建立关系'
    });
    modeBtn.addEventListener('click', () => {
      LP.audio.click();
      linkMode = !linkMode;
      selFirst = null;
      ctx.rerender();
    });
    bar.appendChild(modeBtn);
    if (vm.linkMode) {
      bar.appendChild(el('span', {
        class: 'mono dim', text: vm.selText, style: 'font-size:.68rem'
      }));
    }
    wrap.appendChild(bar);

    const board = el('div', { class: 'ev-board' });
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.classList.add('ev-lines');
    board.appendChild(svg);
    const psvg = document.createElementNS(svgNS, 'svg');
    psvg.classList.add('ev-lines', 'ev-preview-layer');
    board.appendChild(psvg);

    if (vm.empty) {
      board.appendChild(el('div', { class: 'ev-empty', text: '尚无线索 —— 去阅读资料，提取第一条线索' }));
      wrap.appendChild(board);
      container.appendChild(wrap);
      return;
    }

    if (vm.rows * 88 > 480) board.style.height = (vm.rows * 88) + 'px';
    if (vm.dense) board.classList.add('dense');

    vm.nodeList.forEach(n => {
      const node = el('div', {
        class: 'ev-node kind-' + n.kind + (n.picked ? ' picked' : ''),
        'data-id': n.id,
        title: n.hint || n.label,
        style: `left:${n.left};top:${n.top}`
      }, [
        el('span', { class: 'ev-kind', text: n.kind === 'clue' ? '线索' : n.kind === 'person' ? '人物' : '资料' }),
        el('span', { text: n.label })
      ]);
      node.addEventListener('click', () => onNodeClick(n.id, ctx));
      board.appendChild(node);
      nodes.set(n.id, { el: node, kind: n.kind });
      makeDraggable(node, board, () => drawLines(svg, false, ctx));
    });

    /* 重建后施加待播放的成败反馈 */
    pendingFx.forEach(f => nodeFx(f.id, f.cls));
    pendingFx = [];

    wrap.appendChild(board);
    wrap.appendChild(reasonLog(vm, el));
    container.appendChild(wrap);

    /* 连线预览：从已选起点跟随指针画一条虚线 */
    if (vm.linkMode) {
      const prev = document.createElementNS(svgNS, 'line');
      prev.classList.add('ev-preview');
      prev.style.display = 'none';
      psvg.appendChild(prev);
      const upd = ev => {
        if (!selFirst) { prev.style.display = 'none'; return; }
        const n = nodes.get(selFirst);
        if (!n) { prev.style.display = 'none'; return; }
        const br = board.getBoundingClientRect();
        const ra = n.el.getBoundingClientRect();
        prev.setAttribute('x1', ra.left + ra.width / 2 - br.left);
        prev.setAttribute('y1', ra.top + ra.height / 2 - br.top);
        prev.setAttribute('x2', ev.clientX - br.left);
        prev.setAttribute('y2', ev.clientY - br.top);
        prev.style.display = '';
      };
      board.addEventListener('pointermove', upd);
      board.addEventListener('pointerleave', () => { prev.style.display = 'none'; });
      board.addEventListener('pointerdown', upd);
    }
    requestAnimationFrame(() => requestAnimationFrame(() => drawLines(svg, true, ctx)));
  }

  /* 玩家连线的记录清单（可点回原件追溯依据） */
  function reasonLog(vm, el) {
    const box = el('div', { class: 'ev-log' });
    box.appendChild(el('div', { class: 'mono ev-log-title', text: '已确立的推理' }));
    if (!vm.links.length) {
      box.appendChild(el('div', { class: 'dim', text: '还没有建立任何关系。', style: 'font-size:.72rem' }));
      return box;
    }
    vm.links.forEach(l => {
      box.appendChild(el('div', { class: 'ev-log-row' }, [
        el('span', { class: 'mono ev-log-type', text: l.typeLabel }),
        el('span', { class: 'ev-log-why', text: l.why })
      ]));
    });
    return box;
  }

  /* ---------- 连线交互 ---------- */
  function onNodeClick(id, ctx) {
    if (!linkMode) { LP.audio.click(); return; }
    LP.audio.click();
    if (!selFirst) { selFirst = id; paintPicked(); return; }
    if (selFirst === id) { selFirst = null; paintPicked(); return; }
    const a = selFirst;
    const labelOf = nid => { const n = nodes.get(nid); return (n && n.el.textContent) || nid; };
    ctx.openReasonDialog(a, id, labelOf(a), labelOf(id));
  }

  function paintPicked() {
    nodes.forEach((n, id) => n.el.classList.toggle('picked', id === selFirst));
    /* 提示文案随选择变化 */
    const hint = LP.$('.ev-modebar .mono.dim');
    if (hint) hint.textContent = selFirst ? '已选起点 —— 再点第二个节点' : '先点一个节点作为起点';
  }

  /* ---------- 反馈 ---------- */
  function queueFx(id, cls) { pendingFx.push({ id, cls }); }
  function nodeFx(id, cls) {
    const n = nodes.get(id);
    if (!n) return;
    n.el.classList.remove(cls); void n.el.offsetWidth; n.el.classList.add(cls);
    if (LP.anim.after) LP.anim.after(n.el, () => n.el.classList.remove(cls), 2200);
    else setTimeout(() => n.el.classList.remove(cls), 2200);
  }

  /* ---------- 连线绘制 ---------- */
  function drawLines(svg, animate, ctx) {
    svg.innerHTML = '';
    const board = svg.parentElement;
    const W = board.clientWidth, H = board.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const svgNS = 'http://www.w3.org/2000/svg';

    function draw(a, b, cls) {
      const na = nodes.get(a), nb = nodes.get(b);
      if (!na || !nb) return;
      const ra = na.el.getBoundingClientRect(), rb = nb.el.getBoundingClientRect();
      const br = board.getBoundingClientRect();
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', ra.left + ra.width / 2 - br.left);
      line.setAttribute('y1', ra.top + ra.height / 2 - br.top);
      line.setAttribute('x2', rb.left + rb.width / 2 - br.left);
      line.setAttribute('y2', rb.top + rb.height / 2 - br.top);
      if (cls) line.setAttribute('class', cls);
      /* 关系线：以墨画方式显现（从一端"书写"到另一端） */
      if (animate && cls && cls.indexOf('linked') === 0) {
        const len = Math.hypot((ra.left - rb.left), (ra.top - rb.top)) || 100;
        line.style.strokeDasharray = String(len);
        line.style.strokeDashoffset = String(len);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          line.style.strokeDashoffset = '0';
        }));
      }
      svg.appendChild(line);
    }

    /* 静态预置关联（底图，淡） */
    LP.data.evidenceGraph.forEach(e => draw(e.from, e.to, 'pre'));

    /* 玩家建立的正确关系（高亮，带类型色） */
    const linked = (ctx.state && ctx.state.evidenceLinks) || [];
    LP.data.reasonRules.forEach(r => {
      if (linked.includes(r.key)) draw(r.from, r.to, 'linked type-' + primaryType(r));
    });
  }

  function makeDraggable(el, board, onMove) {
    let sx, sy, ox, oy, dragging = false, moved = false;
    el.addEventListener('pointerdown', e => {
      dragging = true; moved = false;
      el.classList.add('dragging');
      const br = board.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY;
      ox = r.left + r.width / 2 - br.left;
      oy = r.top + r.height / 2 - br.top;
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    el.addEventListener('pointermove', e => {
      if (!dragging) return;
      if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 4) moved = true;
      const br = board.getBoundingClientRect();
      const nx = Math.max(5, Math.min(br.width - 5, ox + e.clientX - sx));
      const ny = Math.max(5, Math.min(br.height - 5, oy + e.clientY - sy));
      el.style.left = (nx / br.width * 100) + '%';
      el.style.top = (ny / br.height * 100) + '%';
      onMove && onMove();
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('dragging');
      if (moved) { LP.audio.click(); savePositions(); }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  /* ---------- 供业务/外部调用 ---------- */
  function focusNode(id) {
    const n = nodes.get(id);
    if (!n) return;
    n.el.animate([
      { boxShadow: '0 0 0 0 rgba(142,27,27,.6)' },
      { boxShadow: '0 0 0 12px rgba(142,27,27,0)' }
    ], { duration: 900, iterations: 3 });
  }
  function resetSelection() { selFirst = null; }

  LP.ui2.register('evidence', viewModel, render);
  LP.ui2.evidence = { focusNode, queueFx, resetSelection };
})();
