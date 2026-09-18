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
    });

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
