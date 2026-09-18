/* 存档管理：localStorage，刷新不丢进度 */
window.LP = window.LP || {};
LP.save = (function () {
  let timer = null;

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(persist, 300);
  }

  function persist() {
    LP.storage.write(LP.state.get());
  }

  function load() {
    const saved = LP.storage.read();
    if (saved) { LP.state.load(saved); return true; }
    return false;
  }

  function hasSave() {
    const s = LP.storage.read();
    return !!(s && (s.act > 0 || s.discoveredDocuments.length > 0));
  }

  function wipe() {
    LP.storage.clear();
    LP.state.reset();
  }

  return { schedule, persist, load, hasSave, wipe };
})();
