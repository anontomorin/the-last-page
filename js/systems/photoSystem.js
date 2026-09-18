/* ============================================================
   照片查看器 —— 放大 / 拖动 / 旋转 / 翻面 / 折痕 / 人脸高亮
   ============================================================ */
window.LP = window.LP || {};
LP.photo = (function () {

  /* 合影四人位置（百分比，左起：陈川 林远 周宁 李禾） */
  const FACES = {
    photo_01: [
      { pid: 'person_chen',    x: 13, y: 26, w: 17, h: 52 },
      { pid: 'person_linyuan', x: 33, y: 23, w: 17, h: 55 },
      { pid: 'person_zhou',    x: 53, y: 22, w: 17, h: 56 },
      { pid: 'person_li',      x: 73, y: 27, w: 15, h: 51 }
    ]
  };

  function open(id) {
    const doc = LP.data.documents[id];
    if (!doc) return;
    LP.audio.open();

    LP.$('#viewer-title').textContent = doc.title;
    LP.$('#viewer-meta').textContent = `${doc.meta.file} · ${doc.meta.size} · ${doc.meta.scan}`;
    const stage = LP.$('#viewer-stage');
    const tools = LP.$('#viewer-tools');
    stage.innerHTML = ''; tools.innerHTML = '';

    let zoom = 1, rot = 0, flipped = false, tx = 0, ty = 0;

    const wrap = LP.el('div', { class: 'photo-wrap' });
    const card = LP.el('div', { class: 'photo-card' });
    const face = LP.el('div', { class: 'photo-face' });
    const img = LP.el('img', { src: doc.src, alt: doc.title, draggable: 'false' });
    face.appendChild(img);

    /* 人脸高亮（已确认身份的人物） */
    (FACES[id] || []).forEach(f => {
      const p = LP.data.people[f.pid];
      const known = p && (p.known || LP.state.has('discoveredPeople', f.pid));
      if (!known) return;
      face.appendChild(LP.el('div', {
        class: 'face-mark',
        style: `left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%`
      }, [LP.el('span', { class: 'fname', text: p.name })]));
    });

    /* 背面 */
    const back = LP.el('div', { class: 'photo-back' });
    const btext = LP.el('div', { class: 'btext', text: doc.back.text });
    back.appendChild(btext);

    /* 折痕（仅 photo_01 等带折痕的照片）—— 折痕在背面，需先翻面 */
    if (doc.back.crease) {
      const crease = LP.el('div', { class: 'photo-crease', title: '右下角有一道折痕' });
      crease.addEventListener('click', e => {
        e.stopPropagation();
        revealCrease(doc, back);
      });
      back.appendChild(crease);
    }

    card.appendChild(face); card.appendChild(back);
    wrap.appendChild(card);
    stage.appendChild(wrap);

    function apply() {
      img.style.transform = `scale(${zoom}) rotate(${rot}deg) translate(${tx / zoom}px,${ty / zoom}px)`;
    }
    function applyFlip(v) {
      flipped = v == null ? !flipped : v;
      card.classList.toggle('flipped', flipped);
      LP.audio.paper();
      if (flipped) LP.state.addTo('photoFlipped', id);
    }

    /* 拖动（放大后平移） */
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
    const mk = (label, fn, cls) => LP.el('span', { class: 'vt' + (cls ? ' ' + cls : ''), text: label, onclick: fn });
    tools.appendChild(mk('放大', () => { zoom = Math.min(4, zoom + .5); LP.audio.click(); apply(); }));
    tools.appendChild(mk('缩小', () => { zoom = Math.max(1, zoom - .5); if (zoom === 1) { tx = ty = 0; } LP.audio.click(); apply(); }));
    tools.appendChild(mk('旋转', () => { rot = (rot + 90) % 360; LP.audio.click(); apply(); }));
    tools.appendChild(mk('翻面', () => applyFlip()));
    tools.appendChild(LP.el('span', { class: 'sep' }));
    tools.appendChild(mk('档案信息', () => toggleMeta(face, doc)));

    LP.$('#viewer').hidden = false;
  }

  /* 折痕里的「3-17」 */
  function revealCrease(doc, back) {
    if (LP.state.has('discoveredEvidence', doc.back.creaseClue)) {
      LP.ui.toast('折痕里压着两个数字：3-17');
      return;
    }
    back.innerHTML = '';
    back.appendChild(LP.el('div', { class: 'crease-reveal', text: '3 – 1 7' }));
    back.appendChild(LP.el('div', {
      class: 'btext', text: '折痕里，压着两个手写的数字。',
      style: 'margin-top:1rem'
    }));
    LP.audio.complete();
    LP.anim.flash();
    setTimeout(() => {
      LP.inv.discoverClue(doc.back.creaseClue);
      LP.ui.narrate([
        '3-17。',
        '三月十七日？还是……某个编号？',
        '也许，日记里有答案。'
      ]);
    }, 900);
  }

  /* 元信息面板（含隐藏 ARG 文件名 IMG_0317.jpg） */
  function toggleMeta(face, doc) {
    const old = LP.$('.photo-meta', face);
    if (old) { old.remove(); return; }
    LP.audio.click();
    const rows = [
      `FILE&nbsp;&nbsp;<b>${doc.meta.file}</b>`,
      `SIZE&nbsp;&nbsp;${doc.meta.size} · ${doc.meta.scan}`,
      doc.meta.note ? `NOTE&nbsp;&nbsp;${doc.meta.note}` : null,
      doc.back && doc.back.crease ? 'ANOMALY&nbsp;&nbsp;右下折痕 · 待查' : null
    ].filter(Boolean);
    face.appendChild(LP.el('div', { class: 'photo-meta', html: rows.join('<br>') }));
  }

  return { open };
})();
