/* ============================================================
   时间线系统 —— 第四幕「那一天」的交叉验证
   ------------------------------------------------------------
   玩法（v3）：
     ① 按「天色」把资料分成三堆（冷 / 晴 / 雨）—— 卡面不写天气，要自己读
     ② 给每一堆定日子 —— 日期只在照片背面与李禾的编号说明里
   双人：双方交换各自的来源与解释，交叉核实日期和天气后才算修复
   ============================================================ */
window.LP = window.LP || {};
LP.timeline = (function () {

  let selected = null; // 点击放置模式下选中的卡片
  const CN_NUM = ['一', '二', '三'];

  /* 本方可用的卡（双人按卷别过滤：A=文字，B=影像） */
  function myCards(s) {
    return LP.data.timelineCards.filter(c => {
      if (s.mode === 'solo') return true;
      const isVisual = c.kind === 'photo';
      return s.mode === 'B' ? isVisual : !isVisual;
    });
  }

  /* 双人：是否已听取并记录对方的证据来源说明 */
  function heardDates(s) {
    return s.mode === 'A'
      ? s.completedPuzzles.includes('duo_tl_photo')
      : s.completedPuzzles.includes('duo_tl_text');
  }
  function dateLockTip(s) {
    return s.mode === 'A'
      ? '先和记录者核对照片、折痕与画面各自提供了什么证据，再填写日期。'
      : '先和执笔者核对纸面日期、天气与无日期的离开回忆，再填写日期。';
  }

  function render(container) {
    container.innerHTML = '';
    const s = LP.state.get();

    if (s.act < 4) {
      container.appendChild(LP.el('div', { class: 'tl-locked' }, [
        LP.el('div', { text: '异常索引已经标出倒春寒、晴天和雨天三种冲突。' }),
        LP.el('div', { text: '找齐四个人的记录后，再验证它们是否属于同一天。' }),
        LP.el('span', { class: 'mono', text: 'TIMELINE · LOCKED' })
      ]));
      return;
    }

    const wrap = LP.el('div', { class: 'tl-wrap timeline-wrap' });
    wrap.appendChild(LP.el('div', { class: 'tl-head' }, [
      LP.el('h3', { text: '「那一天」究竟是哪一天？' }),
      LP.el('p', {
        text: '档案索引把几份记录归入同一事件，但开局就标出了天气冲突。'
      }),
      LP.el('p', {
        text: '现在要核实每条证据的来源：先按天色分堆，再用日期与原件交叉确认。'
      })
    ]));

    const placed = s.timelineNodes || {};
    const placedIds = Object.values(placed).flat();
    const cards = myCards(s);

    /* 卡牌池 */
    const pool = LP.el('div', { class: 'tl-pool' });
    cards.filter(c => !placedIds.includes(c.id))
      .forEach(c => pool.appendChild(cardEl(c, null, container)));
    wrap.appendChild(pool);

    /* 双人提示条 */
    if (s.mode !== 'solo') {
      const roleText = s.mode === 'A'
        ? '纸页给出部分日期与天气，照片提供另一种记录；先核对每条证据的来源。'
        : '照片背题、折痕与画面各自提供不同线索；纸面记录能帮助判断这些线索指向什么。';
      wrap.appendChild(LP.el('div', { class: 'tl-duo-tip mono', text: '◈ ' + roleText }));
    }

    /* 三日槽位 */
    const days = LP.el('div', { class: 'tl-days' });
    const tw = s.tlWeather || ['', '', ''];
    const td = s.tlDate || ['', '', ''];
    const done = s.completedPuzzles.includes('timeline');

    LP.data.timelineDays.forEach((day, i) => {
      const inSlot = placed[i] || [];
      const slot = LP.el('div', { class: 'tl-slot' + (inSlot.length ? '' : ' empty-hint'), 'data-slot': i });

      /* 槽位头 */
      const head = LP.el('div', { class: 'tl-slot-head' }, [
        LP.el('div', { class: 'd', text: done ? day.day : '第 ' + CN_NUM[i] + ' 日' }),
        done ? LP.el('div', { class: 'w', text: LP.data.weatherLabel(day.weather) }) : null
      ]);
      slot.appendChild(head);

      /* 天色 / 日期 */
      if (!done) slot.appendChild(metaEl(i, tw, td, s, container));

      inSlot.forEach(cid => {
        const c = LP.data.timelineCards.find(x => x.id === cid);
        if (c) slot.appendChild(cardEl(c, i, container));
      });

      // 双人：显示"属于对方"的卡位占位
      if (s.mode !== 'solo') {
        const otherCards = day.accept.filter(cid => {
          const c = LP.data.timelineCards.find(x => x.id === cid);
          const isVisual = c && c.kind === 'photo';
          return s.mode === 'B' ? !isVisual : isVisual;
        });
        otherCards.forEach(cid => {
          const c = LP.data.timelineCards.find(x => x.id === cid);
          slot.appendChild(LP.el('div', { class: 'tl-card tl-ghost' }, [
            LP.el('div', { class: 'tc-title', text: c ? c.title : '？' }),
            LP.el('div', { class: 'tc-text', text: s.mode === 'A' ? '在记录者手里' : '在执笔者手里' })
          ]));
        });
      }

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
    if (!done) {
      actions.appendChild(LP.el('button', {
        class: 'btn-primary', text: '交叉验证',
        onclick: () => validate(container)
      }));
      actions.appendChild(LP.el('button', {
        class: 'btn-ghost', text: '全部取回',
        onclick: () => { LP.state.set({ timelineNodes: {} }); LP.audio.click(); render(container); }
      }));
    }
    wrap.appendChild(actions);

    if (done) showFacts(wrap);
    container.appendChild(wrap);
  }

  /* 槽位上的「天色 / 日期」两个待填项 */
  function metaEl(i, tw, td, s, container) {
    const locked = s.mode !== 'solo' && !heardDates(s);
    const box = LP.el('div', { class: 'tl-meta' });

    /* 天色 */
    const selWrap = LP.el('label', { class: 'tl-meta-cell' }, [
      LP.el('span', { class: 'tl-meta-k mono', text: '天色' })
    ]);
    const sel = document.createElement('select');
    sel.className = 'tl-sel';
    sel.appendChild(new Option('？', ''));
    LP.data.timelineWeather.forEach(w => sel.appendChild(new Option(w.label, w.key)));
    sel.value = tw[i] || '';
    sel.addEventListener('change', () => {
      const arr = (LP.state.get().tlWeather || ['', '', '']).slice();
      arr[i] = sel.value;
      LP.state.set({ tlWeather: arr });
      LP.audio.click();
    });
    selWrap.appendChild(sel);
    box.appendChild(selWrap);

    /* 日期 */
    const dWrap = LP.el('label', { class: 'tl-meta-cell' }, [
      LP.el('span', { class: 'tl-meta-k mono', text: '日期' })
    ]);
    const row = LP.el('div', { class: 'tl-date-row' });
    const inp = LP.el('input', {
      class: 'tl-date-in mono', type: 'text', maxlength: '2',
      placeholder: locked ? '——' : '？', value: td[i] || ''
    });
    if (locked) inp.setAttribute('disabled', '');
    inp.addEventListener('input', () => {
      const arr = (LP.state.get().tlDate || ['', '', '']).slice();
      arr[i] = inp.value;
      LP.state.set({ tlDate: arr });
    });
    row.appendChild(inp);
    row.appendChild(LP.el('span', { class: 'tl-date-unit mono', text: '日' }));
    dWrap.appendChild(row);
    box.appendChild(dWrap);

    if (locked) {
      box.appendChild(LP.el('div', { class: 'tl-meta-lock mono', text: '（先完成双卷证据核对）' }));
    }
    return box;
  }

  function cardEl(c, slotIdx, container) {
    /* 卡面不再显示日期与天色 —— 那是要你自己读出来的 */
    const el = LP.el('div', { class: 'tl-card', draggable: 'true', 'data-id': c.id }, [
      LP.el('span', { class: 'tc-kind', text: c.kind.toUpperCase() }),
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
    Object.keys(nodes).forEach(k => { nodes[k] = nodes[k].filter(x => x !== cid); });
    if (slotIdx != null) {
      nodes[slotIdx] = nodes[slotIdx] || [];
      nodes[slotIdx].push(cid);
    }
    LP.state.set({ timelineNodes: nodes });
    LP.audio.paper();
    render(container);
  }

  function conflict(container, text) {
    LP.audio.error();
    LP.anim.shake(container.querySelector('.tl-days'));
    const old = container.querySelector('.tl-conflict');
    if (old) old.remove();
    container.querySelector('.tl-wrap').appendChild(LP.el('div', { class: 'tl-conflict', text }));
  }

  function validate(container) {
    const s = LP.state.get();
    const placed = s.timelineNodes || {};
    const tw = s.tlWeather || ['', '', ''];
    const td = s.tlDate || ['', '', ''];
    const days = LP.data.timelineDays;
    const cards = myCards(s);

    const placedAll = Object.values(placed).flat();
    if (placedAll.length < cards.length) {
      LP.audio.error();
      LP.ui.toast('你手里的卡还没有全部放入', 'red');
      return;
    }

    /* ① 分堆：同一天的记录，天色必须一致 */
    const groupsOK = days.every((d, i) => {
      const inSlot = (placed[i] || []).slice().sort();
      const want = d.accept.filter(cid => cards.some(m => m.id === cid)).slice().sort();
      return inSlot.length === want.length && inSlot.every((x, j) => x === want[j]);
    });
    if (!groupsOK) {
      return conflict(container, '同一天里的天色对不上 —— 有记录放错了日子。');
    }

    /* ② 天色判定 */
    if (!days.every((d, i) => tw[i] === d.weather)) {
      return conflict(container, '天色判定与证据对不上 —— 再读一遍每张卡里关于天气的那句话。');
    }

    /* 双人：到这里只是「我这半边」对上了 */
    if (s.mode !== 'solo') {
      LP.inv.completePuzzle('timeline_mine');
      if (!heardDates(s)) {
        LP.audio.error();
        LP.ui.toast(dateLockTip(s), 'gold');
        return conflict(container, dateLockTip(s));
      }
      if (!days.every((d, i) => String(td[i] || '').trim() === d.num)) {
        return conflict(container, '日期与证据对不上 —— 日子是从证据里读出来的，不是猜出来的。');
      }
      LP.audio.complete();
      LP.anim.flash();
      LP.inv.completePuzzle('timeline');
      render(container);
      LP.inv.checkDeductions();
      return;
    }

    /* 单人：还要定日子 */
    if (!days.every((d, i) => String(td[i] || '').trim() === d.num)) {
      return conflict(container, '日期与照片背面的编号对不上 —— 日子是从证据里读出来的，不是猜出来的。');
    }

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
