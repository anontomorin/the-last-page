/* ============================================================
   ui2 · 屏幕：实地探索（旧钟楼 / 老街 / 渡口）
   ------------------------------------------------------------
   对应原 mapSystem 的 openScene()：把「舞台结构」交给视图层，
   交互判定仍留在 mapSystem（handleObject / ringBell / openBoard /
   tryDoor / openFerrySign）。

   分层：照片衬底 → 尘粒环境层 → 暗角白纱 → 热点层 → 叙事反馈层。

   边界说明（与 evidence / timeline 同类）：
     · viewModel 只读 state / data，输出舞台与热点描述；
     · render 只产 DOM：热点按下扩散环、局部聚焦、木牌摆动等
       「纯表现」留在视图层；热点是否已勘察（done）由 viewModel 依据
       真实 completedPuzzles 计算，不依赖临时 class；
     · 点击后的一切判定与状态变更经 ctx.onObject 回到 mapSystem。
       门闩/钟面/公告栏/船班木牌等「动态覆盖层」仍由业务层按需构建
       （与证据板关系对话框、时间线完成结论同一处理方式）。
   ============================================================ */
window.LP = window.LP || {};
(function () {

  const has = (s, k, id) => Array.isArray(s[k]) && s[k].includes(id);

  /* 场景宽幅老照片（本地生成，sepia 与档案原件一致） */
  const SCENE_IMG = {
    clocktower: 'scene_clocktower',
    oldstreet: 'scene_oldstreet',
    ferry: 'scene_ferry'
  };
  /* 竖档（移动端 ≤640px 切换；P5 派生，避免 cover 裁掉纵向构图） */
  const SCENE_TALL = {
    clocktower: 'scene_clocktower_tall',
    oldstreet: 'scene_oldstreet_tall',
    ferry: 'scene_ferry_tall'
  };

  /* 物件线性图标（与旧壳同一套 path，保持像素一致） */
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

  /* 物件的持久「已勘察」状态映射（来自真实 completedPuzzles） */
  const OBJ_DONE_PUZZLE = {
    obj_bell: 'bell7',
    obj_board: 'board_row7',
    obj_door: 'clocktower_door',
    obj_bench: 'bench_paper'
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

  function viewModel(s, d, ui) {
    const loc = d.locations[ui.locId];
    if (!loc || !loc.scene) return null;
    return {
      id: loc.id,
      name: loc.name,
      desc: loc.desc,
      scene: loc.scene,
      photo: SCENE_IMG[loc.scene] ? 'assets/images/' + SCENE_IMG[loc.scene] + '.webp' : null,
      photoTall: SCENE_TALL[loc.scene] ? 'assets/images/' + SCENE_TALL[loc.scene] + '.webp' : null,
      photoAlt: loc.name + '的旧照片',
      objects: (loc.objects || []).map(o => {
        const pz = OBJ_DONE_PUZZLE[o.id] || null;
        return {
          id: o.id, name: o.name, pos: o.pos, puzzle: pz,
          done: !!(pz && has(s, 'completedPuzzles', pz))
        };
      })
    };
  }

  function render(vm, hosts, ctx) {
    const el = LP.el;
    const svgNS = 'http://www.w3.org/2000/svg';
    const body = hosts.body;
    if (!vm) return;

    const stage = el('div', { class: 'scene-stage' });
    const msgBox = el('div', { class: 'scene-msg', text: vm.desc });

    if (vm.photo) {
      /* <picture>：移动端切竖档（无竖档的场景自动退回宽幅） */
      const pic = el('picture', {}, [
        vm.photoTall ? el('source', { media: '(max-width:640px)', srcset: vm.photoTall }) : null,
        el('img', { class: 'scene-photo', src: vm.photo, alt: vm.photoAlt, decoding: 'async' })
      ]);
      stage.appendChild(pic);
    }
    /* 环境动态层：低密度的漂移光斑与尘粒 */
    stage.appendChild(el('div', { class: 'scene-dust', 'aria-hidden': 'true' }));

    vm.objects.forEach(o => {
      /* 已勘察记号（真实状态，刷新后仍正确） */
      const chk = document.createElementNS(svgNS, 'svg');
      chk.setAttribute('viewBox', '0 0 16 16');
      chk.classList.add('obj-check');
      const cc = document.createElementNS(svgNS, 'circle');
      cc.setAttribute('cx', 8); cc.setAttribute('cy', 8); cc.setAttribute('r', 7);
      const cp = document.createElementNS(svgNS, 'path');
      cp.setAttribute('d', 'M4.5 8.2 L7 10.6 L11.5 5.6');
      chk.appendChild(cc); chk.appendChild(cp);

      const node = el('div', {
        class: 'scene-obj' + (o.done ? ' done' : ''),
        'data-pos': o.pos, 'data-obj': o.id,
        tabindex: '0', role: 'button', 'aria-label': '检查：' + o.name
      }, [
        objIcon(o.id),
        el('div', { class: 'obj-label', text: o.name }),
        el('span', { class: 'obj-pulse', 'aria-hidden': 'true' }),
        chk
      ]);

      node.addEventListener('click', e => {
        /* 纯表现反馈：扩散环 + 局部聚焦（不动命中区域） */
        node.classList.remove('pulsing'); void node.offsetWidth; node.classList.add('pulsing');
        node.classList.add('pressed');
        node.classList.remove('focus-in'); void node.offsetWidth; node.classList.add('focus-in');
        if (LP.anim.after) {
          LP.anim.after(node, () => node.classList.remove('pressed'), 260);
          LP.anim.after(node, () => node.classList.remove('focus-in'), 700);
        } else {
          setTimeout(() => node.classList.remove('pressed'), 260);
          setTimeout(() => node.classList.remove('focus-in'), 700);
        }
        ctx.onObject(o.id, node, e, stage, msgBox);
      });
      node.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); node.click(); }
      });
      stage.appendChild(node);
    });

    body.appendChild(stage);
    body.appendChild(msgBox);
    ctx.afterRender(stage, msgBox);
  }

  LP.ui2.register('scene', viewModel, render);
  /* 供业务层在「首次勘察完成」时补一次入档反馈（DOM 留在视图层） */
  LP.ui2.scene = {
    found(elx) {
      if (!elx) return;
      elx.classList.add('done', 'found');
      if (LP.anim.after) LP.anim.after(elx, () => elx.classList.remove('found'), 700);
      else setTimeout(() => elx.classList.remove('found'), 700);
    }
  };
})();
