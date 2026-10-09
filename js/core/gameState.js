/* ============================================================
   核心状态机 —— 所有系统共享的唯一状态源
   ============================================================ */
window.LP = window.LP || {};
LP.state = (function () {

  const DEFAULTS = {
    currentScene: 'boot',        // boot | archive | scene | ending
    act: 0,                      // 0 未开始 1~6 六幕
    mode: 'solo',                // solo 单人 | A 执笔者卷 | B 记录者卷
    archiveProgress: 0,          // 档案完整度（百分比数字）

    discoveredEvidence: [],      // 已发现线索 id
    discoveredPeople: [],        // 已确认身份的人物 id
    discoveredLocations: [],     // 已解锁地点 id
    discoveredDocuments: [],     // 已阅读的资料 id
    unlockedDocs: [],            // 已解锁（可见）的资料 id
    unlockedLocationsData: {},   // 地点内已调查的对象

    timelineNodes: {},           // 时间线槽位 → 证据 id
    tlWeather: ['', '', ''],     // 时间线：三日的天色判定
    tlDate: ['', '', ''],        // 时间线：三日的日期判定
    evidenceLinks: [],           // 证据板：玩家建立的推理关系 [已完成（判定通过）的]
    evidenceTrials: [],          // 证据板：玩家提交过的关系尝试（含错误，用于反馈与追溯）
    act3Hinted: false,           // 第三幕「四人已认、证据链未立」的引导是否已提示过
    unlockedPages: [],
    completedPuzzles: [],        // 已完成的谜题 id
    hiddenClues: [],             // 隐藏 ARG 线索
    finalMessage: null,          // { q1, q2, q3 } 己方回答
    partnerMessage: null,        // 合卷后对方的 { name, q1, q2, q3 }（双人模式）
    partnerName: '',             // 对方卷主署名
    merged: false,               // 是否已合卷
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
