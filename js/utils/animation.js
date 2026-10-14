/* 动画工具：打字机、数字滚动、闪烁、抖动
   —— 第三轮补充生命周期与可取消能力，全部向后兼容既有调用 */
window.LP = window.LP || {};
(function () {
  /* 临时定时器登记表：node → Set(timerId)。节点删除/场景离开时统一清理。 */
  const timers = new WeakMap();

  function track(node, id) {
    if (!node) return id;
    let set = timers.get(node);
    if (!set) { set = new Set(); timers.set(node, set); }
    set.add(id);
    return id;
  }
  function untrack(node, id) {
    const set = node && timers.get(node);
    if (set) set.delete(id);
  }

  /* 统一检测「减少动态效果」，供 JS 侧动画使用（不覆盖用户操作） */
  function reducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  /* 绑定到节点的 setTimeout：登记以便 cleanup 统一清除 */
  function after(node, fn, ms) {
    const id = setTimeout(() => { untrack(node, id); fn(); }, Math.max(0, ms || 0));
    track(node, id);
    return id;
  }

  /* 清除绑定到该节点（及其子树）的临时定时器，避免离开后继续运行 */
  function cleanup(root) {
    if (!root || !root.querySelectorAll) return;
    const nodes = [root, ...root.querySelectorAll('*')];
    nodes.forEach(n => {
      const set = timers.get(n);
      if (set) { set.forEach(clearTimeout); set.clear(); }
      if (n.__twCancel) { n.__twCancel(); n.__twCancel = null; }
      if (n.__cuCancel) { n.__cuCancel(); n.__cuCancel = null; }
    });
  }

  /* 可重播的一次性 CSS 动画：重置动画状态，避免连续点击丢失反馈 */
  function playOnce(node, className) {
    if (!node) return;
    node.classList.remove(className);
    void node.offsetWidth;      // 强制重排以重启动画
    node.classList.add(className);
    const off = () => { node.classList.remove(className); node.removeEventListener('animationend', off); };
    node.addEventListener('animationend', off);
  }

  LP.anim = {
    /* 打字机效果；返回取消函数
       —— 同一节点上再次调用会先取消上一次，避免两次动画交叉写入造成乱码 */
    typewriter(node, text, speed, onDone) {
      if (!node) return () => {};
      if (node.__twCancel) node.__twCancel();   // 取消上一次
      node.textContent = '';
      const full = String(text == null ? '' : text);
      const chars = Array.from(full);
      /* 减少动态效果：直接补齐，保留业务回调 */
      if (reducedMotion()) { node.textContent = full; onDone && onDone(); return () => {}; }
      let i = 0, cancelled = false;
      const cancel = () => { cancelled = true; if (node.__twCancel === cancel) node.__twCancel = null; };
      node.__twCancel = cancel;
      (function tick() {
        if (cancelled || node.__twCancel !== cancel) return;   // 已被新的一次接管
        if (i >= chars.length) { onDone && onDone(); return; }
        node.textContent += chars[i++];
        if (chars[i - 1] !== ' ' && LP.audio && i % 3 === 0) LP.audio.write();
        after(node, tick, speed || 28);
      })();
      return cancel;
    },

    /* 数字滚动 from → to；返回取消函数（向后兼容：旧调用忽略返回值即可） */
    countUp(node, from, to, dur, fmt) {
      if (!node) return () => {};
      if (node.__cuCancel) node.__cuCancel();   // 取消上一次，避免并发争抢
      fmt = fmt || (v => Math.round(v));
      if (reducedMotion()) { node.textContent = fmt(to); return () => {}; }
      const start = performance.now();
      let raf = 0, cancelled = false;
      const cancel = () => { cancelled = true; cancelAnimationFrame(raf); if (node.__cuCancel === cancel) node.__cuCancel = null; };
      node.__cuCancel = cancel;
      (function frame(t) {
        if (cancelled) return;
        const p = Math.min(1, (t - start) / (dur || 800));
        const e = 1 - Math.pow(1 - p, 3);
        node.textContent = fmt(from + (to - from) * e);
        if (p < 1) raf = requestAnimationFrame(frame);
        else if (node.__cuCancel === cancel) node.__cuCancel = null;
      })(start);
      return cancel;
    },

    flash() {
      const f = LP.$('#fx-flash');
      if (!f || reducedMotion()) return;
      f.classList.remove('on');
      void f.offsetWidth;
      f.classList.add('on');
    },

    /* 元素抖动（错误反馈）——减少动态效果时降级为极短淡入式提示 */
    shake(node) {
      if (!node) return;
      if (reducedMotion()) return;
      node.animate([
        { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' },
        { transform: 'translateX(0)' }
      ], { duration: 320, easing: 'ease-out' });
    },

    /* ---- 第三轮新增（向后兼容，不影响既有调用） ---- */
    reducedMotion,
    after,
    cleanup,
    playOnce,

    /* 取消绑定到某节点的打字机 / 数字动画 / 定时器 */
    cancel(node) {
      if (!node) return;
      if (node.__twCancel) { node.__twCancel(); node.__twCancel = null; }
      if (node.__cuCancel) { node.__cuCancel(); node.__cuCancel = null; }
      const set = timers.get(node);
      if (set) { set.forEach(clearTimeout); set.clear(); }
    }
  };
})();
