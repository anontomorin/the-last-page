/* ============================================================
   ui2 视图层 · 文档查看器（document + PAGE_032）
   ------------------------------------------------------------
   两个纯函数：
     viewModel(state, data, ui) → vm        只算「该显示什么」
     render(vm, hosts, ctx)                 只负责把 vm 画出来

   hosts = { title, meta, stage, tools } —— 查看器外壳是静态 DOM，
   新旧壳共用；只有 stage / tools 的**内容**由本模块生成。
   DOM 复用现有类名（视觉与旧壳一致），因此本模块不携带任何样式。
   二者都不读写 LP.state：state 由 mount 注入，只读访问器一律以
   (…, state) 形式调用。
   ============================================================ */
(function () {

  /* 双人模式：每段归不同卷修复 —— A=人物/时间/信件，B=地点/照片 */
  const NEED_MODE = { person: 'A', time: 'A', letter: 'A', place: 'B', photo: 'B' };

  /* ---------- ① view-model ---------- */
  function viewModel(s, d, ui) {
    const id = ui && ui.id;
    const doc = id ? d.documents[id] : null;
    if (!doc) return { visible: false };
    if (doc.damaged) return page32VM(s, d, doc);
    return docVM(s, d, doc);
  }

  function docVM(s, d, doc) {
    const gist = LP.inv.isGist(doc, s);
    const content = LP.inv.docContent(doc, s) || [];
    const cards = (LP.timeline && LP.timeline.cardsForDoc) ? LP.timeline.cardsForDoc(doc.id) : [];
    return {
      visible: true,
      kind: 'doc',
      docId: doc.id,
      letterBg: doc.type === 'letter',
      /* 顶栏标题带「· 梗概」后缀；纸张内 h3 与旧壳一致，用纯标题 */
      title: LP.inv.sub(doc.title, s) + (gist ? ' · 梗概' : ''),
      paperTitle: LP.inv.sub(doc.title, s),
      meta: gist
        ? `NO.${doc.no} · 编目摘要 · 正文在执笔者卷`
        : `NO.${doc.no} · ${doc.date} · ${doc.cred.level}可信度 · ${doc.cred.kind}`,
      gist,
      date: doc.date,
      paras: content.map(p => LP.inv.sub(p, s)),
      clueCount: (doc.clues && doc.clues.length) || 0,
      nav: {
        cards,
        inBoard: d.evidenceGraph.some(e => e.from === doc.id || e.to === doc.id)
      }
    };
  }

  function page32VM(s, d, doc) {
    const all = LP.story.PAGE32.fragments;
    const mine = all.filter(f => s.mode === 'solo' || !NEED_MODE[f.need] || NEED_MODE[f.need] === s.mode);
    const myRestored = mine.filter(f => s.ocrFragments.includes(f.id)).length;
    const restoredCount = s.ocrFragments.length;
    const pct = s.mode === 'solo'
      ? Math.round((restoredCount / all.length) * 100)
      : Math.round((myRestored / mine.length) * 100);
    const showFinal = myRestored >= mine.length;
    const done = s.completedPuzzles.includes('page32');

    return {
      visible: true,
      kind: 'page32',
      docId: doc.id,
      title: 'PAGE_032.dat',
      meta: '损坏文件 · 等待修复',
      headLeft: 'OCR RECOVERY' + (s.mode !== 'solo' ? ' · ' + (s.mode === 'A' ? '执笔者卷' : '记录者卷') : ''),
      pct,
      showScan: !showFinal,
      frags: all.map(f => {
        const restored = s.ocrFragments.includes(f.id);
        const isPartner = !restored && s.mode !== 'solo' && NEED_MODE[f.need] && NEED_MODE[f.need] !== s.mode;
        return {
          id: f.id, restored, isPartner, label: f.label,
          text: restored ? f.text : null,
          clickable: !restored && !isPartner
        };
      }),
      showFinal,
      finalText: done ? LP.story.PAGE32.final : null,
      progress: showFinal ? null : {
        mine: s.mode !== 'solo',
        restored: s.mode === 'solo' ? restoredCount : myRestored,
        total: s.mode === 'solo' ? all.length : mine.length
      }
    };
  }

  /* ---------- ② render ---------- */
  function render(vm, hosts, ctx) {
    hosts.title.textContent = vm.title;
    hosts.meta.textContent = vm.meta || '';
    hosts.stage.innerHTML = '';
    hosts.tools.innerHTML = '';
    if (vm.kind === 'page32') renderPage32(vm, hosts, ctx);
    else renderDoc(vm, hosts, ctx);
  }

  /* ---- 普通文档 / 信件 / 编目梗概 ---- */
  function renderDoc(vm, hosts, ctx) {
    const el = LP.el;
    const paper = el('div', { class: 'paper-doc' + (vm.letterBg ? ' letter-bg' : '') });
    paper.appendChild(el('h3', { text: vm.paperTitle || vm.title }));
    paper.appendChild(el('div', { class: 'pdate', text: vm.gist ? '编目摘要' : (vm.date || '') }));
    if (vm.gist) {
      paper.appendChild(el('div', { class: 'gist-note mono', text: 'RECORD GIST · 正文不在此卷' }));
    }
    vm.paras.forEach((p, i) => {
      paper.appendChild(el('p', {
        text: p,
        style: `opacity:0;animation:fragIn .8s ease ${0.15 + i * 0.18}s forwards`
      }));
    });
    if (vm.gist) {
      paper.appendChild(el('div', { class: 'gist-cta' }, [
        el('p', { class: 'serif', text: '这一页的字，写在执笔者那一卷里。让 ta 念给你听。' }),
        el('button', { class: 'btn-ghost small', text: '打开通话', onclick: () => ctx.onDuo() })
      ]));
    }
    hosts.stage.appendChild(paper);

    /* 底部工具条 */
    if (vm.gist) {
      hosts.tools.appendChild(el('span', { class: 'dim', text: `${vm.paras.length} 段 · 编目摘要（非全文）` }));
    } else {
      hosts.tools.appendChild(el('span', { class: 'dim', text: `${vm.paras.length} 段 · 扫描件` }));
      hosts.tools.appendChild(el('span', { class: 'sep' }));
      if (vm.clueCount) {
        hosts.tools.appendChild(el('span', {
          class: 'red', text: `含 ${vm.clueCount} 条可提取线索`, style: 'font-size:.65rem'
        }));
      }
    }
    /* 原件 → 调查位置（双向导航） */
    const nav = vm.nav || {};
    const hasNav = (nav.cards && nav.cards.length) || nav.inBoard;
    if (hasNav) {
      hosts.tools.appendChild(el('span', { class: 'sep' }));
      if (nav.cards && nav.cards.length) {
        hosts.tools.appendChild(el('button', {
          class: 'vt', text: '◈ 用于时间线', onclick: () => ctx.onNavTimeline(nav.cards[0])
        }));
      }
      if (nav.inBoard) {
        hosts.tools.appendChild(el('button', {
          class: 'vt', text: '◈ 证据板上的关联', onclick: () => ctx.onNavEvidence(vm.docId)
        }));
      }
    }
  }

  /* ---- PAGE_032 · OCR 修复 ---- */
  function renderPage32(vm, hosts, ctx) {
    const el = LP.el;
    const wrap = el('div', { class: 'p32-wrap' });
    wrap.appendChild(el('div', { class: 'p32-head' }, [
      el('span', { text: vm.headLeft }),
      el('span', { html: `完整度 <b>${vm.pct}%</b>` })
    ]));

    const paper = el('div', {
      class: 'p32-doc ' + (vm.showFinal ? 'p32-restored' : 'p32-damaged')
    });
    if (vm.showScan) paper.appendChild(el('div', { class: 'ocr-scan' }));

    vm.frags.forEach(f => {
      const p = el('p', { class: f.restored ? 'restored' : '' });
      if (f.restored) {
        p.appendChild(el('span', { class: 'ocr-frag', text: f.text }));
      } else {
        const g = el('span', {
          class: 'ocr-frag garbled' + (f.isPartner ? ' partner' : ''),
          text: f.isPartner ? `▓▓▓▓▓▓▓▓▓▓〔${f.label}·对方修复〕` : `▓▓▓▓▓▓▓▓▓▓〔${f.label}〕`,
          title: f.isPartner ? '这一段在你的搭档手里' : '点击尝试修复'
        });
        if (f.clickable) g.addEventListener('click', () => ctx.onRestore(f.id));
        p.appendChild(g);
      }
      paper.appendChild(p);
    });

    if (vm.showFinal) {
      /* 结尾空位：业务层负责打字机与反转旁白（见 documentSystem.afterPage32） */
      const fin = el('div', { class: 'p32-final' });
      if (vm.finalText) fin.textContent = vm.finalText;
      paper.appendChild(fin);
    } else if (vm.progress) {
      const pr = vm.progress;
      paper.appendChild(el('div', {
        class: 'p32-progress',
        html: pr.mine
          ? `你这一卷已修复 <b>${pr.restored}</b> / ${pr.total} 段`
          : `已修复 <b>${pr.restored}</b> / ${pr.total} 段`
      }));
    }

    wrap.appendChild(paper);
    hosts.stage.appendChild(wrap);

    hosts.tools.appendChild(el('span', { class: 'dim', text: '点击乱码段落，用已确证的事实修复' }));
    hosts.tools.appendChild(el('span', { class: 'sep' }));
    hosts.tools.appendChild(el('span', { class: 'dim', text: '人物 · 地点 · 时间 · 照片 · 信件', style: 'font-size:.62rem' }));
  }

  LP.ui2.register('viewer', viewModel, render);
})();
