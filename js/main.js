/* ============================================================
   入口 —— 初始化全部系统 / 恢复存档 / 隐藏 ARG 路径
   ============================================================ */
(function () {
  function boot() {
    LP.save.load();
    LP.router.init();
    LP.doc.init();
    LP.map.init();
    LP.inv.initHint();
    LP.duo.init();
    LP.archive.init();

    // 隐藏 ARG：直接访问 #/archive/A-017/page/032
    if (LP.router.checkHiddenPath(true)) {
      // 命中隐藏路径
    }
    LP.bus.on('hidden', id => {
      if (id === 'url_032') {
        LP.ui.toast('你找到了一条不在目录里的路径。', 'gold');
        // 若已到第五幕，直达第32页
        if (LP.state.get().act >= 5 && LP.archive.isUnlocked(LP.data.documents.page_032)) {
          LP.router.go('archive');
          LP.doc.open('page_032');
        } else {
          LP.ui.narrate([
            '第 32 页……',
            '它确实存在。但现在，你还没有足够的事实去理解它。',
            '先完成前面的整理吧。'
          ]);
        }
      }
      if (id === 'css_032') {
        LP.ui.toast('样式表里藏着的编号，被你读出来了。', 'gold');
        LP.ui.narrate([
          '--missing-page: 032',
          '哪怕在样式里，它也一直标着同一个数字。',
          '档案的编号从不撒谎——撒谎的只有记忆。'
        ]);
      }
    });

    /* ---------- 隐藏 ARG：CSS 变量线索 ----------
       在 :root 里定义了 --missing-page: 032（见 css/variables.css）。
       玩家若在控制台读取该变量，或直接把样式表里的数字带进 URL，
       即可解锁第二条隐藏线索（与 url_032 一样可触发隐藏结局）。 */
    (function cssClue() {
      const num = getComputedStyle(document.documentElement)
        .getPropertyValue('--missing-page').trim();
      // 控制台留一条只有细心人会发现的话
      try {
        console.log('%cARCHIVE A-017', 'color:#8E1B1B;font-weight:bold',
          `\n试图读懂样式表的人，会读到 --missing-page: ${num}。`);
      } catch (e) { /* 忽略 */ }

      // 连按数字 0 3 2（或直接复制该 CSS 变量）即视为发现
      let buf = '';
      window.addEventListener('keypress', e => {
        if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
        if (!/^[0-9]$/.test(e.key)) { buf = ''; return; }
        buf = (buf + e.key).slice(-3);
        if (buf === '032' || (num && buf === num)) {
          if (LP.state.addTo('hiddenClues', 'css_032')) {
            LP.bus.emit('hidden', 'css_032');
          }
          buf = '';
        }
      });
    })();

    // 已有存档且已在游戏中 → 恢复现场
    const s = LP.state.get();
    if (s.act >= 1) {
      // 留在启动页，由「继续上次的整理」进入；完整度即时校正
      document.body.dataset.act = s.act;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else boot();
})();
