/* ============================================================
   调查系统 —— 线索发现 / 三级提示 / 推导演进 / 幕切换
   ============================================================ */
window.LP = window.LP || {};
LP.inv = (function () {

  /* 代号→真名替换：身份确认前显示代号，确认后显示姓名 */
  function sub(text) {
    const s = LP.state.get();
    const known = pid => LP.data.people[pid].known || s.discoveredPeople.includes(pid);
    return String(text)
      .replace(/\{Z\}/g, known('person_zhou') ? '周宁' : 'Z')
      .replace(/\{C\}/g, known('person_chen') ? '陈川' : 'C')
      .replace(/\{L\}/g, known('person_li') ? '李禾' : 'L');
  }

  /* ---------------- 线索发现 ---------------- */
  function discoverClue(clueId, silent) {
    const clue = LP.data.clues[clueId];
    if (!clue) return;
    if (!LP.state.addTo('discoveredEvidence', clueId)) return; // 已发现
    if (!silent) {
      LP.audio.complete();
      LP.ui.toast(`发现线索：${clue.label}`, 'red');
    }
    renderClues();
    // 身份确认线索：发现即确认（如公告栏揭示「周宁」）
    Object.values(LP.data.people).forEach(p => {
      if (p.identifyBy === clueId) identifyPerson(p.id);
    });
    checkDeductions();
  }

  function renderClues() {
    const box = LP.$('#wb-clues-list');
    if (!box) return;
    box.innerHTML = '';
    const s = LP.state.get();
    if (!s.discoveredEvidence.length) {
      box.appendChild(LP.el('div', {
        class: 'dim', text: '尚无线索。阅读资料、观察细节。',
        style: 'font-size:.7rem;padding:.6rem;line-height:1.8'
      }));
      return;
    }
    s.discoveredEvidence.forEach(cid => {
      const c = LP.data.clues[cid];
      if (!c) return;
      const card = LP.el('div', { class: 'clue-card' }, [
        LP.el('div', { class: 'l', text: c.label }),
        LP.el('div', { class: 'd', text: c.desc })
      ]);
      card.addEventListener('click', () => {
        LP.audio.click();
        LP.archive.setTab('evidence');
        setTimeout(() => LP.evidence.focusNode(cid), 120);
      });
      box.appendChild(card);
    });
    LP.$('#clue-count').textContent = s.discoveredEvidence.length;
  }

  /* ---------------- 资料阅读后的钩子 ---------------- */
  function afterRead(doc) {
    const s = LP.state.get();
    // 人物确认：由署名线索触发
    Object.values(LP.data.people).forEach(p => {
      if (p.identifyBy && s.discoveredEvidence.includes(p.identifyBy)) {
        identifyPerson(p.id);
      }
    });
    // 藏头句：日记其六/其八/其十 首字连读「钟·楼·七」
    const acro = ['diary_06', 'diary_08', 'diary_10']
      .filter(d => s.discoveredDocuments.includes(d)).length;
    if (acro >= 2) discoverClue('clue_acrostic_part');
    if (acro >= 3) discoverClue('clue_acrostic');
    checkDeductions();
  }

  function identifyPerson(pid) {
    const p = LP.data.people[pid];
    if (!p || p.known) return;
    if (LP.state.addTo('discoveredPeople', pid)) {
      LP.audio.unlock();
      LP.ui.toast(`人物身份确认：${p.name}`, 'gold');
      LP.bus.emit('person', pid);
    }
  }

  /* ---------------- 推导演进 ---------------- */
  function checkDeductions() {
    const s = LP.state.get();

    // 第一幕：折痕「3-17」 + 读过日记·其三 → 解锁旧钟楼，进入第二幕
    if (s.act === 1 &&
        s.discoveredEvidence.includes('clue_317') &&
        s.discoveredDocuments.includes('diary_03')) {
      completePuzzle('act1');
      LP.state.addTo('discoveredLocations', 'location_clocktower');
      setAct(2, LP.story.NARRATION.act1_done);
      return;
    }

    // 第二幕：公告栏第七行 → 周宁（由 mapSystem 触发 completePuzzle('board')）
    if (s.act === 2 && s.discoveredEvidence.includes('clue_zhou_name')) {
      completePuzzle('act2');
      setAct(3, LP.story.NARRATION.act2_done);
      return;
    }

    // 第三幕：四人全部确认
    if (s.act === 3) {
      const all = ['person_linyuan', 'person_zhou', 'person_chen', 'person_li']
        .every(pid => LP.data.people[pid].known || s.discoveredPeople.includes(pid));
      if (all) {
        completePuzzle('act3');
        LP.state.addTo('discoveredLocations', 'location_oldstreet');
        setAct(4, LP.story.NARRATION.act3_done);
        return;
      }
    }

    // 第四幕：时间线修复（timelineSystem 调 completePuzzle('timeline')）
    if (s.act === 4 && s.completedPuzzles.includes('timeline')) {
      LP.state.addTo('discoveredLocations', 'location_ferry');
      setAct(5, LP.story.NARRATION.act4_done);
      return;
    }

    // 第五幕：第32页 OCR 修复完成（endingSystem 调 completePuzzle('page32')）
    if (s.act === 5 && s.completedPuzzles.includes('page32')) {
      setAct(6, null);
      setTimeout(() => LP.ending.start(), 600);
    }
  }

  function completePuzzle(id) {
    LP.state.addTo('completedPuzzles', id);
  }

  function setAct(n, narration) {
    LP.audio.unlock();
    LP.state.set({ act: n });
    document.body.dataset.act = n;
    LP.archive.refreshAll();
    if (narration) LP.ui.narrate(narration);
    if (n <= 5) LP.ui.toast(`档案完整度提升 —— 进入${LP.story.ACT_TITLES[n]}`, 'gold');
  }

  /* ---------------- 三级提示 ---------------- */
  function currentHintGroup() {
    const s = LP.state.get();
    if (s.act <= 1) return 'act1';
    if (s.act === 2) {
      if (!s.discoveredEvidence.includes('clue_acrostic') && s.bellRings < 7) return 'acrostic';
      if (s.bellRings < 7) return 'bell';
      return 'board';
    }
    if (s.act === 3) return 'people';
    if (s.act === 4) {
      if (!s.completedPuzzles.includes('timeline')) return 'timeline';
      return 'photosort';
    }
    return 'page32';
  }

  function showHint() {
    const group = currentHintGroup();
    const s = LP.state.get();
    const lv = Math.min((s.hintLevels[group] || 0) + 1, 3);
    const hintLevels = Object.assign({}, s.hintLevels, { [group]: lv });
    LP.state.set({ hintLevels });
    const box = LP.$('#hint-text');
    box.hidden = false;
    box.innerHTML = '';
    LP.anim.typewriter(box, LP.story.HINTS[group][lv - 1], 20);
    LP.audio.paper();
    LP.$('#btn-hint').textContent = lv >= 3 ? '提示已用完' : `需要提示（${lv}/3）`;
  }

  function initHint() {
    LP.$('#btn-hint').addEventListener('click', showHint);
  }

  return {
    discoverClue, renderClues, afterRead, identifyPerson,
    checkDeductions, completePuzzle, setAct, initHint, sub
  };
})();
