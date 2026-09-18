/* ============================================================
   文档查看器 —— 纸张质感阅读 / 第32页 OCR 修复
   ============================================================ */
window.LP = window.LP || {};
LP.doc = (function () {

  function openViewer(title, meta) {
    LP.$('#viewer-title').textContent = title;
    LP.$('#viewer-meta').textContent = meta || '';
    LP.$('#viewer-stage').innerHTML = '';
    LP.$('#viewer-tools').innerHTML = '';
    LP.$('#viewer').hidden = false;
  }
  function closeViewer() { LP.$('#viewer').hidden = true; }

  function open(id) {
    const doc = LP.data.documents[id];
    if (!doc) return;
    if (doc.damaged) { openPage32(doc); return; }

    LP.audio.paper();
    openViewer(doc.title, `NO.${doc.no} · ${doc.date} · ${doc.cred.level}可信度 · ${doc.cred.kind}`);

    const paper = LP.el('div', { class: 'paper-doc' });
    paper.appendChild(LP.el('h3', { text: doc.title }));
    paper.appendChild(LP.el('div', { class: 'pdate', text: doc.date }));
    doc.content.forEach((p, i) => {
      const para = LP.el('p', { text: p, style: `opacity:0;animation:fragIn .8s ease ${0.15 + i * 0.18}s forwards` });
      paper.appendChild(para);
    });
    LP.$('#viewer-stage').appendChild(paper);

    const tools = LP.$('#viewer-tools');
    tools.appendChild(LP.el('span', { class: 'dim', text: `${doc.content.length} 段 · 扫描件` }));
    tools.appendChild(LP.el('span', { class: 'sep' }));
    if (doc.clues && doc.clues.length) {
      tools.appendChild(LP.el('span', { class: 'red', text: `含 ${doc.clues.length} 条可提取线索`, style: 'font-size:.65rem' }));
    }

    LP.archive.markDocRead(doc);
  }

  /* ---------------- PAGE_032 · OCR 修复 ---------------- */
  const NEED_CHECK = {
    person: () => ['person_linyuan', 'person_zhou', 'person_chen', 'person_li']
      .every(pid => LP.data.people[pid].known || LP.state.has('discoveredPeople', pid)),
    place: () => ['location_clocktower', 'location_oldstreet', 'location_ferry']
      .every(l => LP.state.has('discoveredLocations', l)),
    time: () => LP.state.has('completedPuzzles', 'timeline'),
    photo: () => LP.state.has('discoveredDocuments', 'photo_01') && LP.state.has('discoveredDocuments', 'photo_05'),
    letter: () => ['letter_02', 'letter_03', 'letter_04'].every(l => LP.state.has('discoveredDocuments', l))
  };
  const NEED_LABEL = {
    person: '需要先确认全部四位人物的身份',
    place: '需要先到访全部三处地点',
    time: '需要先修复第四幕的时间线',
    photo: '需要看过 3·17 的合影与 3·18 的雨街',
    letter: '需要读完全部信件'
  };

  function openPage32(doc) {
    LP.audio.open();
    openViewer('PAGE_032.dat', '损坏文件 · 等待修复');
    const stage = LP.$('#viewer-stage');
    const s = LP.state.get();

    const wrap = LP.el('div', { class: 'p32-wrap' });
    const restoredCount = s.ocrFragments.length;
    const pct = Math.round((restoredCount / LP.story.PAGE32.fragments.length) * 100);
    wrap.appendChild(LP.el('div', { class: 'p32-head' }, [
      LP.el('span', { text: 'OCR RECOVERY' }),
      LP.el('span', { html: `完整度 <b>${pct}%</b>` })
    ]));

    const paper = LP.el('div', { class: 'p32-doc' });
    if (restoredCount < 5) paper.appendChild(LP.el('div', { class: 'ocr-scan' }));

    LP.story.PAGE32.fragments.forEach(f => {
      const restored = s.ocrFragments.includes(f.id);
      const p = LP.el('p', { class: restored ? 'restored' : '' });
      if (restored) {
        p.appendChild(LP.el('span', { class: 'ocr-frag', text: f.text }));
      } else {
        const g = LP.el('span', {
          class: 'ocr-frag garbled',
          text: `▓▓▓▓▓▓▓▓▓▓〔${f.label}〕`,
          title: '点击尝试修复',
          onclick: () => tryRestore(f)
        });
        p.appendChild(g);
      }
      paper.appendChild(p);
    });

    // 全部修复后显示最后一句（仍由玩家决定是否“补写”——剧情上保持空白反转）
    if (restoredCount >= 5) {
      const fin = LP.el('div', { class: 'p32-final' });
      paper.appendChild(fin);
      if (!s.completedPuzzles.includes('page32')) {
        // 反转：最后一句不是损坏，是留白
        LP.anim.typewriter(fin, '　', 400, () => {
          fin.textContent = '（这一页的结尾，是空白的。）';
          LP.state.addTo('completedPuzzles', 'page32');
          LP.ui.narrate(LP.story.NARRATION.page32_twist, () => {
            fin.textContent = LP.story.PAGE32.final;
            closeViewer();
            LP.inv.checkDeductions();
          });
        });
      } else {
        fin.textContent = LP.story.PAGE32.final;
        // 容错：若上次在旁白播放中途离开/刷新（谜题已完成但幕未推进），补触发跳转
        if (LP.state.get().act === 5) {
          setTimeout(() => LP.inv.checkDeductions(), 800);
        }
      }
    } else {
      paper.appendChild(LP.el('div', {
        class: 'p32-progress',
        html: `已修复 <b>${restoredCount}</b> / ${LP.story.PAGE32.fragments.length} 段`
      }));
    }

    wrap.appendChild(paper);
    stage.appendChild(wrap);

    const tools = LP.$('#viewer-tools');
    tools.appendChild(LP.el('span', { class: 'dim', text: '点击乱码段落，用已确证的事实修复' }));
    tools.appendChild(LP.el('span', { class: 'sep' }));
    tools.appendChild(LP.el('span', { text: '人物 · 地点 · 时间 · 照片 · 信件', class: 'dim', style: 'font-size:.62rem' }));

    LP.archive.markDocRead(doc);
  }

  function tryRestore(f) {
    if (!NEED_CHECK[f.need]()) {
      LP.audio.error();
      LP.ui.toast(NEED_LABEL[f.need], 'red');
      LP.anim.shake(LP.$('.p32-doc'));
      return;
    }
    LP.audio.complete();
    LP.state.addTo('ocrFragments', f.id);
    LP.anim.flash();
    // 重新渲染
    openPage32(LP.data.documents.page_032);
  }

  /* ---------------- 查看器公共事件 ---------------- */
  function init() {
    LP.$('#viewer-close').addEventListener('click', () => { LP.audio.click(); closeViewer(); });
    LP.$('#viewer').addEventListener('click', e => {
      if (e.target.id === 'viewer') closeViewer();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeViewer();
    });
  }

  return { open, openViewer, closeViewer, init };
})();
