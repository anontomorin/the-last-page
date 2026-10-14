/* ============================================================
   ui2 视图层 · 时间线（先分组 · 再定日期 · 交叉验证）
   ------------------------------------------------------------
   viewModel(state, data, ui) → vm   纯计算：池 / 三日槽位 / 元信息 / 完成态
   render(vm, hosts, ctx)            DOM + 交互（拖放 / 点选放置 / 输入）

   边界：`selected`（点选放置的当前卡）与拖拽是**视图本地状态**；
   state 变更（tlWeather / tlDate / timelineNodes）与校验判定通过 ctx
   回桥 timelineSystem。
   ============================================================ */
(function () {

  let selected = null;                    // 点击放置模式下选中的卡片
  const CN_NUM = ['一', '二', '三'];

  /* ---------- 纯计算 ---------- */
  function myCards(s, d) {
    return d.timelineCards.filter(c => {
      if (s.mode === 'solo') return true;
      const isVisual = c.kind === 'photo';
      return s.mode === 'B' ? isVisual : !isVisual;
    });
  }
  function heardDates(s) {
    return s.mode === 'A'
      ? s.completedPuzzles.includes('duo_tl_photo')
      : s.completedPuzzles.includes('duo_tl_text');
  }

  /* ---------- ① view-model ---------- */
  function viewModel(s, d, ui) {
    const done = s.completedPuzzles.includes('timeline');
    const placed = s.timelineNodes || {};
    const placedIds = Object.values(placed).flat();
    const cards = myCards(s, d);
    const tw = s.tlWeather || ['', '', ''];
    const td = s.tlDate || ['', '', ''];
    const heard = heardDates(s);

    const toVM = c => ({
      id: c.id, kind: c.kind, kindLabel: String(c.kind).toUpperCase(),
      title: c.title, text: c.text, cred: c.cred,
      refLabel: d.documents[c.refId] ? LP.inv.sub(d.documents[c.refId].title, s) : '查看原件'
    });

    return {
      visible: true,
      locked: (s.act || 0) < 4,
      done,
      duoTip: s.mode === 'solo' ? null
        : (s.mode === 'A'
          ? '纸页给出部分日期与天气，照片提供另一种记录；先核对每条证据的来源。'
          : '照片背题、折痕与画面各自提供不同线索；纸面记录能帮助判断这些线索指向什么。'),
      lockTip: s.mode === 'A'
        ? '先和记录者核对照片、折痕与画面各自提供了什么证据，再填写日期。'
        : '先和执笔者核对纸面日期、天气与无日期的离开回忆，再填写日期。',
      pool: cards.filter(c => !placedIds.includes(c.id)).map(toVM),
      weatherOpts: d.timelineWeather.map(w => ({ key: w.key, label: w.label })),
      days: d.timelineDays.map((day, i) => {
        const inSlot = placed[i] || [];
        const ghosts = s.mode === 'solo' ? [] : day.accept.filter(cid => {
          const c = d.timelineCards.find(x => x.id === cid);
          const isVisual = c && c.kind === 'photo';
          return s.mode === 'B' ? !isVisual : isVisual;
        }).map(cid => {
          const c = d.timelineCards.find(x => x.id === cid);
          return { title: c ? c.title : '？', text: s.mode === 'A' ? '在记录者手里' : '在执笔者手里' };
        });
        return {
          index: i,
          label: done ? day.day : '第 ' + CN_NUM[i] + ' 日',
          weatherLabel: done ? d.weatherLabel(day.weather) : null,
          meta: done ? null : { weather: tw[i] || '', date: td[i] || '', locked: s.mode !== 'solo' && !heard },
          cards: inSlot.map(cid => d.timelineCards.find(x => x.id === cid)).filter(Boolean).map(toVM),
          ghosts,
          fact: done ? day.fact : null,
          sources: done ? day.accept
            .map(cid => d.timelineCards.find(x => x.id === cid))
            .filter(Boolean)
            .map(c => ({ id: c.id, title: c.title })) : []
        };
      })
    };
  }

  /* ---------- ② render ---------- */
  function render(vm, hosts, ctx) {
    const el = LP.el;
    const container = hosts.root;
    container.innerHTML = '';

    if (vm.locked) {
      container.appendChild(el('div', { class: 'tl-locked' }, [
        el('div', { text: '异常索引已经标出倒春寒、晴天和雨天三种冲突。' }),
        el('div', { text: '找齐四个人的记录后，再验证它们是否属于同一天。' }),
        el('span', { class: 'mono', text: 'TIMELINE · LOCKED' })
      ]));
      return;
    }

    const wrap = el('div', { class: 'tl-wrap timeline-wrap' });
    wrap.appendChild(el('div', { class: 'tl-head' }, [
      el('h3', { text: '「那一天」究竟是哪一天？' }),
      el('p', { text: '档案索引把几份记录归入同一事件，但开局就标出了天气冲突。' }),
      el('p', { text: '现在要核实每条证据的来源：先按天色分堆，再用日期与原件交叉确认。' })
    ]));

    /* 卡牌池 */
    const pool = el('div', { class: 'tl-pool' });
    vm.pool.forEach(c => pool.appendChild(cardEl(c, null, ctx, el)));
    wrap.appendChild(pool);

    if (vm.duoTip) wrap.appendChild(el('div', { class: 'tl-duo-tip mono', text: '◈ ' + vm.duoTip }));

    /* 三日槽位 */
    const days = el('div', { class: 'tl-days' });
    vm.days.forEach(day => {
      const slot = el('div', {
        class: 'tl-slot' + (day.cards.length ? '' : ' empty-hint') + (vm.done ? ' done' : ''),
        'data-slot': day.index
      });

      slot.appendChild(el('div', { class: 'tl-slot-head' }, [
        el('div', { class: 'd', text: day.label }),
        day.weatherLabel ? el('div', { class: 'w', text: day.weatherLabel }) : null
      ]));

      if (day.meta) slot.appendChild(metaEl(day.index, day.meta, vm.weatherOpts, ctx, el));

      day.cards.forEach(c => slot.appendChild(cardEl(c, day.index, ctx, el)));

      day.ghosts.forEach(g => slot.appendChild(el('div', { class: 'tl-card tl-ghost' }, [
        el('div', { class: 'tc-title', text: g.title }),
        el('div', { class: 'tc-text', text: g.text })
      ])));

      /* 完成态：结论 + 来源 */
      if (day.fact) {
        slot.appendChild(el('div', { class: 'tl-slot-fact', text: day.fact }));
        const src = el('div', { class: 'tl-slot-src' });
        src.appendChild(el('span', { class: 'tl-slot-src-k mono', text: '来源' }));
        day.sources.forEach(s => {
          const chip = el('button', { class: 'tl-src-chip', text: s.title, title: '回到这张卡对应的原件' });
          chip.addEventListener('click', e => { e.stopPropagation(); ctx.onRef(s.id); });
          src.appendChild(chip);
        });
        slot.appendChild(src);
      }

      /* 拖放接收 */
      slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('over'); });
      slot.addEventListener('dragleave', () => slot.classList.remove('over'));
      slot.addEventListener('drop', e => {
        e.preventDefault(); slot.classList.remove('over');
        const cid = e.dataTransfer.getData('text/plain');
        if (cid) ctx.onMove(cid, day.index);
      });
      /* 点选放置 */
      slot.addEventListener('click', () => {
        if (selected) { const cid = selected; selected = null; ctx.onMove(cid, day.index); }
      });

      days.appendChild(slot);
    });
    wrap.appendChild(days);

    /* 操作区 */
    const actions = el('div', { class: 'tl-actions' });
    if (!vm.done) {
      actions.appendChild(el('button', { class: 'btn-primary', text: '交叉验证', onclick: () => ctx.onValidate() }));
      actions.appendChild(el('button', {
        class: 'btn-ghost', text: '全部取回',
        onclick: () => { ctx.onClear(); }
      }));
    }
    wrap.appendChild(actions);

    container.appendChild(wrap);
  }

  /* 槽位上的「天色 / 日期」两个待填项 */
  function metaEl(i, meta, weatherOpts, ctx, el) {
    const box = el('div', { class: 'tl-meta' });

    const selWrap = el('label', { class: 'tl-meta-cell' }, [el('span', { class: 'tl-meta-k mono', text: '天色' })]);
    const sel = document.createElement('select');
    sel.className = 'tl-sel';
    sel.appendChild(new Option('？', ''));
    weatherOpts.forEach(w => sel.appendChild(new Option(w.label, w.key)));
    sel.value = meta.weather || '';
    sel.addEventListener('change', () => ctx.onWeather(i, sel.value));
    selWrap.appendChild(sel);
    box.appendChild(selWrap);

    const dWrap = el('label', { class: 'tl-meta-cell' }, [el('span', { class: 'tl-meta-k mono', text: '日期' })]);
    const row = el('div', { class: 'tl-date-row' });
    const inp = el('input', {
      class: 'tl-date-in mono', type: 'text', maxlength: '2',
      placeholder: meta.locked ? '——' : '？', value: meta.date || ''
    });
    if (meta.locked) inp.setAttribute('disabled', '');
    inp.addEventListener('input', () => ctx.onDate(i, inp.value));
    row.appendChild(inp);
    row.appendChild(el('span', { class: 'tl-date-unit mono', text: '日' }));
    dWrap.appendChild(row);
    box.appendChild(dWrap);

    if (meta.locked) box.appendChild(el('div', { class: 'tl-meta-lock mono', text: '（先完成双卷证据核对）' }));
    return box;
  }

  function cardEl(c, slotIdx, ctx, el) {
    /* 卡面不显示日期与天色 —— 那是要玩家自己读出来的；日期证据退回原件 */
    const node = el('div', { class: 'tl-card', draggable: 'true', 'data-id': c.id }, [
      el('span', { class: 'tc-kind', text: c.kindLabel }),
      el('div', { class: 'tc-title', text: c.title }),
      el('div', { class: 'tc-text', text: c.text }),
      el('div', { class: 'tc-cred', text: c.cred }),
      refBtn(c, ctx, el)
    ]);
    node.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', c.id);
      node.classList.add('dragging');
    });
    node.addEventListener('dragend', () => node.classList.remove('dragging'));
    node.addEventListener('click', e => {
      e.stopPropagation();
      LP.audio.click();
      if (slotIdx != null) {
        ctx.onMove(c.id, null);
      } else {
        selected = (selected === c.id) ? null : c.id;
        LP.$$('.tl-card').forEach(x => x.classList.remove('picked'));
        if (selected) node.classList.add('picked');
      }
    });
    return node;
  }

  /* 「查看原件」：日期答案只在原件里（照片背面 / 折痕 / 编号说明） */
  function refBtn(c, ctx, el) {
    const btn = el('button', {
      class: 'tc-ref mono', text: '↗ 查看原件',
      title: '原件 · ' + c.refLabel
    });
    btn.addEventListener('click', e => { e.stopPropagation(); ctx.onRef(c.id); });
    btn.addEventListener('pointerdown', e => e.stopPropagation());
    return btn;
  }

  LP.ui2.register('timeline', viewModel, render);
})();
