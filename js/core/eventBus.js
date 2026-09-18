/* 事件总线 */
window.LP = window.LP || {};
LP.bus = (function () {
  const map = {};
  return {
    on(evt, fn) {
      (map[evt] = map[evt] || []).push(fn);
      return () => { map[evt] = map[evt].filter(f => f !== fn); };
    },
    emit(evt, payload) {
      (map[evt] || []).slice().forEach(fn => { try { fn(payload); } catch (e) { console.error(e); } });
    }
  };
})();
