/* ============================================================
   新壳（ui2）—— 视图层注册表与切换开关
   ------------------------------------------------------------
   绞杀者模式（Strangler）：
     · 业务逻辑（LP.*）一行不动；
     · ui2/ 只放「视图层」：viewModel(state, data, ui) 与 render(vm, ctx)
       两个纯函数，经 LP.ui2 注册；
     · 默认走旧实现；?ui=next 或 localStorage.lp_ui=next 走新壳；
     · 全部验收通过后再翻转默认值、删除旧实现（P6）。

   硬约束（见 FRONTEND_REBUILD_PLAN §5.3）：
     viewModel 与 render 都不得直接读写 LP.state，也不产生副作用。
     —— 状态由 mount() 注入；事件通过 ctx 回调交回业务层。
   ============================================================ */
window.LP = window.LP || {};
LP.ui2 = (function () {

  const views = {};      // name -> viewModel(state, data, ui) -> vm
  const renders = {};    // name -> render(vm, ctx) -> DOMNode

  /* ---------- 开关 ----------
     默认关闭（走旧壳）；显式指定才启用，保证任何情况下都可回退。 */
  let flag = (function () {
    try {
      const q = new URLSearchParams(location.search);
      if (q.get('ui') === 'next') return true;
      if (q.get('ui') === 'legacy') return false;
      if (localStorage.getItem('lp_ui') === 'next') return true;
    } catch (e) { /* 隐私模式 / 无 location：保持默认 */ }
    return false;
  })();

  function register(name, view, render) {
    if (typeof view === 'function') views[name] = view;
    if (typeof render === 'function') renders[name] = render;
  }

  /* 新壳是否对该视图生效（开关开 且 两个纯函数都已注册） */
  function enabled(name) {
    return !!flag && typeof views[name] === 'function' && typeof renders[name] === 'function';
  }

  /* ---------- 挂载 ----------
     把 viewModel → render 的结果挂到 host。
     返回 true 表示「已由新壳接管（含 vm.visible === false 的隐藏态）」；
     返回 false 表示新壳不适用，调用方应回退旧实现。 */
  function mount(name, host, ctx) {
    if (!enabled(name)) return false;
    const vm = views[name](ctx.state, ctx.data, ctx.ui || {});
    host.innerHTML = '';
    if (!vm || vm.visible === false) { host.hidden = true; return true; }
    const node = renders[name](vm, ctx);
    if (node == null) { host.hidden = true; return true; }
    host.hidden = false;
    host.appendChild(node);
    return true;
  }

  return {
    get flag() { return flag; },
    setFlag(v) { flag = !!v; },     // 供调试 / 自动化测试临时切换
    register, enabled, mount, views, renders
  };
})();
