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
    /* 卡面不再显示日期与天色 —— 那是要你自己读出来的；
       日期证据退回原件，卡面只给一个「查看原件」入口（P0 信息泄露修复） */
    const el = LP.el('div', { class: 'tl-card', draggable: 'true', 'data-id': c.id }, [
      LP.el('span', { class: 'tc-kind', text: c.kind.toUpperCase() }),
      LP.el('div', { class: 'tc-title', text: c.title }),
      LP.el('div', { class: 'tc-text', text: c.text }),
      LP.el('div', { class: 'tc-cred', text: c.cred }),
      refBtn(c)
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

  /* 「查看原件」：把玩家引到这张卡对应的原始档案
     —— 日期答案只在原件里（照片背面/折痕/编号说明），这是唯一的正当入口 */
  function refBtn(c) {
    const doc = LP.data.documents[c.refId];
    const label = doc ? '查看原件 · ' + LP.inv.sub(doc.title) : '查看原件';
    const btn = LP.el('button', {
      class: 'tc-ref mono', text: '↗ 查看原件',
      title: doc ? label : '原件缺失'
    });
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openRef(c);
    });
    btn.addEventListener('pointerdown', e => e.stopPropagation());
    return btn;
  }

  /* 打开卡片对应的原件；不在本卷 / 未解锁时给出「去问搭档」的指引 */
  function openRef(c) {
    const doc = LP.data.documents[c.refId];
    if (!doc) { LP.ui.toast('原件暂不可查。'); return; }
    LP.audio.open();
    if (!LP.archive.isUnlocked(doc)) { LP.ui.toast('这份原件还没有解锁。', 'gold'); return; }
    if (!LP.inv.docVisible(doc)) {
      const tip = c.kind === 'photo'
        ? '这张照片的原件在记录者卷里 —— 你看不到影像，让 ta 把背面写了什么念给你听。'
        : '这件文字原本在执笔者卷里 —— 你看不到正文，让 ta 念给你听。';
      LP.ui.toast(tip, 'gold');
      if (LP.duo) setTimeout(() => LP.duo.openPanel(), 320);
      return;
    }
    if (doc.type === 'photo') LP.photo.open(doc.id);
    else LP.doc.open(doc.id);
    LP.archive.markDocRead(doc);
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

  /* 分级反馈：把「哪一层推理出错」说清楚，而不是笼统报错
     —— P1「推理反馈」：分组 / 天气 / 日期 分别反馈，指向该复查的证据 */
  const FEEDBACK = {
    groups: {
      title: '① 分组未通过 · 天色分堆',
      body: '你把这些记录按日子分的堆，对不上。同一天里的记录，天色必须一致——' +
            '先别急着填日期，回头看看每张卡里关于天气的那句话，把「冷 / 晴 / 雨」重新归堆。',
      fix: '需要复查：每张卡里提到天气的那句话'
    },
    weather: {
      title: '② 天气判定未通过 · 天色下拉',
      body: '你分好的三堆没错，但给它们选的天色不对。天气有直接写明的（「倒春寒」「下着雨」），' +
            '也有要从画面推断的（合影里影子很短 → 晴）。逐堆重新判一次。',
      fix: '需要复查：直接记载 vs 画面推断'
    },
    date: {
      title: '③ 日期未通过 · 定日子',
      body: '分组和天气都对了，卡在日期上。日子不是猜的——它写在原件里：' +
            '照片背面的题字、合影折痕里的符号、编号说明的规则。' +
            '点每张卡上的「查看原件」，或听你的搭档把原件念出来。',
      fix: '需要复查：照片背题 / 折痕 / 编号说明'
    }
  };

  function feedback(container, kind) {
    const f = FEEDBACK[kind];
    LP.audio.error();
    const days = container.querySelector('.tl-days');
    if (days) LP.anim.shake(days);
    const old = container.querySelector('.tl-conflict');
    if (old) old.remove();
    container.querySelector('.tl-wrap').appendChild(LP.el('div', { class: 'tl-conflict' }, [
      LP.el('div', { class: 'tc-title', text: f.title }),
      LP.el('p', { text: f.body }),
      LP.el('div', { class: 'tc-fix mono', text: '◈ ' + f.fix })
    ]));
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
      return feedback(container, 'groups');
    }

    /* ② 天色判定 */
    if (!days.every((d, i) => tw[i] === d.weather)) {
      return feedback(container, 'weather');
    }

    /* 双人：到这里只是「我这半边」对上了 */
    if (s.mode !== 'solo') {
      LP.inv.completePuzzle('timeline_mine');
      if (!heardDates(s)) {
        LP.audio.error();
        LP.ui.toast(dateLockTip(s), 'gold');
        return feedback(container, 'date');
      }
      if (!days.every((d, i) => String(td[i] || '').trim() === d.num)) {
        return feedback(container, 'date');
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
      return feedback(container, 'date');
    }

    LP.audio.complete();
    LP.anim.flash();
    LP.inv.completePuzzle('timeline');
    render(container);
    LP.inv.checkDeductions();
  }

  /* 完成态：每个日子不仅给出结论，还给出「这条结论的来源」
     —— 玩家可以顺着来源点回原件，追溯每条关键结论的出处 */
  function showFacts(wrap) {
    LP.$$('.tl-slot', wrap).forEach((slot, i) => {
      slot.classList.add('done');
      const day = LP.data.timelineDays[i];
      if (!LP.$('.tl-slot-fact', slot)) {
        slot.appendChild(LP.el('div', { class: 'tl-slot-fact', text: day.fact }));
      }
      if (!LP.$('.tl-slot-src', slot)) {
        const src = LP.el('div', { class: 'tl-slot-src' });
        src.appendChild(LP.el('span', { class: 'tl-slot-src-k mono', text: '来源' }));
        day.accept.forEach(cid => {
          const card = LP.data.timelineCards.find(x => x.id === cid);
          if (!card) return;
          const chip = LP.el('button', {
            class: 'tl-src-chip', text: card.title,
            title: '回到这张卡对应的原件'
          });
          chip.addEventListener('click', e => { e.stopPropagation(); openRef(card); });
          src.appendChild(chip);
        });
        slot.appendChild(src);
      }
    });
  }

  /* 反向导航：从原件回到时间线，并高亮对应卡片（P1 双向导航） */
  function focusCard(cardId, container) {
    const host = container || LP.$('#wb-preview');
    if (!host) return;
    if (LP.archive.getTab() !== 'timeline') LP.archive.setTab('timeline');
    const target = LP.$(`.tl-card[data-id="${cardId}"]`, host) || LP.$(`.tl-card[data-id="${cardId}"]`);
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      target.animate([
        { boxShadow: '0 0 0 0 rgba(185,138,47,.7)' },
        { boxShadow: '0 0 0 10px rgba(185,138,47,0)' }
      ], { duration: 900, iterations: 3 });
    } else {
      LP.ui.toast('这张卡已在时间线里 —— 去「时间线」标签页查看。', 'gold');
    }
  }

  /* 卡片 id → 该卡所在的原件 id（供查看器反向导航用） */
  function cardsForDoc(docId) {
    return LP.data.timelineCards.filter(c => c.refId === docId).map(c => c.id);
  }

  return { render, openRef, focusCard, cardsForDoc };
})();
