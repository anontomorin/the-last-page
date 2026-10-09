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
    // 记录者卷的日记：只显示编目梗概，正文在执笔者卷
    const gist = LP.inv.isGist(doc);
    openViewer(
      LP.inv.sub(doc.title) + (gist ? ' · 梗概' : ''),
      gist
        ? `NO.${doc.no} · 编目摘要 · 正文在执笔者卷`
        : `NO.${doc.no} · ${doc.date} · ${doc.cred.level}可信度 · ${doc.cred.kind}`
    );

    const content = LP.inv.docContent(doc);
    const paper = LP.el('div', { class: 'paper-doc' });
    paper.appendChild(LP.el('h3', { text: LP.inv.sub(doc.title) }));
    paper.appendChild(LP.el('div', { class: 'pdate', text: gist ? '编目摘要' : doc.date }));
    if (gist) {
      paper.appendChild(LP.el('div', {
        class: 'gist-note mono', text: 'RECORD GIST · 正文不在此卷'
      }));
    }
    content.forEach((p, i) => {
      const para = LP.el('p', { text: LP.inv.sub(p), style: `opacity:0;animation:fragIn .8s ease ${0.15 + i * 0.18}s forwards` });
      paper.appendChild(para);
    });
    if (gist) {
      paper.appendChild(LP.el('div', { class: 'gist-cta' }, [
        LP.el('p', { class: 'serif', text: '这一页的字，写在执笔者那一卷里。让 ta 念给你听。' }),
        LP.el('button', {
          class: 'btn-ghost small', text: '打开通话',
          onclick: () => { closeViewer(); LP.duo.openPanel(); }
        })
      ]));
    }
    LP.$('#viewer-stage').appendChild(paper);

    const tools = LP.$('#viewer-tools');
    if (gist) {
      tools.appendChild(LP.el('span', { class: 'dim', text: `${content.length} 段 · 编目摘要（非全文）` }));
    } else {
      tools.appendChild(LP.el('span', { class: 'dim', text: `${content.length} 段 · 扫描件` }));
      tools.appendChild(LP.el('span', { class: 'sep' }));
      if (doc.clues && doc.clues.length) {
        tools.appendChild(LP.el('span', { class: 'red', text: `含 ${doc.clues.length} 条可提取线索`, style: 'font-size:.65rem' }));
      }
    }
    appendNavTools(doc);

    LP.archive.markDocRead(doc);
  }

  /* 原件 → 调查位置：把「这份原件被用在哪」显式给出，玩家可以追溯来源
     —— 时间线卡片 / 证据板节点，双向导航的另一半（P1） */
  function appendNavTools(doc) {
    const tools = LP.$('#viewer-tools');
    const cards = LP.timeline && LP.timeline.cardsForDoc ? LP.timeline.cardsForDoc(doc.id) : [];
    const inBoard = LP.data.evidenceGraph.some(e => e.from === doc.id || e.to === doc.id);
    if (!cards.length && !inBoard) return;
    tools.appendChild(LP.el('span', { class: 'sep' }));
    if (cards.length) {
      const btn = LP.el('button', { class: 'vt', text: '◈ 用于时间线' });
      btn.addEventListener('click', () => {
        LP.audio.click();
        closeViewer();
        LP.archive.setTab('timeline');
        setTimeout(() => LP.timeline.focusCard(cards[0]), 160);
      });
      tools.appendChild(btn);
    }
    if (inBoard) {
      const btn = LP.el('button', { class: 'vt', text: '◈ 证据板上的关联' });
      btn.addEventListener('click', () => {
        LP.audio.click();
        closeViewer();
        LP.archive.setTab('evidence');
        setTimeout(() => LP.evidence.focusNode(doc.id), 160);
      });
      tools.appendChild(btn);
    }
  }

  /* ---------------- PAGE_032 · OCR 修复 ---------------- */
  const has = k => LP.state.has('completedPuzzles', k);

  /* 双人模式：每段归不同卷修复——A=人物/时间/信件，B=地点/照片 */
  const NEED_MODE = { person: 'A', time: 'A', letter: 'A', place: 'B', photo: 'B' };
  const NEED_LABEL = {
    person: '需要先确认全部四位人物的身份',
    place: '需要先确证全部三处地点',
    time: '需要先修复第四幕的时间线',
    photo: '需要看过 3·17 的合影与 3·18 的雨街',
    letter: '需要读完全部信件'
  };
  /* 双人模式：还缺对方那一份时，给出「去通话」的指引 */
  const NEED_VOICE = {
    person: '四人身份已齐，但你没见过那张合影——让记录者把四个人的站位念给你听（通话 → 记下 ta 说的）。',
    place: '三处地点都去过了，但你不知道它们怎么串成一条线——让执笔者把那天的路线念给你听。',
    time: '时间线已修复，但你手里只有纸——让记录者把照片背面的日期与天气念给你听。',
    photo: '两张照片你都看过，但你还不知道她的编号规则——让执笔者把李禾那份说明念给你听。',
    letter: '三封信都读过了，可你手里那张的最后一句是糊的——让记录者把完整的信念给你听。'
  };
  const NEED_PARTNER = {
    person: '这一段属于执笔者——让 ta 来修。',
    place: '这一段属于记录者——让 ta 来修。',
    time: '这一段属于执笔者——让 ta 来修。',
    photo: '这一段属于记录者——让 ta 来修。',
    letter: '这一段属于执笔者——让 ta 来修。'
  };

  function openPage32(doc) {
    LP.audio.open();
    openViewer('PAGE_032.dat', '损坏文件 · 等待修复');
    const stage = LP.$('#viewer-stage');
    const s = LP.state.get();

    const wrap = LP.el('div', { class: 'p32-wrap' });
    // 双人模式：只统计本卷可修的段落
    const myFrags = LP.story.PAGE32.fragments.filter(f =>
      s.mode === 'solo' || !NEED_MODE[f.need] || NEED_MODE[f.need] === s.mode);
    const myRestored = myFrags.filter(f => s.ocrFragments.includes(f.id)).length;
    const restoredCount = s.ocrFragments.length;
    const pct = s.mode === 'solo'
      ? Math.round((restoredCount / LP.story.PAGE32.fragments.length) * 100)
      : Math.round((myRestored / myFrags.length) * 100);
    wrap.appendChild(LP.el('div', { class: 'p32-head' }, [
      LP.el('span', { text: 'OCR RECOVERY' + (s.mode !== 'solo' ? ' · ' + (s.mode === 'A' ? '执笔者卷' : '记录者卷') : '') }),
      LP.el('span', { html: `完整度 <b>${pct}%</b>` })
    ]));

    const paper = LP.el('div', { class: 'p32-doc' });
    if (myRestored < myFrags.length) paper.appendChild(LP.el('div', { class: 'ocr-scan' }));

    LP.story.PAGE32.fragments.forEach(f => {
      const restored = s.ocrFragments.includes(f.id);
      const p = LP.el('p', { class: restored ? 'restored' : '' });
      if (restored) {
        p.appendChild(LP.el('span', { class: 'ocr-frag', text: f.text }));
      } else {
        // 属于对方的段落：显示为"待另一卷修复"
        const isPartner = s.mode !== 'solo' && NEED_MODE[f.need] && NEED_MODE[f.need] !== s.mode;
        const g = LP.el('span', {
          class: 'ocr-frag garbled' + (isPartner ? ' partner' : ''),
          text: isPartner ? `▓▓▓▓▓▓▓▓▓▓〔${f.label}·对方修复〕` : `▓▓▓▓▓▓▓▓▓▓〔${f.label}〕`,
          title: isPartner ? '这一段在你的搭档手里' : '点击尝试修复',
          onclick: () => tryRestore(f)
        });
        p.appendChild(g);
      }
      paper.appendChild(p);
    });

    // 本卷段落全部修完 → 触发反转（双人各触发一次，两人各自进入第六幕）
    if (myRestored >= myFrags.length) {
      const fin = LP.el('div', { class: 'p32-final' });
      paper.appendChild(fin);
      if (!s.completedPuzzles.includes('page32')) {
        // 反转：最后一句不是损坏，是留白
        LP.anim.typewriter(fin, '　', 400, () => {
          fin.textContent = '（这一页的结尾，是空白的。）';
          LP.state.addTo('completedPuzzles', 'page32');
          /* 这一刻整页才第一次完整（restored 段落刚走完 1s 的显影动画）。
             旁白改用 soft —— 不虚化背景：默认的 blur 遮罩会把这页糊掉，
             玩家根本没机会看清自己刚修好的东西。 */
          LP.ui.narrate(LP.story.NARRATION.page32_twist, () => {
            fin.textContent = LP.story.PAGE32.final;
            closeViewer();
            LP.inv.checkDeductions();
          }, { soft: true });
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
        html: s.mode === 'solo'
          ? `已修复 <b>${restoredCount}</b> / ${LP.story.PAGE32.fragments.length} 段`
          : `你这一卷已修复 <b>${myRestored}</b> / ${myFrags.length} 段`
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

  /* 本方自己能确证的事实 */
  const NEED_SELF = {
    person: () => ['person_linyuan', 'person_zhou', 'person_chen', 'person_li']
      .every(pid => LP.data.people[pid].known || LP.state.has('discoveredPeople', pid)),
    place: () => ['location_clocktower', 'location_oldstreet', 'location_ferry']
      .every(l => LP.state.has('discoveredLocations', l)),
    time: () => LP.state.has('completedPuzzles', 'timeline'),
    photo: () => LP.state.has('discoveredDocuments', 'photo_09') && LP.state.has('discoveredDocuments', 'photo_11'),
    letter: () => ['letter_02', 'letter_03', 'letter_04'].every(l => LP.state.has('discoveredDocuments', l))
  };
  const NEED_VOICE_FLAG = { person: 'duo_faces', place: 'duo_route', time: 'duo_tl_photo', photo: 'duo_photoback', letter: 'duo_letter02_tail' };

  function tryRestore(f) {
    const s = LP.state.get();
    // 双人模式卷别归属
    if (s.mode !== 'solo' && NEED_MODE[f.need] && NEED_MODE[f.need] !== s.mode) {
      LP.audio.error();
      LP.ui.toast(NEED_PARTNER[f.need], 'gold');
      LP.anim.shake(LP.$('.p32-doc'));
      return;
    }
    if (!NEED_SELF[f.need]()) {
      LP.audio.error();
      LP.ui.toast(NEED_LABEL[f.need], 'red');
      LP.anim.shake(LP.$('.p32-doc'));
      return;
    }
    // 本方事实齐了，但还缺对方口述的那一份
    if (s.mode !== 'solo' && !has(NEED_VOICE_FLAG[f.need])) {
      LP.audio.error();
      LP.ui.toast(NEED_VOICE[f.need], 'gold');
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
