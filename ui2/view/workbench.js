/* ============================================================
   ui2 · 屏幕：档案工作台
   ------------------------------------------------------------
   原 archiveSystem 的四个渲染单元，各自注册为一个 ui2 视图：
     wbList     ← renderList()            左侧资料清单
     wbEmpty    ← renderPhotoSortBanner() 中央空态（含照片顺序校验横幅）
     wbPreview  ← renderPreviewCard(doc)  资料预览卡
     wbPeople   ← renderPersonGrid()      人物档案网格

   边界（同 P2，见 REBUILD_REPORT）：
     · viewModel(s, d, ui) 只读传入的 state / data，输出纯数据；
     · render(vm, hosts, ctx) 只产 DOM，不读写 LP.state；
       一切判定与状态变更（打开资料、追踪人物、打开通话）经 ctx 回传 systems。
   ============================================================ */
window.LP = window.LP || {};
(function () {

  const has = (s, k, id) => Array.isArray(s[k]) && s[k].includes(id);

  /* ---------- 纯谓词：解锁判定（语义与 LP.archive 保持一致） ---------- */
  function isUnlocked(item, s) {
    if (!item.unlock || item.unlock === 'start') return s.act >= 1;
    if (has(s, 'unlockedDocs', item.id)) return true;
    switch (item.unlock) {
      case 'act1_done': return s.act >= 2;
      case 'act2':      return s.act >= 2;
      case 'act2_door': return has(s, 'completedPuzzles', 'clocktower_door');
      case 'act3':      return s.act >= 3;
      case 'act4':      return s.act >= 4;
      case 'act5':      return s.act >= 5;
      default:          return false;
    }
  }
  function locationUnlocked(loc, s) {
    if (loc.unlock === 'start') return s.act >= 1;
    if (loc.unlock === 'act1_done') return s.act >= 2;
    if (loc.unlock === 'act3') return s.act >= 3;
    if (loc.unlock === 'act4') return s.act >= 4;
    return false;
  }

  /* ---------- 相关资料标签：只暴露已确证的信息，避免剧透 ---------- */
  function relLabel(s, d, rid) {
    const person = d.people[rid];
    if (person) return (person.known || has(s, 'discoveredPeople', rid)) ? person.name : null;
    const loc = d.locations[rid];
    if (loc) return has(s, 'discoveredLocations', rid) ? loc.name : null;
    const doc = d.documents[rid];
    if (!doc) return null;
    if (!isUnlocked(doc, s)) return null;
    if (!LP.inv.docVisible(doc, s)) return null;
    return LP.inv.sub(doc.title, s);
  }

  /* ============================================================
     ① wbList —— 左侧资料清单
     ============================================================ */
  function listItems(s, d, tab) {
    if (tab === 'diary' || tab === 'photo' || tab === 'letter') {
      return Object.values(d.documents)
        .filter(x => x.type === tab && LP.inv.docVisible(x, s))
        .sort((a, b) => a.no.localeCompare(b.no));
    }
    if (tab === 'map') return Object.values(d.locations);
    if (tab === 'person') return Object.values(d.people);
    if (tab === 'evidence') return Object.values(d.clues).filter(c => has(s, 'discoveredEvidence', c.id));
    return [];                                   // timeline：在中央区域操作
  }

  function listVM(s, d, ui) {
    const tab = ui.tab || 'diary';
    const kw = ui.kw || '';
    const all = listItems(s, d, tab);
    const items = all.filter(it => {
      if (!kw) return true;
      const name = it.title || it.name || it.label || '';
      return name.includes(kw) || (it.no || '').includes(kw);
    });

    const rows = items.map(it => {
      let locked, title, no, cred = null, isNew = false;
      if (tab === 'map') {
        locked = !locationUnlocked(it, s);
        title = locked ? '？？？' : it.name;
        no = it.year;
      } else if (tab === 'person') {
        locked = false;
        const known = it.known || has(s, 'discoveredPeople', it.id);
        title = known ? it.name : '身份不明';
        no = it.no;
      } else if (tab === 'evidence') {
        locked = false; title = it.label; no = '线索';
      } else {
        locked = !isUnlocked(it, s);
        title = locked ? '待解锁' : LP.inv.sub(it.title, s);
        no = it.no;
        if (!locked && it.cred) cred = it.cred.level;
        isNew = !locked && !has(s, 'discoveredDocuments', it.id);
      }
      return {
        id: it.id, locked, title, no, cred, isNew,
        gist: !locked && LP.inv.isGist(it, s)
      };
    });

    return {
      rows,
      empty: !rows.length,
      emptyText: kw ? `未检索到与「${kw}」相关的档案`
        : (tab === 'timeline' ? '在中央区域操作' : '（暂无条目）')
    };
  }

  function listRender(vm, hosts, ctx) {
    const el = LP.el;
    const box = hosts.root;
    box.innerHTML = '';
    if (vm.empty) {
      box.appendChild(el('div', {
        class: 'dim mono', text: vm.emptyText,
        style: 'padding:1rem;font-size:.7rem;text-align:center;line-height:1.9'
      }));
      return;
    }
    vm.rows.forEach(r => {
      const item = el('div', { class: 'doc-item' + (r.locked ? ' locked' : ''), 'data-id': r.id }, [
        el('span', { class: 'no mono', text: r.no }),
        el('span', { class: 't', text: r.title }),
        r.cred ? el('span', { class: 'cred ' + r.cred, text: r.cred + ' 可信度' }) : null,
        r.gist ? el('span', { class: 'gist-flag', text: '梗概' }) : null,
        r.isNew ? el('span', { class: 'new-flag' }) : null
      ]);
      if (!r.locked) item.addEventListener('click', () => ctx.onOpenItem(r.id));
      box.appendChild(item);
    });
  }

  /* ============================================================
     ② wbEmpty —— 中央空态（照片标签页的拍摄顺序校验横幅）
     ============================================================ */
  function emptyVM(s, d, ui) {
    const tab = ui.tab || 'diary';
    const isPhoto = tab === 'photo';
    const done = has(s, 'completedPuzzles', 'photo_sort');
    return {
      duoNote: isPhoto && s.mode === 'A',
      banner: isPhoto && !(s.mode === 'A') && s.act >= 4,
      done
    };
  }

  function emptyRender(vm, hosts, ctx) {
    const el = LP.el;
    const main = hosts.root;
    main.innerHTML = '';

    if (vm.duoNote) {
      main.appendChild(el('div', { class: 'ps-banner duo-note' }, [
        el('div', { class: 'mono', text: 'PHOTO · NOT IN THIS VOLUME', style: 'font-size:.6rem;letter-spacing:.3em;color:var(--red)' }),
        el('p', { class: 'serif', text: '照片原件在记录者卷里。你看不见它们，拍摄顺序也由 ta 校验——让 ta 把看到的东西念给你听。' }),
        el('button', { class: 'btn-ghost small', text: '打开通话', onclick: () => ctx.onDuo() })
      ]));
    } else if (vm.banner) {
      const sortBtn = el('button', {
        class: 'btn-ghost small',
        text: vm.done ? '已完成' : '校验拍摄顺序',
        onclick: () => ctx.onSort()
      });
      if (vm.done) sortBtn.setAttribute('disabled', '');
      main.appendChild(el('div', { class: 'ps-banner' }, [
        el('div', { class: 'mono', text: 'PHOTO ORDER VERIFICATION', style: 'font-size:.6rem;letter-spacing:.3em;color:var(--red)' }),
        el('p', { class: 'serif', text: vm.done ? '拍摄顺序已校验。她按时间记住了一切。' : '这些照片的拍摄顺序，似乎还没有人校验过。' }),
        sortBtn
      ]));
    }

    main.appendChild(el('p', { text: '选择左侧资料开始整理。' }));
    main.appendChild(el('p', { class: 'dim', text: '所有谜题都藏在档案里 —— 阅读、观察、关联、验证。' }));
  }

  /* ============================================================
     ③ wbPreview —— 资料预览卡
     ============================================================ */
  function previewVM(s, d, ui) {
    const doc = ui.doc;
    if (!doc) return null;
    const gist = LP.inv.isGist(doc, s);
    const content = doc.type === 'photo' || doc.type === 'map' || doc.damaged
      ? [] : (LP.inv.docContent(doc, s) || []);
    return {
      no: doc.no,
      date: doc.date || '',
      cred: doc.cred ? `${doc.cred.level} · ${doc.cred.kind}` : '',
      credLevel: doc.cred ? doc.cred.level : '',
      title: LP.inv.sub(doc.title, s),
      type: doc.type,
      damaged: !!doc.damaged,
      gist,
      img: doc.type === 'photo' ? doc.src : null,
      imgAlt: doc.title,
      text: doc.type === 'photo' || doc.type === 'map' ? LP.inv.sub(doc.desc, s) : '',
      paras: content.map(p => LP.inv.sub(p, s)),
      related: (doc.related || [])
        .map(rid => ({ rid, label: relLabel(s, d, rid) }))
        .filter(x => !!x.label),
      openText: doc.type === 'photo' ? '查看原件'
        : doc.damaged ? '尝试修复'
        : doc.type === 'map' ? '展开地图'
        : gist ? '阅读梗概' : '阅读全文',
      /* 只有「已解锁且在本题卷内」的相关资料可点开 */
      relatedOpenable: (doc.related || []).reduce((acc, rid) => {
        const x = d.documents[rid];
        acc[rid] = !!(x && isUnlocked(x, s) && LP.inv.docVisible(x, s));
        return acc;
      }, {})
    };
  }

  function previewRender(vm, hosts, ctx) {
    const el = LP.el;
    const prev = hosts.root;
    prev.innerHTML = '';
    if (!vm) return;

    const card = el('div', { class: 'doc-card' });
    const head = el('div', { class: 'doc-card-head' }, [
      el('span', { class: 'no', text: 'NO.' + vm.no }),
      el('span', { text: vm.date }),
      el('span', { class: 'cred ' + vm.credLevel, text: vm.cred })
    ]);
    const body = el('div', { class: 'doc-card-body' }, [
      el('h3', { text: vm.title })
    ]);

    if (vm.type === 'photo') {
      body.appendChild(el('img', { class: 'doc-thumb', src: vm.img, alt: vm.imgAlt }));
      body.appendChild(el('p', { text: vm.text }));
    } else if (vm.type === 'map') {
      body.appendChild(el('p', { text: vm.text }));
    } else if (vm.damaged) {
      body.appendChild(el('p', { class: 'mono', text: '!! 文件损坏 —— 数据校验失败', style: 'color:var(--red);font-size:.8rem' }));
      body.appendChild(el('p', { text: '该页的数据链路已断裂。或许，已经确证的事实可以修复它。' }));
    } else {
      vm.paras.forEach(p => body.appendChild(el('p', { text: p })));
      if (vm.gist) {
        body.appendChild(el('p', {
          class: 'dim', style: 'font-size:.72rem;font-style:italic',
          text: '（这是记录者卷的编目梗概——正文原件在对方手里。）'
        }));
      }
    }

    const foot = el('div', { class: 'doc-card-foot' });
    vm.related.forEach(r => {
      foot.appendChild(el('span', {
        class: 'rel-chip', text: r.label,
        onclick: () => ctx.onRel(r.rid, vm.relatedOpenable[r.rid])
      }));
    });
    const actions = el('div', { class: 'doc-actions' });
    actions.appendChild(el('button', {
      class: 'btn-ghost small', text: vm.openText,
      onclick: () => ctx.onOpenDoc()
    }));
    foot.appendChild(actions);
    card.appendChild(head); card.appendChild(body); card.appendChild(foot);
    prev.appendChild(card);
  }

  /* ============================================================
     ④ wbPeople —— 人物档案网格
     ============================================================ */
  const PORTRAITS = {
    person_linyuan: 'portrait_linyuan',
    person_zhou: 'portrait_zhou_ning',
    person_chen: 'portrait_chen_chuan',
    person_li: 'portrait_li_he'
  };

  function peopleVM(s, d) {
    return {
      list: Object.values(d.people).map(p => {
        const known = p.known || has(s, 'discoveredPeople', p.id);
        return {
          id: p.id,
          known,
          no: p.no,
          name: p.name,
          keyword: p.keyword,
          question: p.question,
          traits: p.traits,
          bio: p.bio,
          bioLocked: p.bioLocked,
          photo: known && PORTRAITS[p.id] ? 'assets/images/' + PORTRAITS[p.id] + '.webp' : null
        };
      })
    };
  }

  function peopleRender(vm, hosts, ctx) {
    const el = LP.el;
    const prev = hosts.root;
    prev.innerHTML = '';
    const grid = el('div', { class: 'person-grid' });
    vm.list.forEach(p => {
      const card = el('div', { class: 'person-card' + (p.known ? '' : ' unknown') });
      const photoBox = el('div', { class: 'pphoto' });
      if (p.photo) {
        photoBox.appendChild(el('img', { src: p.photo, alt: p.name + '的肖像' }));
      } else {
        photoBox.appendChild(el('span', { class: 'pphoto-q mono', text: '？' }));
      }
      card.appendChild(photoBox);
      card.appendChild(el('div', { class: 'pno', text: p.no }));
      card.appendChild(el('div', {
        class: 'pname',
        html: p.known ? LP.escapeHtml(p.name) : '<span class="unknown-name">？ ？</span>'
      }));
      card.appendChild(el('div', { class: 'pkw', text: p.known ? p.keyword : '身份不明' }));
      if (p.known) {
        card.appendChild(el('div', { class: 'stamp', text: '已确认' }));
        card.appendChild(el('div', { class: 'pq', text: p.question }));
        const tags = el('div', { class: 'ptags' });
        p.traits.forEach(t => tags.appendChild(el('span', { class: 'ptag', text: t })));
        card.appendChild(tags);
        card.appendChild(el('div', { class: 'pbio', text: p.bio }));
      } else {
        card.appendChild(el('div', { class: 'pbio', text: p.bioLocked }));
      }
      card.appendChild(el('button', {
        class: 'btn-ghost small ptrace', text: '【 追踪 】',
        onclick: () => ctx.onTrace(p.id)
      }));
      grid.appendChild(card);
    });
    prev.appendChild(grid);
  }

  LP.ui2.register('wbList', listVM, listRender);
  LP.ui2.register('wbEmpty', emptyVM, emptyRender);
  LP.ui2.register('wbPreview', previewVM, previewRender);
  LP.ui2.register('wbPeople', peopleVM, peopleRender);
})();
