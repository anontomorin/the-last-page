/* ============================================================
   ui2 视图层 · 主线任务卡（questGuide）
   ------------------------------------------------------------
   两个纯函数：
     viewModel(state, data, ui) → vm     只算「该显示什么」
     render(vm, ctx)           → DOMNode 只负责把 vm 画出来

   二者都不读写 LP.state、不调 LP.* 业务、不产生副作用。
   所有交互都通过 ctx 的回调交回 systems/questGuideSystem.js。
   ============================================================ */
(function () {

  /* ---------- ① view-model：state + data + ui → 纯数据 ---------- */
  function viewModel(s, d, ui) {
    const QUESTS = LP.questData.QUESTS;
    const act = Math.max(1, Math.min((s && s.act) || 1, 6));
    const q = QUESTS.find(x => x.act === act) || null;

    /* 未开始或超出六幕：整卡隐藏 */
    if (!s || !s.act || s.act < 1 || s.act > 6 || !q) return { visible: false };

    const mode = s.mode;
    const rawSteps = q.steps[mode] || q.steps.default || [];
    const steps = rawSteps.filter(st => !st.duoOnly || mode !== 'solo');
    const action = q.actions[mode] || q.actions.default || null;

    /* 动态步骤（证据板身份关系）的计数 */
    const req = (d.reasonRequired && d.reasonRequired.act3) || [];
    const links = Array.isArray(s.evidenceLinks) ? s.evidenceLinks : [];
    const rc = { done: req.filter(k => links.includes(k)).length, total: req.length };

    const doneFlags = steps.map(st => !!(typeof st.done === 'function' && st.done(s, d)));
    const allDone = doneFlags.length > 0 && doneFlags.every(Boolean);
    const curIdx = doneFlags.indexOf(false);
    const waiting = mode !== 'solo' && curIdx >= 0 && !!steps[curIdx].wait;

    return {
      visible: true,
      act,
      kicker: `主线 ${act}/6 · 当前调查`,
      title: q.title,
      why: q.why,
      allDone,
      waiting,
      status: allDone ? 'done' : waiting ? 'wait' : 'live',
      statusText: allDone ? '✓ 本幕目标已达成' : waiting ? '等待搭档线索' : '进行中',
      folded: !!(ui && ui.collapsed),
      doneOpen: !!(ui && ui.doneOpen),
      steps: steps.map((st, i) => ({
        n: i + 1,
        done: doneFlags[i],
        cur: !doneFlags[i] && i === curIdx,
        wait: !!st.wait && !doneFlags[i],
        text: st.dynamic === 'reason'
          ? String(st.text).replace('#', `${rc.done}/${rc.total}`)
          : st.text
      })),
      action: action ? {
        label: action.kind === 'duo' ? '等待搭档 · 打开通话' : action.label,
        kind: action.kind,
        target: action.target || null
      } : null,
      doneQuests: QUESTS.filter(x => x.act < (s.act || 0)).map(x => ({ act: x.act, title: x.title }))
    };
  }

  /* ---------- ② render：vm + ctx → DOM（无状态、无副作用） ---------- */
  function render(vm, ctx) {
    const el = LP.el;

    const card = el('div', { class: 'u2-qg-card' + (vm.allDone ? ' all-done' : '') });

    /* 头部：阶段 + 状态 + 折叠 */
    const head = el('div', { class: 'u2-qg-head' });
    head.appendChild(el('div', { class: 'u2-qg-kicker mono', text: vm.kicker }));
    head.appendChild(el('span', { class: 'u2-qg-status mono ' + vm.status, text: vm.statusText }));
    const fold = el('button', {
      class: 'u2-qg-fold mono', type: 'button',
      text: vm.folded ? '展开 ▾' : '收起 ▴',
      'aria-label': vm.folded ? '展开任务卡' : '收起任务卡'
    });
    fold.addEventListener('click', () => ctx.onFold());
    head.appendChild(fold);
    card.appendChild(head);

    if (!vm.folded) {
      card.appendChild(el('div', { class: 'u2-qg-title serif', text: vm.title }));
      card.appendChild(el('p', { class: 'u2-qg-why', text: vm.why }));

      const list = el('ol', { class: 'u2-qg-steps' });
      vm.steps.forEach(st => {
        list.appendChild(el('li', { class: st.done ? 'done' : st.cur ? 'cur' : '' }, [
          el('span', { class: 'u2-qg-dot', text: st.done ? '✓' : String(st.n) }),
          el('span', { class: 'u2-qg-step-text', text: st.text }),
          st.wait ? el('span', { class: 'u2-qg-wait-flag mono', text: '搭档' }) : null
        ]));
      });
      card.appendChild(list);

      if (vm.action) {
        card.appendChild(el('button', {
          class: 'btn-primary small u2-qg-go', type: 'button',
          text: vm.action.label,
          onclick: () => ctx.onAction(vm.action)
        }));
      }
    }

    /* 已完成的调查（此前各幕） */
    if (vm.doneQuests.length) {
      const det = el('details', { class: 'u2-qg-done', open: vm.doneOpen ? '' : null });
      det.appendChild(el('summary', { class: 'mono', text: `已完成的调查（${vm.doneQuests.length}）` }));
      vm.doneQuests.forEach(x => {
        det.appendChild(el('div', { class: 'u2-qg-done-row' }, [
          el('span', { class: 'u2-qg-done-check', text: '✓' }),
          el('span', { text: `${x.act}/6 · ${x.title}` })
        ]));
      });
      det.addEventListener('toggle', () => ctx.onDoneToggle(det.open));
      card.appendChild(det);
    }

    return card;
  }

  LP.ui2.register('questGuide', viewModel, render);
})();
