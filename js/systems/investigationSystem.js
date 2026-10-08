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

  /* 卷别可见性：双人模式下过滤不属于本卷的资料 */
  function docVisible(doc) {
    const mode = LP.state.get().mode;
    if (mode === 'solo' || !doc.visibleIn) return true;
    return doc.visibleIn === mode;
  }

  /* 按卷取文案：B 卷有 contentB 则用 contentB；A 卷同理 */
  function docContent(doc) {
    const s = LP.state.get();
    const mode = s.mode;
    if (mode === 'B') {
      return doc.contentB || doc.content;
    }
    if (mode === 'A') {
      // 门缝信：听写补完后由残页变全页
      if (doc.contentAFull && s.completedPuzzles.includes('duo_letter02_tail')) return doc.contentAFull;
      if (doc.contentA) return doc.contentA;
    }
    return doc.content;
  }

  /* 记录者卷的日记只给「编目梗概」：摘要 + 纸面痕迹，不是正文 */
  function isGist(doc) {
    return LP.state.get().mode === 'B' && !!doc.gistInB;
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

    // 单人第一幕：折痕「3-17」 + 读过日记·其二十一
    if (s.act === 1 && s.mode === 'solo' &&
        s.discoveredEvidence.includes('clue_317') &&
        s.discoveredDocuments.includes('diary_21')) {
      completePuzzle('act1');
      LP.state.addTo('discoveredLocations', 'location_clocktower');
      setAct(2, LP.story.NARRATION.act1_done);
      return;
    }

    // 双人 A 卷第一幕：读过其二十一 + 拼入 B 的折痕碎片（duo_crease）
    if (s.act === 1 && s.mode === 'A' &&
        s.discoveredDocuments.includes('diary_21') &&
        s.completedPuzzles.includes('duo_crease')) {
      LP.inv.discoverClue('clue_317', true);
      completePuzzle('act1');
      LP.state.addTo('discoveredLocations', 'location_clocktower');
      setAct(2, [
        '「像是三，又像是一和七挨在一起。」',
        '你的记录者在照片背面发现的符号——',
        '和你日记里的三月十七日，对上了。',
        '地图已更新。'
      ]);
      return;
    }

    // 双人 B 卷的第一幕：B 发现折痕后，等 A 通过碎片码确认日记内容
    if (s.act === 1 && s.mode === 'B' &&
        s.discoveredEvidence.includes('clue_317') &&
        s.completedPuzzles.includes('duo_diary21')) {
      completePuzzle('act1');
      LP.state.addTo('discoveredLocations', 'location_clocktower');
      setAct(2, [
        '「三月十七日，钟楼。」',
        '你的执笔者在电话那头念出了那一页。',
        '折痕里的符号，终于对上了。',
        '地图已更新。'
      ]);
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

    // 第四幕：时间线修复
    //   单人：timelineSystem 直接给 timeline
    //   双人：天色自己判（timeline_mine）+ 日期听对方念（duo_tl_*）+ 日期填对
    //        —— 全部由 timelineSystem 的「交叉验证」判定，这里只在已完成时推进幕
    if (s.act === 4) {
      if (s.completedPuzzles.includes('timeline')) { completeTimeline(); return; }
      return;
    }

    // 第五幕：第32页 OCR 修复完成（endingSystem 调 completePuzzle('page32')）
    if (s.act === 5 && s.completedPuzzles.includes('page32')) {
      setAct(6, null);
      setTimeout(() => LP.ending.start(), 600);
    }
  }

  function completeTimeline() {
    LP.state.addTo('discoveredLocations', 'location_ferry');
    setAct(5, LP.story.NARRATION.act4_done);
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
      // 执笔者不在现场：钟由记录者敲，ta 只负责把「响几下」念过去
      if (s.mode === 'A') return 'board';
      if (s.bellRings < 7) return 'bell';
      return 'board';
    }
    if (s.act === 3) return 'people';
    if (s.act === 4) {
      if (!s.completedPuzzles.includes('timeline')) return 'timeline';
      // 拍摄顺序校验归记录者卷；执笔者跳过
      if (s.mode === 'A') return 'page32';
      return 'photosort';
    }
    return 'page32';
  }

  function hintBank() {
    const s = LP.state.get();
    if (s.mode === 'A' || s.mode === 'B') {
      const bank = LP.story.HINTS_DUO && LP.story.HINTS_DUO[s.mode];
      if (bank) return bank;
    }
    return LP.story.HINTS;
  }

  function showHint() {
    const group = currentHintGroup();
    const s = LP.state.get();
    const bank = hintBank();
    const arr = bank[group] || LP.story.HINTS[group] || ['……'];
    const lv = Math.min((s.hintLevels[group] || 0) + 1, arr.length);
    const hintLevels = Object.assign({}, s.hintLevels, { [group]: lv });
    LP.state.set({ hintLevels });
    const box = LP.$('#hint-text');
    box.hidden = false;
    box.innerHTML = '';
    LP.anim.typewriter(box, arr[lv - 1], 20);
    LP.audio.paper();
    LP.$('#btn-hint').textContent = lv >= arr.length ? '提示已用完' : `需要提示（${lv}/${arr.length}）`;
  }

  function initHint() {
    LP.$('#btn-hint').addEventListener('click', showHint);
  }

  return {
    discoverClue, renderClues, afterRead, identifyPerson,
    checkDeductions, completePuzzle, setAct, initHint, sub,
    docVisible, docContent, isGist
  };
})();
