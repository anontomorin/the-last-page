/* ============================================================
   照片查看器 —— 放大 / 拖动 / 旋转 / 翻面 / 折痕 / 人脸高亮
   ============================================================ */
window.LP = window.LP || {};
LP.photo = (function () {

  /* 合影四人站位（与画面一致，左起：男/女/男/女）：用于底部姓名条，身份随剧情逐步揭示 */
  const FACES = {
    photo_09: ['person_chen', 'person_zhou', 'person_linyuan', 'person_li']
  };

  function open(id) {
    const doc = LP.data.documents[id];
    if (!doc) return;
    LP.audio.open();

    LP.$('#viewer-title').textContent = LP.inv.sub(doc.title);
    LP.$('#viewer-meta').textContent = `${doc.meta.file} · ${doc.meta.size} · ${doc.meta.scan}`;
    const stage = LP.$('#viewer-stage');
    const tools = LP.$('#viewer-tools');
    stage.innerHTML = ''; tools.innerHTML = '';

    let zoom = 1, rot = 0, flipped = false, tx = 0, ty = 0;

    const col = LP.el('div', { class: 'photo-col' });
    const wrap = LP.el('div', { class: 'photo-wrap' });
    const card = LP.el('div', { class: 'photo-card' });
    const face = LP.el('div', { class: 'photo-face' });
    const img = LP.el('img', { src: doc.src, alt: doc.title, draggable: 'false' });
    face.appendChild(img);

    /* 背面 */
    const back = LP.el('div', { class: 'photo-back' });
    const btext = LP.el('div', { class: 'btext', text: LP.inv.sub(doc.back.text) });
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
    col.appendChild(wrap);

    /* 合影姓名条：随身份确认逐步揭示 */
    if (FACES[id]) {
      const names = FACES[id].map(pid => {
        const p = LP.data.people[pid];
        const known = p.known || LP.state.has('discoveredPeople', pid);
        return known ? p.name : '？';
      });
      col.appendChild(LP.el('div', {
        class: 'photo-caption serif',
        text: '从左到右：' + names.join(' · ')
      }));
    }
    stage.appendChild(col);

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

  /* ---------------- 照片排序谜题（第四幕解锁） ---------------- */
  /* 正确顺序：按 IMG 编号（月日在前，顺序在后） */
  const SORT_IDS = ['photo_01', 'photo_02', 'photo_03', 'photo_04', 'photo_05', 'photo_06', 'photo_07', 'photo_08'];
  /* 打乱后的初始顺序（固定，避免随机） */
  const SORT_SHUFFLED = ['photo_05', 'photo_08', 'photo_01', 'photo_07', 'photo_06', 'photo_03', 'photo_02', 'photo_04'];

  function openSort() {
    const s = LP.state.get();
    if (s.act < 4) { LP.ui.toast('时机未到——先修复时间线。'); return; }
    if (s.completedPuzzles.includes('photo_sort')) { LP.ui.toast('顺序已经校验过了。'); return; }
    if (LP.$('.ps-overlay')) return; // 防重复叠加

    LP.audio.open();
    const overlay = LP.el('div', { class: 'ps-overlay' });
    const panel = LP.el('div', { class: 'ps-panel' });
    panel.appendChild(LP.el('div', { class: 'mono ps-head', text: 'PHOTO ORDER VERIFICATION · 拍摄顺序校验' }));
    panel.appendChild(LP.el('p', {
      class: 'ps-tip serif',
      text: '李禾给照片编号时「月日在前，顺序在后」。把八张照片按拍摄先后排好——文件名就是答案。点选两张可交换位置。'
    }));

    const row = LP.el('div', { class: 'ps-row' });
    let current = SORT_SHUFFLED.slice();
    let picked = null;

    function draw() {
      row.innerHTML = '';
      current.forEach(id => {
        const d = LP.data.documents[id];
        const card = LP.el('div', { class: 'ps-card' + (picked === id ? ' picked' : ''), 'data-id': id }, [
          LP.el('div', { class: 'mono ps-file', text: d.meta.file }),
          LP.el('div', { class: 'ps-title', text: d.title.replace('旧照片 · ', '') })
        ]);
        card.addEventListener('click', () => {
          LP.audio.click();
          if (!picked) { picked = id; draw(); return; }
          if (picked === id) { picked = null; draw(); return; }
          const a = current.indexOf(picked), b = current.indexOf(id);
          [current[a], current[b]] = [current[b], current[a]];
          picked = null;
          LP.audio.paper();
          draw();
        });
        row.appendChild(card);
      });
    }
    draw();
    panel.appendChild(row);

    const btns = LP.el('div', { class: 'ps-actions' });
    btns.appendChild(LP.el('button', {
      class: 'btn-primary', text: '校验顺序',
      onclick: () => {
        if (current.every((id, i) => id === SORT_IDS[i])) {
          LP.audio.complete();
          LP.anim.flash();
          LP.inv.completePuzzle('photo_sort');
          LP.inv.discoverClue('clue_photosort');
          LP.state.addTo('unlockedDocs', 'photo_12');
          close();
          LP.ui.narrate([
            '编号即日期。',
            '她用最笨的办法，替所有人守住了时间的顺序。',
            '档案深处，有一张新的照片浮出了水面。'
          ], () => LP.ui.toast('获得资料：旧照片 · 开着的门', 'gold'));
          LP.bus.emit('refresh');
        } else {
          LP.audio.error();
          LP.anim.shake(row);
          LP.ui.toast('顺序不对——再看一遍文件名。', 'red');
        }
      }
    }));
    btns.appendChild(LP.el('button', { class: 'btn-ghost', text: '收起', onclick: close }));
    panel.appendChild(btns);

    overlay.appendChild(panel);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    function close() { LP.audio.click(); overlay.remove(); }
  }

  return { open, openSort };
})();
