/* ============================================================
   核心状态机 —— 所有系统共享的唯一状态源
   ============================================================ */
window.LP = window.LP || {};
LP.state = (function () {

  const DEFAULTS = {
    currentScene: 'boot',        // boot | archive | scene | ending
    act: 0,                      // 0 未开始 1~6 六幕
    archiveProgress: 0,          // 档案完整度（百分比数字）

    discoveredEvidence: [],      // 已发现线索 id
    discoveredPeople: [],        // 已确认身份的人物 id
    discoveredLocations: [],     // 已解锁地点 id
    discoveredDocuments: [],     // 已阅读的资料 id
    unlockedDocs: [],            // 已解锁（可见）的资料 id
    unlockedLocationsData: {},   // 地点内已调查的对象

    timelineNodes: {},           // 时间线槽位 → 证据 id
    unlockedPages: [],
    completedPuzzles: [],        // 已完成的谜题 id
    hiddenClues: [],             // 隐藏 ARG 线索
    finalMessage: null,          // { q1, q2, q3, line }
    bellRings: 0,                // 钟楼敲钟次数
    photoFlipped: [],            // 翻过面的照片
    hintLevels: {},              // puzzleId -> 已使用提示级别
    ocrFragments: [],            // 第32页已恢复的片段
    page32Found: false,
    ending: null                 // normal | hidden
  };

  let state = JSON.parse(JSON.stringify(DEFAULTS));

  function get() { return state; }

  function set(patch) {
    Object.assign(state, patch);
    LP.bus.emit('state', state);
    LP.save.schedule();
  }

  function addTo(key, id) {
    if (!state[key].includes(id)) {
      state[key].push(id);
      LP.bus.emit('state', state);
      LP.bus.emit(key, id);
      LP.save.schedule();
      return true;
    }
    return false;
  }

  function has(key, id) { return state[key].includes(id); }

  function reset() {
    state = JSON.parse(JSON.stringify(DEFAULTS));
    LP.bus.emit('state', state);
    LP.save.schedule();
  }

  function load(saved) {
    if (saved && typeof saved === 'object') {
      state = Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), saved);
    }
  }

  return { get, set, addTo, has, reset, load, DEFAULTS };
})();
