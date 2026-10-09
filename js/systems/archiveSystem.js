/* ============================================================
   档案工作台系统 —— 启动画面 / 分类列表 / 检索 / 完整度 / UI 助手
   ============================================================ */
window.LP = window.LP || {};

/* ---------------- 通用 UI 助手 ---------------- */
LP.ui = (function () {

  /* 旁白：逐行显示，点击继续
     —— 多处系统可能在很近的时间点连续调用（翻面 / 听写 / 幕切换），
        旧的写法会让两段打字机同时往同一个节点里写字，出现乱码。
        这里改为「串行队列」：新的旁白排队等上一段播完，绝不叠加。 */
  const nq = [];          // 待播队列
  let nActive = false;    // 是否正在播

  /* opts.soft：不虚化背后的画面。
     默认旁白层带 backdrop blur，把注意力压到文字上；但当玩家正要「看」背后
     的东西（例如刚修复完的 PAGE_032）时，虚化会直接把他要看的内容糊掉。 */
  function narrate(lines, cb, opts) {
    const arr = (Array.isArray(lines) ? lines.slice() : [lines])
      .map(x => String(x == null ? '' : x))
      .filter(x => x !== '');
    if (!arr.length) { cb && cb(); return; }
    nq.push({ arr, cb, opts: opts || null });
    if (!nActive) runNext();
  }

  function runNext() {
    if (!nq.length) { nActive = false; return; }
    nActive = true;
    const job = nq.shift();
    const layer = LP.$('#narrator');
    const text = LP.$('#narrator-text');
    layer.classList.toggle('soft', !!(job.opts && job.opts.soft));
    let i = 0, cancelType = null, typing = false, closed = false;

    function showLine() {
      typing = true;
      cancelType = LP.anim.typewriter(text, job.arr[i], 26, () => { typing = false; });
    }
    function finish() {
      if (closed) return;
      closed = true;
      layer.onclick = null;
      layer.hidden = true;
      job.cb && job.cb();
      runNext();
    }
    function onClick() {
      LP.audio.click();
      if (typing) {                       // 点击快进当前行
        cancelType && cancelType();
        text.textContent = job.arr[i];
        typing = false;
        return;
      }
      i++;
      if (i >= job.arr.length) finish();
      else showLine();
    }
    layer.hidden = false;
    layer.onclick = onClick;              // 用 onclick 覆盖，避免多次 narrate 叠加监听
    showLine();
  }

  let toastTimer = null;
  function toast(msg, type) {
    const t = LP.$('#toast');
    t.textContent = msg;
    t.className = 'toast mono' + (type ? ' ' + type : '');
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
  }

  return { narrate, toast };
})();

/* ---------------- 档案工作台 ---------------- */
LP.archive = (function () {

  let curTab = 'diary';
  let searchKw = '';
  let lastPercent = 12;

  /* 解锁判定：依据 unlock 字段与当前幕 */
  function isUnlocked(item) {
    const s = LP.state.get();
    if (!item.unlock || item.unlock === 'start') return s.act >= 1;
    if (LP.state.has('unlockedDocs', item.id)) return true;
    switch (item.unlock) {
      case 'act1_done': return s.act >= 2;
      case 'act2':      return s.act >= 2;
      case 'act2_door': return LP.state.has('completedPuzzles', 'clocktower_door');
      case 'act3':      return s.act >= 3;
      case 'act4':      return s.act >= 4;
      case 'act5':      return s.act >= 5;
      default:          return false;
    }
  }
  function locationUnlocked(loc) {
    const s = LP.state.get();
    if (loc.unlock === 'start') return s.act >= 1;
    if (loc.unlock === 'act1_done') return s.act >= 2;
    if (loc.unlock === 'act3') return s.act >= 3;
    if (loc.unlock === 'act4') return s.act >= 4;
    return false;
  }

  /* 完整度：由发现进度推导（结局前封顶 96.7） */
  function computeProgress() {
    const s = LP.state.get();
    if (s.act >= 6) return 100;
    const score =
      s.discoveredDocuments.length +
      s.discoveredEvidence.length +
      s.discoveredPeople.length * 2 +
      s.discoveredLocations.length +
      s.completedPuzzles.length * 3 +
      s.ocrFragments.length;
    const maxScore = 49 + 25 + 8 + 4 + 27 + 6;
    return Math.min(96.7, 12 + (score / maxScore) * 84.7);
  }

  function refreshStatus() {
    const s = LP.state.get();
    const pct = computeProgress();
    const el = LP.$('#wb-percent');
    LP.anim.countUp(el, lastPercent, pct, 900, v => v.toFixed(1) + '%');
    lastPercent = pct;
    LP.$('#clue-count').textContent = s.discoveredEvidence.length;
    // 通关后显示「返回结束页」
    LP.$('#btn-back-ending').hidden = !(s.ending || (s.act >= 6 && s.finalMessage));
    document.body.dataset.act = s.act;
    if (s.act >= 1) LP.$('#wb-act-title').textContent = LP.story.ACT_TITLES[Math.min(s.act, 6)];
  }

  /* ---------------- 启动画面 ---------------- */
  function initBoot() {
    const log = LP.$('#boot-log');
    const lines = LP.story.BOOT_LOG;
    let i = 0;
    (function next() {
      if (i < lines.length) {
        const div = LP.el('div', {
          html: LP.escapeHtml(lines[i])
            .replace('PAGE_032 缺失', '<span class="red">PAGE_032 缺失</span>')
        });
        log.appendChild(div);
        LP.audio.write();
        i++;
        setTimeout(next, 420);
      } else {
        setTimeout(() => {
          LP.$('#boot-card').hidden = false;
          LP.anim.countUp(LP.$('#boot-percent'), 0, 96.7, 1600, v => v.toFixed(1) + '%');
          if (LP.save.hasSave()) LP.$('#btn-continue').hidden = false;
        }, 350);
      }
    })();

    LP.$('#btn-start').addEventListener('click', () => startGame('solo'));
    LP.$('#btn-mode-a').addEventListener('click', () => startGame('A'));
    LP.$('#btn-mode-b').addEventListener('click', () => startGame('B'));

    function startGame(mode) {
      // 存在旧存档时，重新开始 = 清空旧进度
      if (LP.save.hasSave() && LP.state.get().act > 0) {
        if (!confirm('已存在上次的整理记录。重新整理将清空旧进度，确定吗？')) return;
        LP.save.wipe();
      }
      LP.audio.unlock();
      LP.state.set({ act: 1, mode });
      enterWorkbench(true);
    }
    LP.$('#btn-continue').addEventListener('click', () => {
      LP.audio.click();
      enterWorkbench(false);
    });
  }

  function enterWorkbench(fresh) {
    LP.router.go('archive');
    refreshAll();
    if (fresh) {
      const mode = LP.state.get().mode;
      if (mode === 'solo') {
        LP.ui.narrate([
          '欢迎接入，志愿者。',
          '你正在整理的是 ARCHIVE A-017 ——《林远个人档案》。',
          '档案索引把几份记录归入同一事件，可索引里同时出现倒春寒、晴天和雨天。',
          '这份档案缺了一页。你要查清：这些矛盾记录，究竟是不是同一天？',
          '阅读、观察、关联、验证。来源与日期，等你逐一核实。'
        ]);
      } else {
        const roleName = mode === 'A' ? '执笔者卷' : '记录者卷';
        const partner = mode === 'A' ? '记录者' : '执笔者';
        const own = mode === 'A'
          ? '你留在馆里翻纸页：日记与信件在你手里，照片你一张也看不到，现场也由 ta 走。'
          : '你扛着相机跑现场：照片与地图在你手里，信件你一封也看不到，钟楼老街渡口都要你亲自去。';
        const field = mode === 'A'
          ? '钟楼、老街、渡口——你进不去，也不该进去：那是 ta 的活。'
          : '钟楼、老街、渡口——只有你能进。你看到的每一样，都要念给 ta 听。';
        LP.ui.narrate([
          `欢迎接入，${roleName}的整理人。`,
          '这份档案被分成了两卷：你看到的，和 ta 看到的，并不一样。',
          '两卷共用一条异常索引：几份记录被归入同一事件，天气却分别是倒春寒、晴天和雨天。',
          '你们要查清这些记录是否真的属于同一天；日期和来源要靠两卷交叉核实。',
          own,
          field,
          `你的${partner}正在另一端整理另一半。`,
          '保持通话——右上角「通话」面板里，你可以把手里的东西念给 ta 听，也把 ta 说的记下来。',
          '有些页，只有你们互相念给对方听，才能拼完整。',
          '（提醒：这一卷读不完自己那一半。每一幕都有一处，必须等 ta 开口。）'
        ]);
      }
    }
  }

  /* ---------------- 标签页 ---------------- */
  function initTabs() {
    LP.$('#wb-tabs').addEventListener('click', e => {
      const btn = e.target.closest('.wb-tab');
      if (!btn) return;
      LP.audio.click();
      curTab = btn.dataset.tab;
      LP.$$('.wb-tab').forEach(t => t.classList.toggle('active', t === btn));
      renderList();
      renderMain();
    });
    LP.$('#wb-search-input').addEventListener('input', e => {
      searchKw = e.target.value.trim();
      renderList();
    });
  }

  /* ---------------- 左侧列表 ---------------- */
  function listItems() {
    const docs = LP.data.documents;
    if (curTab === 'diary' || curTab === 'photo' || curTab === 'letter') {
      return Object.values(docs)
        .filter(d => d.type === curTab && LP.inv.docVisible(d))
        .sort((a, b) => a.no.localeCompare(b.no));
    }
    if (curTab === 'map') return Object.values(LP.data.locations);
    if (curTab === 'person') return Object.values(LP.data.people);
    if (curTab === 'evidence') return Object.values(LP.data.clues)
      .filter(c => LP.state.has('discoveredEvidence', c.id));
    if (curTab === 'timeline') return [];
    return [];
  }

  function renderList() {
    const box = LP.$('#wb-list');
    box.innerHTML = '';
    const items = listItems().filter(it => {
      if (!searchKw) return true;
      const name = it.title || it.name || it.label || '';
      return name.includes(searchKw) || (it.no || '').includes(searchKw);
    });

    if (!items.length) {
      box.appendChild(LP.el('div', {
        class: 'dim mono', text: curTab === 'timeline' ? '在中央区域操作' : '（暂无条目）',
        style: 'padding:1rem;font-size:.7rem;text-align:center'
      }));
      return;
    }

    items.forEach(it => {
      let locked, title, no, cred = null, isNew = false;
      if (curTab === 'map') {
        locked = !locationUnlocked(it); title = locked ? '？？？' : it.name; no = it.year;
      } else if (curTab === 'person') {
        locked = false;
        const known = it.known || LP.state.has('discoveredPeople', it.id);
        title = known ? it.name : '身份不明';
        no = it.no;
      } else if (curTab === 'evidence') {
        locked = false; title = it.label; no = '线索';
      } else {
        locked = !isUnlocked(it);
        title = locked ? '待解锁' : LP.inv.sub(it.title);
        no = it.no;
        if (!locked && it.cred) cred = it.cred.level;
        isNew = !locked && !LP.state.has('discoveredDocuments', it.id);
      }

      const item = LP.el('div', { class: 'doc-item' + (locked ? ' locked' : ''), 'data-id': it.id }, [
        LP.el('span', { class: 'no mono', text: no }),
        LP.el('span', { class: 't', text: title }),
        cred ? LP.el('span', { class: 'cred ' + cred, text: cred + ' 可信度' }) : null,
        (locked || !LP.inv.isGist(it)) ? null : LP.el('span', { class: 'gist-flag', text: '梗概' }),
        isNew ? LP.el('span', { class: 'new-flag' }) : null
      ]);
      if (!locked) item.addEventListener('click', () => { LP.audio.click(); openItem(it); });
      box.appendChild(item);
    });
  }

  function openItem(it) {
    if (!LP.inv.docVisible(it)) { LP.ui.toast('这一页在对方手里——让你的搭档念给你听。', 'gold'); return; }
    if (curTab === 'map') {
      if (it.scene) LP.map.openScene(it.id);
      else LP.ui.toast('你所在的地方。', null);
      renderMain();
      return;
    }
    if (curTab === 'person') { renderPersonPreview(it); return; }
    if (curTab === 'evidence') { LP.evidence && LP.evidence.focusNode(it.id); return; }
    // 文档类
    if (it.type === 'photo') { LP.photo.open(it.id); markDocRead(it); }
    else if (it.type === 'map') { LP.map.focusMap(); }
    else { LP.doc.open(it.id); }
    renderPreviewCard(it);
  }

  /* ---------------- 中央预览 ---------------- */
  function renderMain() {
    const main = LP.$('#wb-empty');
    const prev = LP.$('#wb-preview');
    if (curTab === 'person') { renderPersonGrid(); return; }
    if (curTab === 'map') { LP.map.renderMap(prev); main.hidden = true; prev.hidden = false; return; }
    if (curTab === 'evidence') { LP.evidence.render(prev); main.hidden = true; prev.hidden = false; return; }
    if (curTab === 'timeline') { LP.timeline.render(prev); main.hidden = true; prev.hidden = false; return; }
    main.hidden = false; prev.hidden = true;
    renderPhotoSortBanner();
  }

  /* 照片标签页：第四幕后出现「拍摄顺序校验」入口 */
  function renderPhotoSortBanner() {
    const main = LP.$('#wb-empty');
    const s = LP.state.get();
    // 恢复默认空态
    main.innerHTML = '';
    const mode = s.mode;
    // 照片原件归记录者卷：执笔者看不到影像，也不该由 ta 做顺序校验
    if (curTab === 'photo' && mode === 'A') {
      main.appendChild(LP.el('div', { class: 'ps-banner duo-note' }, [
        LP.el('div', { class: 'mono', text: 'PHOTO · NOT IN THIS VOLUME', style: 'font-size:.6rem;letter-spacing:.3em;color:var(--red)' }),
        LP.el('p', { class: 'serif', text: '照片原件在记录者卷里。你看不见它们，拍摄顺序也由 ta 校验——让 ta 把看到的东西念给你听。' }),
        LP.el('button', { class: 'btn-ghost small', text: '打开通话', onclick: () => LP.duo.openPanel() })
      ]));
    } else if (curTab === 'photo' && s.act >= 4 && mode !== 'A') {
      const done = s.completedPuzzles.includes('photo_sort');
      const sortBtn = LP.el('button', {
        class: 'btn-ghost small',
        text: done ? '已完成' : '校验拍摄顺序',
        onclick: () => LP.photo.openSort()
      });
      if (done) sortBtn.setAttribute('disabled', '');
      const banner = LP.el('div', { class: 'ps-banner' }, [
        LP.el('div', { class: 'mono', text: 'PHOTO ORDER VERIFICATION', style: 'font-size:.6rem;letter-spacing:.3em;color:var(--red)' }),
        LP.el('p', { class: 'serif', text: done ? '拍摄顺序已校验。她按时间记住了一切。' : '这些照片的拍摄顺序，似乎还没有人校验过。' }),
        sortBtn
      ]);
      main.appendChild(banner);
    }
    main.appendChild(LP.el('p', { text: '选择左侧资料开始整理。' }));
    main.appendChild(LP.el('p', { class: 'dim', text: '所有谜题都藏在档案里 —— 阅读、观察、关联、验证。' }));
  }

  /* 底部「相关资料」标签：只暴露玩家已经确证过的信息
     —— 未确认身份的人物、未解锁的资料、未确证的地点都不显示名字，避免剧透 */
  function relLabel(rid) {
    const person = LP.data.people[rid];
    if (person) {
      return (person.known || LP.state.has('discoveredPeople', rid)) ? person.name : null;
    }
    const loc = LP.data.locations[rid];
    if (loc) {
      return LP.state.has('discoveredLocations', rid) ? loc.name : null;
    }
    const d = LP.data.documents[rid];
    if (!d) return null;
    if (!isUnlocked(d)) return null;        // 还没解锁：连标题都不给
    if (!LP.inv.docVisible(d)) return null; // 不在这一卷里
    return LP.inv.sub(d.title);
  }

  function renderPreviewCard(doc) {
    const main = LP.$('#wb-empty');
    const prev = LP.$('#wb-preview');
    main.hidden = true; prev.hidden = false;
    prev.innerHTML = '';

    const card = LP.el('div', { class: 'doc-card' });
    const head = LP.el('div', { class: 'doc-card-head' }, [
      LP.el('span', { class: 'no', text: 'NO.' + doc.no }),
      LP.el('span', { text: doc.date || '' }),
      LP.el('span', { class: 'cred ' + (doc.cred ? doc.cred.level : ''), text: doc.cred ? `${doc.cred.level} · ${doc.cred.kind}` : '' })
    ]);
    const body = LP.el('div', { class: 'doc-card-body' }, [
      LP.el('h3', { text: LP.inv.sub(doc.title) })
    ]);
    if (doc.type === 'photo') {
      body.appendChild(LP.el('img', { class: 'doc-thumb', src: doc.src, alt: doc.title }));
      body.appendChild(LP.el('p', { text: LP.inv.sub(doc.desc) }));
    } else if (doc.type === 'map') {
      body.appendChild(LP.el('p', { text: LP.inv.sub(doc.desc) }));
    } else if (doc.damaged) {
      body.appendChild(LP.el('p', { class: 'mono', text: '!! 文件损坏 —— 数据校验失败', style: 'color:var(--red);font-size:.8rem' }));
      body.appendChild(LP.el('p', { text: '该页的数据链路已断裂。或许，已经确证的事实可以修复它。' }));
    } else {
      // 完整显示正文：摘要式截断会藏掉关键的「天气 / 日期 / 署名」，
      // 而这些恰恰是推理要用的证据，因此这里不再截断。
      const content = LP.inv.docContent(doc) || [];
      content.forEach(p =>
        body.appendChild(LP.el('p', { text: LP.inv.sub(p) })));
      if (LP.inv.isGist(doc)) {
        body.appendChild(LP.el('p', {
          class: 'dim', style: 'font-size:.72rem;font-style:italic',
          text: '（这是记录者卷的编目梗概——正文原件在对方手里。）'
        }));
      }
    }
    const foot = LP.el('div', { class: 'doc-card-foot' });
    (doc.related || []).forEach(rid => {
      const label = relLabel(rid);
      if (!label) return;                 // 未确认 / 未解锁 / 不在本卷 —— 一律不显示，避免剧透
      const d = LP.data.documents[rid];
      foot.appendChild(LP.el('span', {
        class: 'rel-chip', text: label,
        onclick: () => {
          if (d && isUnlocked(d) && LP.inv.docVisible(d)) openItem(d);
          else LP.ui.toast('相关资料尚未解锁');
        }
      }));
    });
    const actions = LP.el('div', { class: 'doc-actions' });
    const openBtn = LP.el('button', {
      class: 'btn-ghost small',
      text: doc.type === 'photo' ? '查看原件'
        : doc.damaged ? '尝试修复'
        : doc.type === 'map' ? '展开地图'
        : LP.inv.isGist(doc) ? '阅读梗概' : '阅读全文',
      onclick: () => {
        LP.audio.open();
        if (doc.type === 'photo') { LP.photo.open(doc.id); markDocRead(doc); }
        else if (doc.type === 'map') { curTab = 'map'; syncTabs(); }
        else LP.doc.open(doc.id);
      }
    });
    actions.appendChild(openBtn);
    foot.appendChild(actions);
    card.appendChild(head); card.appendChild(body); card.appendChild(foot);
    prev.appendChild(card);
  }

  function markDocRead(doc) {
    if (LP.state.addTo('discoveredDocuments', doc.id)) {
      // 只看到「编目梗概」的页：正文不在这一卷，线索也不该由这一卷直接提取
      if (!LP.inv.isGist(doc)) (doc.clues || []).forEach(cid => LP.inv.discoverClue(cid, true));
      LP.inv.afterRead(doc);
      refreshStatus();
      renderList();
    }
  }

  /* ---------------- 人物 ---------------- */
  function renderPersonGrid() {
    const main = LP.$('#wb-empty');
    const prev = LP.$('#wb-preview');
    main.hidden = true; prev.hidden = false;
    prev.innerHTML = '';
    const grid = LP.el('div', { class: 'person-grid' });
    Object.values(LP.data.people).forEach(p => {
      const known = p.known || LP.state.has('discoveredPeople', p.id);
      const card = LP.el('div', { class: 'person-card' + (known ? '' : ' unknown') });
      card.appendChild(LP.el('div', { class: 'pno', text: p.no }));
      card.appendChild(LP.el('div', {
        class: 'pname',
        html: known ? LP.escapeHtml(p.name) : '<span class="unknown-name">？ ？</span>'
      }));
      card.appendChild(LP.el('div', { class: 'pkw', text: known ? p.keyword : '身份不明' }));
      if (known) {
        card.appendChild(LP.el('div', { class: 'stamp', text: '已确认' }));
        card.appendChild(LP.el('div', { class: 'pq', text: p.question }));
        const tags = LP.el('div', { class: 'ptags' });
        p.traits.forEach(t => tags.appendChild(LP.el('span', { class: 'ptag', text: t })));
        card.appendChild(tags);
        card.appendChild(LP.el('div', { class: 'pbio', text: p.bio }));
      } else {
        card.appendChild(LP.el('div', { class: 'pbio', text: p.bioLocked }));
      }
      const trace = LP.el('button', {
        class: 'btn-ghost small ptrace', text: '【 追踪 】',
        onclick: () => tracePerson(p)
      });
      card.appendChild(trace);
      grid.appendChild(card);
    });
    prev.appendChild(grid);
  }

  function renderPersonPreview(p) {
    renderPersonGrid();
  }

  /* 追踪：跳到日记列表并高亮相关资料 */
  function tracePerson(p) {
    LP.audio.open();
    LP.ui.toast(`正在检索与「${p.known || LP.state.has('discoveredPeople', p.id) ? p.name : '此人'}」相关的资料…`, 'gold');
    curTab = 'diary';
    syncTabs();
    setTimeout(() => {
      (p.related || []).forEach(rid => {
        const item = LP.$(`.doc-item[data-id="${rid}"]`);
        if (item && !item.classList.contains('locked')) {
          item.classList.add('trace-highlight');
          item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      });
    }, 80);
  }

  function syncTabs() {
    LP.$$('.wb-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === curTab));
    renderList(); renderMain();
  }

  /* ---------------- 全局刷新 ---------------- */
  function refreshAll() {
    refreshStatus();
    renderList();
    renderMain();
    LP.inv.renderClues();
    // 双人模式徽标与交换入口
    const mode = LP.state.get().mode;
    const badge = LP.$('#wb-mode-badge');
    const duoBtn = LP.$('#btn-duo');
    if (mode === 'A' || mode === 'B') {
      badge.hidden = false;
      badge.textContent = mode === 'A' ? '执笔者卷 · A' : '记录者卷 · B';
      duoBtn.hidden = false;
    } else {
      badge.hidden = true;
      duoBtn.hidden = true;
    }
  }

  function getTab() { return curTab; }
  function setTab(t) { curTab = t; syncTabs(); }

  function init() {
    initBoot();
    initTabs();
    LP.$('#btn-back-ending').addEventListener('click', () => {
      LP.audio.click();
      LP.ending.resume();
    });
    LP.bus.on('state', refreshStatus);
    LP.bus.on('refresh', refreshAll);
  }

  return {
    init, refreshAll, refreshStatus, isUnlocked, locationUnlocked,
    markDocRead, setTab, getTab, computeProgress
  };
})();
