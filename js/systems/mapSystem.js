/* ============================================================
   地图系统 —— SVG 城区旧图 + 地点场景（旧钟楼 / 老街 / 渡口）
   ============================================================ */
window.LP = window.LP || {};
LP.map = (function () {

  /* ---------------- SVG 地图 ---------------- */
  const LINKS = [
    ['location_archive', 'location_clocktower'],
    ['location_clocktower', 'location_oldstreet'],
    ['location_oldstreet', 'location_ferry']
  ];

  /* ---------------- 现场走访的归属 ----------------
     双人模式下，现场只属于记录者（B）：ta 扛着相机跑现场。
     执笔者（A）留在档案馆里翻纸页，一切都只能靠听。 */
  function canEnterScene() {
    return LP.state.get().mode !== 'A';
  }
  function tellNoScene(locName) {
    LP.audio.error();
    LP.ui.toast('现场由你的记录者走访 —— 让 ta 把看到的东西念给你听。', 'gold');
    setTimeout(() => { if (LP.duo) LP.duo.openPanel(); }, 260);
  }

  function renderMap(container) {
    container.innerHTML = '';
    const s = LP.state.get();
    const wrap = LP.el('div', { class: 'map-wrap' });

    // 执笔者卷：地图只是纸上的位置，现场不属于 ta
    if (!canEnterScene()) {
      wrap.appendChild(LP.el('div', { class: 'map-duo-note' }, [
        LP.el('div', { class: 'mono', text: 'FIELD WORK · NOT IN THIS VOLUME', style: 'font-size:.6rem;letter-spacing:.3em;color:var(--red)' }),
        LP.el('p', {
          class: 'serif',
          text: '你留在档案馆里翻纸页。钟楼、老街、渡口，都由你的记录者一趟趟走过去——ta 看到什么，会念给你听。'
        }),
        LP.el('button', { class: 'btn-ghost small', text: '打开通话', onclick: () => LP.duo.openPanel() })
      ]));
    }
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.classList.add('map-svg');

    // 底纹：河流
    const river = document.createElementNS(svgNS, 'path');
    river.setAttribute('d', 'M0,78 Q30,72 52,80 T100,86');
    river.setAttribute('stroke', 'rgba(142,27,27,.18)');
    river.setAttribute('stroke-width', '5');
    river.setAttribute('fill', 'none');
    svg.appendChild(river);

    // 连线（两端都解锁才画）
    LINKS.forEach(([a, b]) => {
      const la = LP.data.locations[a], lb = LP.data.locations[b];
      if (!la || !lb) return;
      if (!LP.archive.locationUnlocked(la) || !LP.archive.locationUnlocked(lb)) return;
      const line = document.createElementNS(svgNS, 'path');
      line.setAttribute('d', `M${la.x},${la.y} Q${(la.x + lb.x) / 2},${(la.y + lb.y) / 2 - 6} ${lb.x},${lb.y}`);
      line.classList.add('map-path');
      svg.appendChild(line);
    });

    // 节点
    Object.values(LP.data.locations).forEach(loc => {
      const unlocked = LP.archive.locationUnlocked(loc);
      const g = document.createElementNS(svgNS, 'g');
      g.classList.add('map-node');
      if (!unlocked) g.classList.add('locked');
      else if (!LP.state.has('discoveredLocations', loc.id) && loc.id !== 'location_archive') g.classList.add('new');

      const c = document.createElementNS(svgNS, 'circle');
      c.setAttribute('cx', loc.x); c.setAttribute('cy', loc.y);
      c.setAttribute('r', loc.modern ? 3.4 : 2.6);
      c.classList.add('circle');
      g.appendChild(c);

      const t = document.createElementNS(svgNS, 'text');
      t.setAttribute('x', loc.x); t.setAttribute('y', loc.y - 5);
      t.textContent = unlocked ? loc.name : '？？？';
      g.appendChild(t);

      const yr = document.createElementNS(svgNS, 'text');
      yr.setAttribute('x', loc.x); yr.setAttribute('y', loc.y + 6.5);
      yr.classList.add('yr');
      yr.textContent = unlocked ? loc.year : '——';
      g.appendChild(yr);

      if (unlocked) {
        g.addEventListener('click', () => {
          LP.audio.click();
          if (loc.scene) {
            if (!canEnterScene()) return tellNoScene(loc.name);
            LP.state.addTo('discoveredLocations', loc.id);
            openScene(loc.id);
          } else {
            LP.ui.toast(loc.desc);
          }
        });
      }
      svg.appendChild(g);
    });

    wrap.appendChild(svg);
    const legend = canEnterScene()
      ? ['◦ 红圈标记：与档案相关的地点', '◦ 虚线圈：尚未发现', '◦ 点击已解锁地点进入现场']
      : ['◦ 红圈标记：与档案相关的地点', '◦ 虚线圈：尚未发现', '◦ 现场由记录者走访 —— 你只能听 ta 描述'];
    wrap.appendChild(LP.el('div', { class: 'map-legend' }, legend.map(t => LP.el('span', { text: t }))));
    container.appendChild(wrap);
  }

  function focusMap() { LP.archive.setTab('map'); }

  /* ---------------- 场景 ---------------- */
  const OBJ_ICONS = {
    obj_bell:  'M32 8 C18 8 12 22 12 34 L10 42 L54 42 L52 34 C52 22 46 8 32 8 Z M32 46 L32 52 M26 56 L38 56',
    obj_wall:  'M8 16 L56 16 L56 52 L8 52 Z M8 28 L56 28 M8 40 L56 40 M20 16 L20 28 M44 16 L44 28 M32 28 L32 40 M14 40 L14 52 M50 40 L50 52',
    obj_board: 'M10 10 L54 10 L54 44 L10 44 Z M16 18 L48 18 M16 24 L48 24 M16 30 L48 30 M16 36 L40 36 M20 44 L20 54 M44 44 L44 54',
    obj_bench: 'M8 30 L56 30 M12 30 L12 44 M52 30 L52 44 M8 38 L56 38 M12 44 L10 52 M52 44 L54 52',
    obj_door:  'M18 8 L46 8 L46 56 L18 56 Z M40 32 L43 32 M18 8 L46 8',
    obj_shop:  'M10 24 L54 24 L50 12 L14 12 Z M14 24 L14 52 L50 52 L50 24 M24 34 L40 34 M24 42 L40 42',
    obj_stone: 'M10 40 L54 40 M14 40 L12 52 L52 52 L50 40 M20 28 L44 28 M22 28 L20 40 M42 28 L44 40 M28 16 L36 16',
    obj_river: 'M8 24 C18 20 26 28 36 24 C44 21 50 27 56 24 M8 36 C18 32 26 40 36 36 C44 33 50 39 56 36 M8 48 C18 44 26 52 36 48 C44 45 50 51 56 48',
    obj_post:  'M24 8 L24 56 M40 8 L40 56 M18 20 L46 20 M18 32 L46 32 M16 56 L48 56',
    obj_sign:  'M12 10 L52 10 L52 34 L12 34 Z M20 34 L20 54 M44 34 L44 54 M18 18 L46 18 M18 26 L40 26'
  };

  function objIcon(id) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 64 64');
    const p = document.createElementNS(svgNS, 'path');
    p.setAttribute('d', OBJ_ICONS[id] || 'M32 8 L56 56 L8 56 Z');
    svg.appendChild(p);
    return svg;
  }

  function openScene(locId) {
    const loc = LP.data.locations[locId];
    if (!loc || !loc.scene) return;
    if (!canEnterScene()) return tellNoScene(loc.name);
    LP.router.go('scene');
    LP.$('#scene-title').textContent = loc.name;
    LP.$('#scene-sub').textContent = loc.desc;
    const body = LP.$('#scene-body');
    body.innerHTML = '';

    const stage = LP.el('div', { class: 'scene-stage' });
    const msgBox = LP.el('div', { class: 'scene-msg', text: loc.desc });

    (loc.objects || []).forEach(obj => {
      const el = LP.el('div', { class: 'scene-obj', 'data-pos': obj.pos, 'data-obj': obj.id }, [
        objIcon(obj.id),
        LP.el('div', { class: 'obj-label', text: obj.name })
      ]);
      el.addEventListener('click', () => handleObject(loc.scene, obj.id, el, msgBox, stage));
      stage.appendChild(el);
    });

    body.appendChild(stage);
    body.appendChild(msgBox);
  }

  function setMsg(box, text) {
    LP.audio.paper();
    box.textContent = text;
    LP.anim.flash && box.animate(
      [{ opacity: .3 }, { opacity: 1 }], { duration: 400 });
  }
  function markDone(el) { el.classList.add('done'); }

  function handleObject(scene, objId, el, msgBox, stage) {
    const S = LP.story[scene.toUpperCase()];
    const obj = S && S[objId];
    if (!obj) return;

    /* ---- 旧钟楼 ---- */
    if (objId === 'obj_bell') return ringBell(el, msgBox, stage);
    if (objId === 'obj_wall') {
      markDone(el);
      return setMsg(msgBox, obj.text + '\n' + obj.text2);
    }
    if (objId === 'obj_bench') {
      markDone(el);
      // 长椅缝里的纸条：只说明「以钟声为号」，那个数字被水泡烂了 —— 必须听执笔者念日记
      if (LP.state.addTo('completedPuzzles', 'bench_paper')) {
        setTimeout(() => {
          LP.ui.toast('记下了：以钟声为号。可响几下，纸上看不出来。', 'gold');
          if (LP.state.get().mode === 'B') {
            setTimeout(() => LP.ui.toast('这张纸是从执笔者那本日记上撕下来的 —— 让 ta 把那一页念给你听。', 'gold'), 1300);
          }
        }, 500);
      }
      return setMsg(msgBox, obj.text + '\n' + obj.paper);
    }
    if (objId === 'obj_board') return openBoard(obj, el, msgBox, stage);
    if (objId === 'obj_door') return tryDoor(obj, el, msgBox);
    if (objId === 'obj_sign') return openFerrySign(obj, el, msgBox, stage);

    /* ---- 老街 / 渡口 ---- */
    markDone(el);
    setMsg(msgBox, obj.text);
  }

  /* 旧钟：连点七次 */
  function ringBell(el, msgBox, stage) {
    const s = LP.state.get();
    const C = LP.story.CLOCKTOWER.obj_bell;

    // 记录者卷：日记里那句被墨盖住了 —— 次数必须由执笔者口述获得（钟楼里没有第二处写着这个数）
    const needCount = s.mode === 'B' && !s.completedPuzzles.includes('duo_bell7');
    if (needCount) {
      LP.audio.error();
      setMsg(msgBox, C.needCount + '\n' + C.needCount2);
      LP.ui.toast('你还不知道该敲几下 —— 打开「通话」，让执笔者念日记给你听。', 'gold');
      return;
    }

    if (s.bellRings >= 7) {
      return setMsg(msgBox, C.after);
    }
    let clockEl = LP.$('.clock-face', stage);
    if (!clockEl) {
      clockEl = LP.el('div', { class: 'clock-face' }, [
        LP.el('div', { class: 'clock-hand h', style: 'transform:rotate(218.5deg)' }), // 7:17, matches photo
        LP.el('div', { class: 'clock-hand m', style: 'transform:rotate(102deg)' }),
        LP.el('div', { class: 'clock-center' })
      ]);
      clockEl.style.cssText = 'position:absolute;top:14%;left:50%;transform:translateX(-50%) scale(.55)';
      stage.appendChild(clockEl);
    }
    const n = s.bellRings + 1;
    LP.state.set({ bellRings: n });
    LP.audio.clock();
    LP.anim.flash();
    clockEl.classList.remove('ringing'); void clockEl.offsetWidth; clockEl.classList.add('ringing');

    // 双人 B 卷：不报"第几声"，只给钟声本身，让玩家口头数给搭档听
    if (s.mode === 'B') {
      setMsg(msgBox, n >= 7 ? C.after : '咚——');
    } else {
      setMsg(msgBox, C.ringing(n));
    }

    if (n >= 7) {
      LP.inv.completePuzzle('bell7');
      LP.inv.discoverClue('clue_717');
      // 钟面始终停在照片记录的 7:17；七声只触发连到门闩的铁索。
      if (s.mode === 'B') {
        setTimeout(() => setMsg(msgBox,
          C.after + '\n钟敲了七下。告诉你的执笔者——ta 那边的日记，也是这么写的。'), 900);
      } else {
        setTimeout(() => setMsg(msgBox, C.after), 900);
      }
    }
  }

  /* 公告栏：十二行，第七行 */
  function openBoard(obj, el, msgBox, stage) {
    const old = LP.$('.board-paper', stage.parentElement);
    if (old) { old.remove(); return; }
    LP.audio.paper();

    const has717 = LP.state.has('discoveredEvidence', 'clue_717');
    const revealed = LP.state.has('completedPuzzles', 'board_row7');

    const paper = LP.el('div', { class: 'board-paper' });
    paper.appendChild(LP.el('h4', { text: '阅览室轮值通知' }));
    const lines = ['正月 初一　李　禾', '正月 十五　陈　川', '二月 初二　林　远', '二月 十六　周　宁',
      '三月 初一　李　禾', '三月 初十　陈　川', '联络人　周　宁', '三月 十七　林　远',
      '三月 廿二　李　禾', '四月 初一　陈　川', '四月 初九　周　宁', '四月 二十　林　远'];
    lines.forEach((txt, i) => {
      const row = i + 1;
      const isRow7 = row === 7;
      const blurred = isRow7 && !revealed;
      const line = LP.el('div', {
        class: 'board-line' + (blurred ? ' blurred' : '') + (isRow7 && revealed ? ' revealed' : '')
      }, [
        LP.el('span', { class: 'ln', text: String(row).padStart(2, '0') }),
        LP.el('span', { class: 'lt', text: txt })
      ]);
      line.addEventListener('click', () => {
        if (isRow7 && revealed) return setMsg(msgBox, obj.row7);
        if (!has717) { LP.audio.error(); return setMsg(msgBox, obj.needClue); }
        if (!isRow7) { LP.audio.click(); return setMsg(msgBox, obj.wrongRow); }
        // 第七行 + 已知 7:17 → 揭示
        line.classList.remove('blurred');
        line.classList.add('revealed');
        LP.audio.complete();
        LP.anim.flash();
        markDone(el);
        LP.inv.completePuzzle('board_row7');
        setMsg(msgBox, obj.row7);
        // 双人 B 卷：名字要"念给"执笔者听；A 拼入碎片后才真正确认人物
        if (LP.state.get().mode === 'B') {
          setTimeout(() => {
            LP.ui.toast('把第七行的名字念给你的执笔者——人物档案在 ta 手里。', 'gold');
            LP.inv.discoverClue('clue_zhou_name', true);
          }, 800);
        } else {
          setTimeout(() => LP.inv.discoverClue('clue_zhou_name'), 800);
        }      });
      paper.appendChild(line);
    });
    stage.parentElement.appendChild(paper);
    paper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* 旧木门：钟响七次后可开 */
  function tryDoor(obj, el, msgBox) {
    if (LP.state.has('completedPuzzles', 'clocktower_door')) {
      return setMsg(msgBox, obj.inside);
    }
    if (LP.state.get().bellRings >= 7) {
      LP.audio.unlock();
      markDone(el);
      LP.inv.completePuzzle('clocktower_door');
      setMsg(msgBox, obj.open + '\n' + obj.inside);
      // 双人 B 卷：信件归执笔者——B 把内容念给 A，A 才能"读全"
      if (LP.state.get().mode === 'B') {
        setTimeout(() => LP.ui.narrate([
          '门缝里卡着一个折得很小的纸包。是一封信。',
          '「远：布告我贴在钟楼里了。记住，第七行。」',
          '「我记得走的那天下着雨，冷得很。你在本子上却写『天气很好』。」',
          '——这封信属于执笔者卷，ta 手里那张被水渍糊了半句。',
          '打开「通话」，把信念给 ta 听。'
        ]), 700);
      } else {
        LP.state.addTo('unlockedDocs', 'letter_02');
        setTimeout(() => {
          LP.ui.toast('获得资料：信件 · 门缝里的纸（残页 —— 最后一句被水渍糊住了）', 'gold');
          LP.anim.flash();
          if (LP.state.get().mode === 'A') {
            setTimeout(() => LP.ui.toast('让记录者把完整的信念给你听。', 'gold'), 1200);
          }
        }, 700);
      }
      return;
    }
    LP.audio.error();
    setMsg(msgBox, obj.locked);
  }

  /* 渡口：船班木牌，「卯时三刻」被反复描深 */
  function openFerrySign(obj, el, msgBox, stage) {
    const old = LP.$('.board-paper', stage.parentElement);
    if (old) { old.remove(); return; }
    LP.audio.paper();

    const found = LP.state.has('discoveredEvidence', 'clue_ferry_time');
    const paper = LP.el('div', { class: 'board-paper' });
    paper.appendChild(LP.el('h4', { text: '渡 船 时 刻' }));
    paper.appendChild(LP.el('p', {
      class: 'dim', text: obj.text,
      style: 'font-size:.78rem;margin-bottom:.6rem'
    }));
    obj.times.forEach(t => {
      const isDeep = t === obj.deep;
      const line = LP.el('div', {
        class: 'board-line' + (isDeep && found ? ' revealed' : '')
      }, [
        LP.el('span', { class: 'ln', text: '·' }),
        LP.el('span', { class: 'lt', text: t })
      ]);
      line.addEventListener('click', () => {
        if (!isDeep) { LP.audio.click(); return setMsg(msgBox, obj.ordinary); }
        if (found) return setMsg(msgBox, obj.deepText);
        markDone(el);
        LP.audio.complete();
        LP.anim.flash();
        line.classList.add('revealed');
        setMsg(msgBox, obj.deepText + '\n' + obj.deepText2);
        setTimeout(() => LP.inv.discoverClue('clue_ferry_time'), 800);
      });
      paper.appendChild(line);
    });
    stage.parentElement.appendChild(paper);
    paper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function init() {
    LP.$('#btn-scene-back').addEventListener('click', () => {
      LP.audio.click();
      LP.router.go('archive');
      LP.archive.refreshAll();
    });
  }

  return { renderMap, openScene, focusMap, init };
})();
