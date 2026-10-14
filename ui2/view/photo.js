/* ============================================================
   ui2 视图层 · 照片查看器
   ------------------------------------------------------------
   两个纯函数：
     viewModel(state, data, ui) → vm
     render(vm, hosts, ctx)

   放大 / 旋转 / 平移 / 是否翻面属于**视图本地状态**（不入存档），
   由 render 内部闭包持有；翻面所引发的业务（记录翻面、发现线索）
   通过 ctx.onFlipped 交回 photoSystem。
   DOM 复用现有类名，故本模块不携带样式。
   ============================================================ */
(function () {

  /* 合影四人站位（与画面一致，左起：男/女/男/女） */
  const FACES = {
    photo_09: ['person_chen', 'person_zhou', 'person_linyuan', 'person_li']
  };

  /* ---------- ① view-model ---------- */
  function viewModel(s, d, ui) {
    const id = ui && ui.id;
    const doc = id ? d.documents[id] : null;
    if (!doc) return { visible: false };

    const creaseClue = doc.back && doc.back.creaseClue;
    const cards = (LP.timeline && LP.timeline.cardsForDoc) ? LP.timeline.cardsForDoc(id) : [];

    return {
      visible: true,
      kind: 'photo',
      docId: id,
      title: LP.inv.sub(doc.title, s),
      meta: `${doc.meta.file} · ${doc.meta.size} · ${doc.meta.scan}`,
      src: doc.src,
      alt: doc.title,
      backText: LP.inv.sub(doc.back.text, s),
      hasCrease: !!doc.back.crease,
      revealed: !!(creaseClue && s.discoveredEvidence.includes(creaseClue)),
      caption: FACES[id]
        ? '从左到右：' + FACES[id].map(pid => {
          const p = d.people[pid];
          return (p.known || s.discoveredPeople.includes(pid)) ? p.name : '？';
        }).join(' · ')
        : null,
      metaRows: [
        `FILE&nbsp;&nbsp;<b>${doc.meta.file}</b>`,
        `SIZE&nbsp;&nbsp;${doc.meta.size} · ${doc.meta.scan}`,
        doc.meta.note ? `NOTE&nbsp;&nbsp;${doc.meta.note}` : null,
        (doc.back && doc.back.crease) ? 'ANOMALY&nbsp;&nbsp;右下折痕 · 待查' : null
      ].filter(Boolean),
      nav: {
        cards,
        inBoard: d.evidenceGraph.some(e => e.from === id || e.to === id)
      }
    };
  }

  /* ---------- ② render ---------- */
  function render(vm, hosts, ctx) {
    const el = LP.el;
    hosts.title.textContent = vm.title;
    hosts.meta.textContent = vm.meta;
    hosts.stage.innerHTML = '';
    hosts.tools.innerHTML = '';

    /* 视图本地状态（会话内，不入存档） */
    let zoom = 1, rot = 0, flipped = false, tx = 0, ty = 0;

    const col = el('div', { class: 'photo-col' });
    const wrap = el('div', { class: 'photo-wrap' });
    const card = el('div', { class: 'photo-card' });
    const face = el('div', { class: 'photo-face' });
    const img = el('img', { src: vm.src, alt: vm.alt, draggable: 'false' });
    face.appendChild(img);

    /* 背面（带折痕的照片用生成的背面细节图作衬底） */
    const back = el('div', { class: 'photo-back' + (vm.hasCrease ? ' crease-bg' : '') });
    back.appendChild(el('div', { class: 'btext', text: vm.backText }));
    if (vm.hasCrease) {
      const crease = el('div', { class: 'photo-crease', title: '右下角有一道折痕' });
      crease.addEventListener('click', e => { e.stopPropagation(); ctx.onCrease(back); });
      back.appendChild(crease);
      back.appendChild(el('span', { class: 'crease-sweep', 'aria-hidden': 'true' }));
    }

    card.appendChild(face);
    card.appendChild(back);
    wrap.appendChild(card);
    col.appendChild(wrap);
    if (vm.caption) col.appendChild(el('div', { class: 'photo-caption serif', text: vm.caption }));
    hosts.stage.appendChild(col);

    const apply = () => {
      img.style.transform = `scale(${zoom}) rotate(${rot}deg) translate(${tx / zoom}px,${ty / zoom}px)`;
    };
    const applyFlip = v => {
      flipped = v == null ? !flipped : v;
      card.classList.toggle('flipped', flipped);
      LP.audio.paper();
      /* 业务侧：记录翻面、发现背面线索（含 B 卷专属逻辑） */
      if (flipped) ctx.onFlipped(vm.docId);
    };

    /* 拖动（仅放大后平移） */
    let dragging = false, sx = 0, sy = 0;
    img.addEventListener('pointerdown', e => {
      if (zoom <= 1) return;
      dragging = true; sx = e.clientX - tx; sy = e.clientY - ty;
      img.classList.add('dragging');
      img.setPointerCapture(e.pointerId);
    });
    img.addEventListener('pointermove', e => {
      if (!dragging) return;
      tx = e.clientX - sx; ty = e.clientY - sy; apply();
    });
    img.addEventListener('pointerup', () => { dragging = false; img.classList.remove('dragging'); });

    /* 工具栏 */
    const mk = (label, fn) => el('span', { class: 'vt', text: label, onclick: fn });
    hosts.tools.appendChild(mk('放大', () => { zoom = Math.min(4, zoom + .5); LP.audio.click(); apply(); }));
    hosts.tools.appendChild(mk('缩小', () => { zoom = Math.max(1, zoom - .5); if (zoom === 1) { tx = ty = 0; } LP.audio.click(); apply(); }));
    hosts.tools.appendChild(mk('旋转', () => { rot = (rot + 90) % 360; LP.audio.click(); apply(); }));
    hosts.tools.appendChild(mk('翻面', () => applyFlip()));
    hosts.tools.appendChild(el('span', { class: 'sep' }));
    hosts.tools.appendChild(mk('档案信息', () => toggleMeta(face, vm.metaRows)));
    /* 原件 → 调查位置：这张照片被用在哪 */
    if (vm.nav.cards.length) {
      hosts.tools.appendChild(mk('◈ 用于时间线', () => ctx.onNavTimeline(vm.nav.cards[0])));
    }
    if (vm.nav.inBoard) {
      hosts.tools.appendChild(mk('◈ 证据板', () => ctx.onNavEvidence(vm.docId)));
    }
  }

  /* 元信息面板（含隐藏 ARG 文件名 IMG_0317.jpg） */
  function toggleMeta(face, rows) {
    const old = LP.$('.photo-meta', face);
    if (old) { old.remove(); return; }
    LP.audio.click();
    face.appendChild(LP.el('div', { class: 'photo-meta', html: rows.join('<br>') }));
  }

  LP.ui2.register('photo', viewModel, render);
})();
