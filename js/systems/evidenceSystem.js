/* ============================================================
   证据板系统 —— 已发现线索的可视化关联网络（可拖拽）
   ============================================================ */
window.LP = window.LP || {};
LP.evidence = (function () {

  const nodes = new Map(); // id -> {el,x,y,kind,label}

  function knownNode(id) {
    const s = LP.state.get();
    if (LP.data.clues[id]) return s.discoveredEvidence.includes(id) ?
      { kind: 'clue', label: LP.data.clues[id].label } : null;
    if (LP.data.documents[id]) return s.discoveredDocuments.includes(id) ?
      { kind: 'doc', label: LP.data.documents[id].title } : null;
    if (LP.data.people[id]) {
      const p = LP.data.people[id];
      return (p.known || s.discoveredPeople.includes(id)) ? { kind: 'person', label: p.name } : null;
    }
    if (LP.data.locations[id]) return s.discoveredLocations.includes(id) ?
      { kind: 'doc', label: LP.data.locations[id].name } : null;
    if (id === 'timeline') return s.completedPuzzles.includes('timeline') ?
      { kind: 'clue', label: '时间线已修复' } : null;
    if (id === 'page_032') return s.discoveredDocuments.includes('page_032') ?
      { kind: 'doc', label: 'PAGE_032' } : null;
    return null;
  }

  /* 均匀网格布局：保证所有节点完整可见、不贴边不重叠 */
  function gridPositions(count) {
    const cols = Math.ceil(Math.sqrt(count * 1.5)); // 横向偏多，贴合宽板
    const rows = Math.ceil(count / cols);
    const pos = [];
    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const rowCols = (r === rows - 1) ? (count - r * cols) : cols; // 末行可能不满
      pos.push({
        x: ((c + 0.5) / rowCols) * 80 + 10,   // 横向 10% ~ 90%
        y: ((r + 0.5) / rows) * 72 + 14       // 纵向 14% ~ 86%
      });
    }
    return pos;
  }

  function render(container) {
    container.innerHTML = '';
    nodes.clear();
    const wrap = LP.el('div', { class: 'ev-wrap' });
    wrap.appendChild(LP.el('div', { class: 'ev-head' }, [
      LP.el('h3', { text: '证 据 板' }),
      LP.el('p', { text: '已发现的线索与它们的关联。节点可以拖动整理。' })
    ]));
    const board = LP.el('div', { class: 'ev-board' });
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.classList.add('ev-lines');
    board.appendChild(svg);

    /* 收集可见节点 */
    const visible = new Map();
    LP.data.evidenceGraph.forEach(e => {
      const a = knownNode(e.from), b = knownNode(e.to);
      if (a) visible.set(e.from, a);
      if (b) visible.set(e.to, b);
    });

    if (!visible.size) {
      board.appendChild(LP.el('div', { class: 'ev-empty', text: '尚无线索 —— 去阅读资料，提取第一条线索' }));
      wrap.appendChild(board);
      container.appendChild(wrap);
      return;
    }

    const positions = gridPositions(visible.size);
    let i = 0;
    visible.forEach((meta, id) => {
      const pos = positions[i++];
      const el = LP.el('div', {
        class: 'ev-node kind-' + meta.kind,
        'data-id': id,
        style: `left:${pos.x}%;top:${pos.y}%`
      }, [
        LP.el('span', { class: 'ev-kind', text: meta.kind === 'clue' ? '线索' : meta.kind === 'person' ? '人物' : '资料' }),
        LP.el('span', { text: meta.label })
      ]);
      board.appendChild(el);
      nodes.set(id, { el, kind: meta.kind });
      makeDraggable(el, board, () => drawLines(svg));
    });

    wrap.appendChild(board);
    container.appendChild(wrap);
    requestAnimationFrame(() => drawLines(svg));
  }

  function drawLines(svg) {
    svg.innerHTML = '';
    const board = svg.parentElement;
    const W = board.clientWidth, H = board.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const svgNS = 'http://www.w3.org/2000/svg';
    LP.data.evidenceGraph.forEach(e => {
      const a = nodes.get(e.from), b = nodes.get(e.to);
      if (!a || !b) return;
      const ra = a.el.getBoundingClientRect(), rb = b.el.getBoundingClientRect();
      const br = board.getBoundingClientRect();
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', ra.left + ra.width / 2 - br.left);
      line.setAttribute('y1', ra.top + ra.height / 2 - br.top);
      line.setAttribute('x2', rb.left + rb.width / 2 - br.left);
      line.setAttribute('y2', rb.top + rb.height / 2 - br.top);
      svg.appendChild(line);
    });
  }

  function makeDraggable(el, board, onMove) {
    let sx, sy, ox, oy, dragging = false;
    el.addEventListener('pointerdown', e => {
      dragging = true;
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
      const br = board.getBoundingClientRect();
      const nx = Math.max(5, Math.min(br.width - 5, ox + e.clientX - sx));
      const ny = Math.max(5, Math.min(br.height - 5, oy + e.clientY - sy));
      el.style.left = (nx / br.width * 100) + '%';
      el.style.top = (ny / br.height * 100) + '%';
      onMove && onMove();
    });
    el.addEventListener('pointerup', () => { dragging = false; LP.audio.click(); });
  }

  function focusNode(id) {
    const n = nodes.get(id);
    if (!n) return;
    n.el.animate([
      { boxShadow: '0 0 0 0 rgba(142,27,27,.6)' },
      { boxShadow: '0 0 0 12px rgba(142,27,27,0)' }
    ], { duration: 900, iterations: 3 });
  }

  return { render, focusNode };
})();
