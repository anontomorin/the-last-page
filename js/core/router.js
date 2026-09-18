/* ============================================================
   路由器 —— 场景切换 + 隐藏 ARG 的 URL 路径入口
   纯前端单文件应用，用 hash 模拟真实路径：
     #/archive/A-017             档案本体
     #/archive/A-017/page/032    隐藏入口：第32页
   ============================================================ */
window.LP = window.LP || {};
LP.router = (function () {

  function go(scene, param) {
    LP.state.set({ currentScene: scene });
    LP.$$('.screen').forEach(s => s.classList.remove('active'));
    const target = LP.$('#screen-' + scene);
    if (target) target.classList.add('active');
    LP.bus.emit('scene', { scene, param });
    window.scrollTo(0, 0);
  }

  /* 解析 hash 中的隐藏路径 */
  function checkHiddenPath(silent) {
    const h = location.hash || '';
    const m = h.match(/#\/archive\/A-017\/page\/0?32/i);
    if (m) {
      if (LP.state.addTo('hiddenClues', 'url_032')) {
        LP.bus.emit('hidden', 'url_032');
      }
      return true;
    }
    if (h.match(/#\/archive\/A-017/i)) {
      if (LP.state.get().act >= 1 && LP.state.get().currentScene === 'boot') {
        go('archive');
      }
      return true;
    }
    return false;
  }

  function init() {
    window.addEventListener('hashchange', () => checkHiddenPath());
  }

  return { go, checkHiddenPath, init };
})();
