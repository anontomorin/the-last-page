/* ============================================================
   主线引导系统 —— 「当前调查」任务卡
   ------------------------------------------------------------
   · 只读取真实游戏状态（LP.state / LP.data），不维护平行进度。
   · 「前往目标」使用真实导航：切标签 → 打开原件 / 进入地点 /
     打开通话面板 / 前往结局，并对目标条目做短暂高亮。
   · 双人模式下需要对方信息的步骤显示「等待搭档」，按钮指向
     现有通话面板；不泄露另一卷独有的内容。
   · P2（绞杀者）：默认走本文件内的旧渲染；?ui=next 时改由
     ui2 视图层（viewModel → render 纯函数）接管，业务导航不变。
   ============================================================ */
window.LP = window.LP || {};
LP.quest = (function () {

  let collapsed = false;            // 任务卡是否折叠（会话内记忆，不入存档）
  let doneOpen = false;             // 「已完成的调查」是否展开

  /* ---------- 取当前任务 ---------- */
  function currentQuest() {
    const s = LP.state.get();
    const act = Math.max(1, Math.min(s.act || 1, 6));
    return LP.questData.QUESTS.find(q => q.act === act) || null;
  }
  function stepsOf(q) {
    const mode = LP.state.get().mode;
    return q.steps[mode] || q.steps.default;
  }
  function actionOf(q) {
    const mode = LP.state.get().mode;
    return q.actions[mode] || q.actions.default;
  }
  function reasonCounts() {
    const s = LP.state.get();
    const req = (LP.data.reasonRequired && LP.data.reasonRequired.act3) || [];
    const done = req.filter(k => (s.evidenceLinks || []).includes(k)).length;
    return { done, total: req.length };
  }

  /* ---------- 目标高亮 ---------- */
  function flashTarget(id) {
    setTimeout(() => {
      const el = LP.$(`.doc-item[data-id="${id}"]`);
      if (!el) return;
      el.classList.add('qg-target');
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      setTimeout(() => el.classList.remove('qg-target'), 2400);
    }, 160);
  }

  /* ---------- 真实导航 ---------- */
  function gotoDoc(id) {
    const doc = LP.data.documents[id];
    if (!doc) return;
    if (!LP.inv.docVisible(doc)) { LP.duo.openPanel(); return; }
    const tab = doc.type === 'photo' ? 'photo'
      : doc.type === 'letter' ? 'letter'
      : doc.type === 'map' ? 'map' : 'diary';
    LP.archive.setTab(tab);
    if (LP.archive.isUnlocked(doc)) flashTarget(id);
    else LP.ui.toast('这份资料还没有解锁。', 'gold');
  }
  function gotoScene(locId) {
    const loc = LP.data.locations[locId];
    if (!loc) return;
    if (!LP.archive.locationUnlocked(loc)) { LP.ui.toast('这个地点还没有在地图上出现。', 'gold'); return; }
    LP.router.go('archive');
    LP.map.openScene(locId);
  }
  function runAction(action) {
    LP.audio.click();
    if (!action) return;
    switch (action.kind) {
      case 'doc': gotoDoc(action.target); break;
      case 'scene': gotoScene(action.target); break;
      case 'tab': LP.archive.setTab(action.target); break;
      case 'duo': LP.duo.openPanel(); break;
      case 'ending':
        if (LP.state.get().finalMessage) LP.ending.resume();
        else LP.ui.toast('先修复 PAGE_032 —— 最后一页在第五幕的尽头。', 'gold');
        break;
    }
  }

  /* ---------- 新壳（ui2）挂载上下文 ----------
     业务回调集中在此：视图层只负责画，动作一律回到这里执行。 */
  function nextCtx() {
    return {
      state: LP.state.get(),
      data: LP.data,
      ui: { collapsed, doneOpen },
      onFold() { LP.audio.click(); collapsed = !collapsed; render(); },
      onDoneToggle(open) { doneOpen = !!open; },
      onAction(action) { runAction(action); }
    };
  }

  /* ---------- 渲染 ----------
     默认走旧实现；?ui=next（或 localStorage.lp_ui=next）时由
     ui2/view/questGuide.js 的 viewModel + render 两个纯函数接管。 */
  function render() {
    const box = LP.$('#quest-card');
    if (!box) return;
    if (LP.ui2 && LP.ui2.mount('questGuide', box, nextCtx())) return;
    renderLegacy(box);
  }

  /* ---------- 旧壳渲染（保留，P6 验收通过后再删） ---------- */
  function renderLegacy(box) {
    const s = LP.state.get();
    box.innerHTML = '';
    if (!s.act || s.act < 1 || s.act > 6) { box.hidden = true; return; }
    box.hidden = false;

    const q = currentQuest();
    if (!q) return;
    const steps = (stepsOf(q) || []).filter(st => !st.duoOnly || s.mode !== 'solo');
    const action = actionOf(q);
    const rc = reasonCounts();
    const stepStates = steps.map(st => st.done(s, LP.data));
    const allDone = stepStates.length > 0 && stepStates.every(Boolean);
    /* 当前进行中的步骤 = 第一个未完成 */
    const curIdx = stepStates.indexOf(false);
    /* 等待搭档：当前步骤需要对方，且双人模式 */
    const waiting = s.mode !== 'solo' && curIdx >= 0 && steps[curIdx].wait;

    const card = LP.el('div', { class: 'qg-card' + (allDone ? ' all-done' : '') });

    /* 头部：阶段 + 折叠 */
    const head = LP.el('div', { class: 'qg-head' });
    head.appendChild(LP.el('div', { class: 'qg-kicker mono', text: `主线 ${q.act}/6 · 当前调查` }));
    const status = LP.el('span', {
      class: 'qg-status mono ' + (allDone ? 'done' : waiting ? 'wait' : 'live'),
      text: allDone ? '✓ 本幕目标已达成' : waiting ? '等待搭档线索' : '进行中'
    });
    head.appendChild(status);
    const fold = LP.el('button', {
      class: 'qg-fold mono', type: 'button',
      text: collapsed ? '展开 ▾' : '收起 ▴', 'aria-label': collapsed ? '展开任务卡' : '收起任务卡'
    });
    fold.addEventListener('click', () => { LP.audio.click(); collapsed = !collapsed; render(); });
    head.appendChild(fold);
    card.appendChild(head);

    if (!collapsed) {
      card.appendChild(LP.el('div', { class: 'qg-title serif', text: q.title }));
      card.appendChild(LP.el('p', { class: 'qg-why', text: q.why }));
      const list = LP.el('ol', { class: 'qg-steps' });
      steps.forEach((st, i) => {
        const done = stepStates[i];
        const li = LP.el('li', { class: done ? 'done' : i === curIdx ? 'cur' : '' }, [
          LP.el('span', { class: 'qg-dot', text: done ? '✓' : String(i + 1) }),
          LP.el('span', {
            class: 'qg-step-text',
            text: st.dynamic === 'reason'
              ? st.text.replace('#', `${rc.done}/${rc.total}`)
              : st.text
          }),
          st.wait && !done ? LP.el('span', { class: 'qg-wait-flag mono', text: '搭档' }) : null
        ]);
        list.appendChild(li);
      });
      card.appendChild(list);

      /* 主行动按钮 */
      if (action) {
        card.appendChild(LP.el('button', {
          class: 'btn-primary small qg-go', type: 'button',
          text: action.kind === 'duo' ? '等待搭档 · 打开通话' : action.label,
          onclick: () => runAction(action)
        }));
      }
    }

    /* 已完成的调查（此前各幕，由真实 act 推导） */
    const doneQuests = LP.questData.QUESTS.filter(x => x.act < s.act);
    if (doneQuests.length) {
      const det = LP.el('details', { class: 'qg-done', open: doneOpen ? '' : null });
      det.appendChild(LP.el('summary', {
        class: 'mono', text: `已完成的调查（${doneQuests.length}）`
      }));
      doneQuests.forEach(x => {
        det.appendChild(LP.el('div', { class: 'qg-done-row' }, [
          LP.el('span', { class: 'qg-done-check', text: '✓' }),
          LP.el('span', { text: `${x.act}/6 · ${x.title}` })
        ]));
      });
      det.addEventListener('toggle', () => { doneOpen = det.open; });
      card.appendChild(det);
    }

    box.appendChild(card);
  }

  function init() {
    render();
    LP.bus.on('refresh', render);
    LP.bus.on('state', render);
  }

  return { init, render };
})();
