/* ============================================================
   时间线系统 —— 第四幕「那一天」的交叉验证
   ============================================================ */
window.LP = window.LP || {};
LP.timeline = (function () {

  let selected = null; // 点击放置模式下选中的卡片

  function render(container) {
    container.innerHTML = '';
    const s = LP.state.get();

    if (s.act < 4) {
      container.appendChild(LP.el('div', { class: 'tl-locked' }, [
        LP.el('div', { text: '三个人，三种关于「那一天」的记忆。' }),
        LP.el('div', { text: '但在你把他们全部找齐之前，还无法开始验证。' }),
        LP.el('span', { class: 'mono', text: 'TIMELINE · LOCKED' })
      ]));
      return;
    }

    const wrap = LP.el('div', { class: 'tl-wrap timeline-wrap' });
    wrap.appendChild(LP.el('div', { class: 'tl-head' }, [
      LP.el('h3', { text: '「那一天」究竟是哪一天？' }),
      LP.el('p', { text: '把七张资料卡放进它们真正属于的日期。照片不会撒谎——用它校验人的记忆。' })
    ]));

    const placed = s.timelineNodes || {};
    const placedIds = Object.values(placed).flat();

    /* 卡牌池 */
    const pool = LP.el('div', { class: 'tl-pool' });
    LP.data.timelineCards
      .filter(c => !placedIds.includes(c.id))
      .forEach(c => pool.appendChild(cardEl(c, null, container)));
    wrap.appendChild(pool);

    /* 三日槽位 */
    const days = LP.el('div', { class: 'tl-days' });
    LP.data.timelineDays.forEach((day, i) => {
      const inSlot = placed[i] || [];
      const slot = LP.el('div', { class: 'tl-slot' + (inSlot.length ? '' : ' empty-hint'), 'data-slot': i });
      slot.appendChild(LP.el('div', { class: 'tl-slot-head' }, [
        LP.el('div', { class: 'd', text: day.day }),
        LP.el('div', { class: 'w', text: day.weather })
      ]));
      inSlot.forEach(cid => {
        const c = LP.data.timelineCards.find(x => x.id === cid);
        if (c) slot.appendChild(cardEl(c, i, container));
      });

      /* 拖拽接收 */
      slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('over'); });
      slot.addEventListener('dragleave', () => slot.classList.remove('over'));
      slot.addEventListener('drop', e => {
        e.preventDefault(); slot.classList.remove('over');
        const cid = e.dataTransfer.getData('text/plain');
        if (cid) moveCard(cid, i, container);
      });
      /* 点击放置 */
      slot.addEventListener('click', () => {
        if (selected) { const cid = selected; selected = null; moveCard(cid, i, container); }
      });

      days.appendChild(slot);
    });
    wrap.appendChild(days);

    /* 操作区 */
    const actions = LP.el('div', { class: 'tl-actions' });
    actions.appendChild(LP.el('button', {
      class: 'btn-primary', text: '交叉验证',
      onclick: () => validate(container)
    }));
    actions.appendChild(LP.el('button', {
      class: 'btn-ghost', text: '全部取回',
      onclick: () => { LP.state.set({ timelineNodes: {} }); LP.audio.click(); render(container); }
    }));
    wrap.appendChild(actions);

    if (s.completedPuzzles.includes('timeline')) showFacts(wrap);
    container.appendChild(wrap);
  }

  function cardEl(c, slotIdx, container) {
    const el = LP.el('div', { class: 'tl-card', draggable: 'true', 'data-id': c.id }, [
      LP.el('span', { class: 'tc-kind', text: c.kind.toUpperCase() }),
      LP.el('span', { class: 'tc-weather', text: c.weather }),
      LP.el('div', { class: 'tc-title', text: c.title }),
      LP.el('div', { class: 'tc-text', text: c.text }),
      LP.el('div', { class: 'tc-cred', text: c.cred })
    ]);
    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', c.id);
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
    el.addEventListener('click', e => {
      e.stopPropagation();
      LP.audio.click();
      if (slotIdx != null) {
        // 已在槽位 → 点击取回卡牌池
        moveCard(c.id, null, container);
      } else {
        selected = (selected === c.id) ? null : c.id;
        LP.$$('.tl-card').forEach(x => x.style.outline = '');
        if (selected) el.style.outline = '2px solid var(--gold)';
      }
    });
    return el;
  }

  function moveCard(cid, slotIdx, container) {
    const nodes = JSON.parse(JSON.stringify(LP.state.get().timelineNodes || {}));
    // 先移除旧位置
    Object.keys(nodes).forEach(k => {
      nodes[k] = nodes[k].filter(x => x !== cid);
    });
    if (slotIdx != null) {
      nodes[slotIdx] = nodes[slotIdx] || [];
      nodes[slotIdx].push(cid);
    }
    LP.state.set({ timelineNodes: nodes });
    LP.audio.paper();
    render(container);
  }

  function validate(container) {
    const placed = LP.state.get().timelineNodes || {};
    const total = Object.values(placed).flat().length;
    if (total < LP.data.timelineCards.length) {
      LP.audio.error();
      LP.ui.toast('还有资料卡没有放入时间线', 'red');
      return;
    }
    const ok = LP.data.timelineDays.every((day, i) => {
      const inSlot = (placed[i] || []).slice().sort();
      const want = day.accept.slice().sort();
      return inSlot.length === want.length && inSlot.every((x, j) => x === want[j]);
    });
    if (!ok) {
      LP.audio.error();
      LP.anim.shake(container.querySelector('.tl-days'));
      const old = container.querySelector('.tl-conflict');
      old && old.remove();
      container.querySelector('.tl-wrap').appendChild(LP.el('div', {
        class: 'tl-conflict',
        text: '时间线存在矛盾——主观记忆会偏移，照片不会。重新检查每一张卡的日期与天气。'
      }));
      return;
    }
    // 验证通过
    LP.audio.complete();
    LP.anim.flash();
    LP.inv.completePuzzle('timeline');
    render(container);
    LP.inv.checkDeductions();
  }

  function showFacts(wrap) {
    LP.$$('.tl-slot', wrap).forEach((slot, i) => {
      slot.classList.add('done');
      if (!LP.$('.tl-slot-fact', slot)) {
        slot.appendChild(LP.el('div', { class: 'tl-slot-fact', text: LP.data.timelineDays[i].fact }));
      }
    });
  }

  return { render };
})();
