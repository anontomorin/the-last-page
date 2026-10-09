/* ============================================================
   证据板系统 —— 已发现线索的可视化关联网络
   ------------------------------------------------------------
   v4（P0 主动推理）：
     · 节点可拖动整理（保留）
     · 玩家「亲自连线」：点两个节点 → 选关系类型 →（可写理由、挂依据）
       → 系统判定。连对记入 state.evidenceLinks，连错给出分层反馈。
     · 主线（第三幕）要求玩家至少连出规定数量的正确关系。
   ============================================================ */
window.LP = window.LP || {};
LP.evidence = (function () {

  const nodes = new Map();   // id -> {el,x,y,kind,label}
  let selFirst = null;       // 连线模式下先选中的节点 id
  let linkMode = false;      // 是否处于「建立关系」模式

  function s() { return LP.state.get(); }

  /* ---------- 节点可见性 ---------- */
  function knownNode(id) {
    const st = s();
    if (LP.data.clues[id]) return st.discoveredEvidence.includes(id) ?
      { kind: 'clue', label: LP.data.clues[id].label } : null;
    if (LP.data.documents[id]) return st.discoveredDocuments.includes(id) ?
      { kind: 'doc', label: LP.data.documents[id].title } : null;
    if (LP.data.people[id]) {
      const p = LP.data.people[id];
      return (p.known || st.discoveredPeople.includes(id)) ? { kind: 'person', label: p.name } : null;
    }
    if (LP.data.locations[id]) return st.discoveredLocations.includes(id) ?
      { kind: 'doc', label: LP.data.locations[id].name } : null;
    if (id === 'timeline') return st.completedPuzzles.includes('timeline') ?
      { kind: 'clue', label: '时间线已修复' } : null;
    if (id === 'page_032') return st.discoveredDocuments.includes('page_032') ?
      { kind: 'doc', label: 'PAGE_032' } : null;
    return null;
  }

  /* 已建立的正确关系（玩家连出的） */
  function linkKey(a, b) { return [a, b].sort().join('>'); }
  function isLinked(a, b) { return s().evidenceLinks.includes(linkKey(a, b)); }

  /* ---------- 布局 ---------- */
  function gridPositions(count) {
    const cols = Math.ceil(Math.sqrt(count * 1.5));
    const rows = Math.ceil(count / cols);
    const pos = [];
    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const rowCols = (r === rows - 1) ? (count - r * cols) : cols;
      pos.push({
        x: ((c + 0.5) / rowCols) * 80 + 10,
        y: ((r + 0.5) / rows) * 72 + 14
      });
    }
    return pos;
  }

  /* 把玩家已建立的关系也纳入可见性：关系两端一出现就显示 */
  function collectVisible() {
    const visible = new Map();
    LP.data.evidenceGraph.forEach(e => {
      const a = knownNode(e.from), b = knownNode(e.to);
      if (a) visible.set(e.from, a);
      if (b) visible.set(e.to, b);
    });
    return visible;
  }

  /* ---------- 渲染 ---------- */
  function render(container) {
    container.innerHTML = '';
    nodes.clear();
    selFirst = null;
    const wrap = LP.el('div', { class: 'ev-wrap' });

    const st = s();
    const req = LP.data.reasonRequired.act3;
    const doneCount = req.filter(k => st.evidenceLinks.includes(k)).length;

    wrap.appendChild(LP.el('div', { class: 'ev-head' }, [
      LP.el('h3', { text: '证 据 板' }),
      LP.el('p', { text: '把能互相印证的线索连起来，并说清它们是哪种关系。节点可以拖动整理。' }),
      LP.el('div', { class: 'ev-progress mono' }, [
        LP.el('span', { text: '已建立的推理关系' }),
        LP.el('b', { text: `${st.evidenceLinks.length}` }),
        LP.el('span', { class: 'dim', text: `　· 第三幕关键关系 ${doneCount}/${req.length}` })
      ])
    ]));

    /* 连线模式开关 */
    const bar = LP.el('div', { class: 'ev-modebar' });
    const modeBtn = LP.el('button', {
      class: 'btn-ghost small' + (linkMode ? ' on' : ''),
      text: linkMode ? '连线中 · 点击两个节点' : '＋ 建立关系'
    });
    modeBtn.addEventListener('click', () => { LP.audio.click(); linkMode = !linkMode; render(container); });
    bar.appendChild(modeBtn);
    if (linkMode) {
      bar.appendChild(LP.el('span', {
        class: 'mono dim', text: selFirst ? '已选起点 —— 再点第二个节点' : '先点一个节点作为起点',
        style: 'font-size:.68rem'
      }));
    }
    wrap.appendChild(bar);

    const board = LP.el('div', { class: 'ev-board' });
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.classList.add('ev-lines');
    board.appendChild(svg);

    const visible = collectVisible();
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
        class: 'ev-node kind-' + meta.kind + (selFirst === id ? ' picked' : ''),
        'data-id': id,
        style: `left:${pos.x}%;top:${pos.y}%`
      }, [
        LP.el('span', { class: 'ev-kind', text: meta.kind === 'clue' ? '线索' : meta.kind === 'person' ? '人物' : '资料' }),
        LP.el('span', { text: meta.label })
      ]);
      el.addEventListener('click', () => onNodeClick(id, container));
      board.appendChild(el);
      nodes.set(id, { el, kind: meta.kind });
      makeDraggable(el, board, () => drawLines(svg));
    });

    wrap.appendChild(board);
    /* 已建立的推理记录 */
    wrap.appendChild(reasonLog(container));
    container.appendChild(wrap);
    requestAnimationFrame(() => drawLines(svg));
  }

  /* 玩家连线的记录清单（可点回原件追溯依据） */
  function reasonLog(container) {
    const st = s();
    const box = LP.el('div', { class: 'ev-log' });
    box.appendChild(LP.el('div', { class: 'mono ev-log-title', text: '已确立的推理' }));
    if (!st.evidenceLinks.length) {
      box.appendChild(LP.el('div', { class: 'dim', text: '还没有建立任何关系。', style: 'font-size:.72rem' }));
      return box;
    }
    st.evidenceLinks.forEach(key => {
      const rule = LP.data.reasonRules.find(r => r.key === key);
      if (!rule) return;
      const row = LP.el('div', { class: 'ev-log-row' });
      row.appendChild(LP.el('span', { class: 'mono ev-log-type', text: typeLabel(rule.type) }));
      row.appendChild(LP.el('span', { class: 'ev-log-why', text: rule.why }));
      box.appendChild(row);
    });
    return box;
  }

  function typeLabel(t) {
    const r = LP.data.reasonTypes.find(x => x.key === t);
    return r ? r.label : t;
  }

  /* ---------- 连线交互 ---------- */
  function onNodeClick(id, container) {
    if (!linkMode) { LP.audio.click(); return; }
    LP.audio.click();
    if (!selFirst) {
      selFirst = id;
      highlight(container);
      return;
    }
    if (selFirst === id) { selFirst = null; highlight(container); return; }
    openReasonDialog(selFirst, id, container);
  }

  function highlight(container) {
    LP.$$('.ev-node', container).forEach(el => {
      el.classList.toggle('picked', el.dataset.id === selFirst);
    });
  }

  /* 关系选择对话框：类型 + 理由（可选）+ 依据原件（可选） */
  function openReasonDialog(a, b, container) {
    const labelA = (nodes.get(a) && nodes.get(a).el.textContent) || a;
    const labelB = (nodes.get(b) && nodes.get(b).el.textContent) || b;
    const overlay = LP.el('div', { class: 'ev-overlay' });
    const panel = LP.el('div', { class: 'ev-dialog' });
    panel.appendChild(LP.el('div', { class: 'mono ev-dialog-head', text: 'ESTABLISH RELATION · 建立关系' }));
    panel.appendChild(LP.el('div', { class: 'ev-dialog-pair' }, [
      LP.el('span', { class: 'ev-chip', text: labelA }),
      LP.el('span', { class: 'ev-arrow', text: '↔' }),
      LP.el('span', { class: 'ev-chip', text: labelB })
    ]));
    panel.appendChild(LP.el('p', {
      class: 'ev-dialog-tip serif',
      text: '这两条记录之间是什么关系？选一种，再说清你的理由。'
    }));

    let pickedType = null;
    const typeRow = LP.el('div', { class: 'ev-types' });
    LP.data.reasonTypes.forEach(t => {
      const btn = LP.el('button', { class: 'ev-type', title: t.desc }, [
        LP.el('b', { text: t.label }),
        LP.el('span', { text: t.desc })
      ]);
      btn.addEventListener('click', () => {
        LP.audio.click();
        pickedType = t.key;
        LP.$$('.ev-type', typeRow).forEach(x => x.classList.remove('on'));
        btn.classList.add('on');
      });
      typeRow.appendChild(btn);
    });
    panel.appendChild(typeRow);

    const why = LP.el('textarea', { class: 'ev-why', rows: '2', placeholder: '你的理由（选填）——比如「名字与人对上了」' });
    panel.appendChild(why);

    const acts = LP.el('div', { class: 'ev-dialog-acts' });
    acts.appendChild(LP.el('button', {
      class: 'btn-primary', text: '确认建立',
      onclick: () => {
        if (!pickedType) { LP.audio.error(); LP.ui.toast('先选一种关系类型。', 'red'); return; }
        overlay.remove();
        attemptLink(a, b, pickedType, why.value.trim(), container);
      }
    }));
    acts.appendChild(LP.el('button', { class: 'btn-ghost', text: '取消', onclick: () => { LP.audio.click(); overlay.remove(); } }));
    panel.appendChild(acts);

    overlay.appendChild(panel);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  /* 判定：连对记入 evidenceLinks；连错给出分层反馈 */
  function attemptLink(a, b, type, why, container) {
    const st = s();
    const key = linkKey(a, b);

    /* 已经建立过 */
    if (st.evidenceLinks.includes(key)) {
      LP.ui.toast('这条关系已经建立过了。', 'gold');
      selFirst = null; render(container); return;
    }

    /* 查找规则：先按 key 归一化，再按 from/to + type 匹配 */
    const rule = LP.data.reasonRules.find(r => r.key === key)
      || LP.data.reasonRules.find(r => linkKey(r.from, r.to) === key && r.type === type);

    if (rule && rule.type === type) {
      /* 连对 */
      LP.state.addTo('evidenceLinks', rule.key);
      LP.audio.complete();
      LP.anim.flash();
      LP.ui.toast('推理成立：' + rule.why, 'gold');
      selFirst = null;
      render(container);
      LP.inv.checkDeductions();
      return;
    }

    /* 两端之间存在正确关系，但类型选错了 */
    const rightRule = LP.data.reasonRules.find(r => linkKey(r.from, r.to) === key);
    if (rightRule) {
      LP.audio.error();
      LP.ui.toast(
        `这两者之间确实有关系，但你想的不是「${typeLabel(type)}」——再从它们各自说了什么想一想。`,
        'red'
      );
      recordTrial(a, b, type, rightRule.key);
      selFirst = null; render(container);
      return;
    }

    /* 完全不成立 */
    LP.audio.error();
    LP.anim.shake(LP.$('.ev-board', container));
    LP.ui.toast('这两条记录之间，暂时找不到能彼此印证的关联。', 'red');
    recordTrial(a, b, type, null);
    selFirst = null; render(container);
  }

  function recordTrial(a, b, type, matched) {
    const trials = (s().evidenceTrials || []).slice();
    trials.push({ key: linkKey(a, b), type, matched, at: Date.now() });
    LP.state.set({ evidenceTrials: trials.slice(-40) });
  }

  /* ---------- 连线绘制 ---------- */
  function drawLines(svg) {
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
      svg.appendChild(line);
    }

    /* 静态预置关联（底图，淡） */
    LP.data.evidenceGraph.forEach(e => draw(e.from, e.to, 'pre'));

    /* 玩家建立的正确关系（高亮，带类型色） */
    LP.data.reasonRules.forEach(r => {
      if (s().evidenceLinks.includes(r.key)) draw(r.from, r.to, 'linked type-' + r.type);
    });
  }

  function makeDraggable(el, board, onMove) {
    let sx, sy, ox, oy, dragging = false, moved = false;
    el.addEventListener('pointerdown', e => {
      dragging = true; moved = false;
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
    el.addEventListener('pointerup', () => { dragging = false; if (moved) LP.audio.click(); });
  }

  function focusNode(id) {
    const n = nodes.get(id);
    if (!n) return;
    n.el.animate([
      { boxShadow: '0 0 0 0 rgba(142,27,27,.6)' },
      { boxShadow: '0 0 0 12px rgba(142,27,27,0)' }
    ], { duration: 900, iterations: 3 });
  }

  return { render, focusNode, isLinked, linkKey, typeLabel };
})();
