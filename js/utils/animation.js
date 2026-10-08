/* 动画工具：打字机、数字滚动、闪烁 */
window.LP = window.LP || {};
LP.anim = {
  /* 打字机效果；返回取消函数
     —— 同一节点上再次调用会先取消上一次，避免两次动画交叉写入造成乱码 */
  typewriter(node, text, speed, onDone) {
    if (!node) return () => {};
    if (node.__twCancel) node.__twCancel();   // 取消上一次
    node.textContent = '';
    /* 按「码点」切分，避免中文扩展区/emoji 被拆成半个字 */
    const chars = Array.from(String(text == null ? '' : text));
    let i = 0, cancelled = false;
    const cancel = () => { cancelled = true; if (node.__twCancel === cancel) node.__twCancel = null; };
    node.__twCancel = cancel;
    (function tick() {
      if (cancelled || node.__twCancel !== cancel) return;   // 已被新的一次接管
      if (i >= chars.length) { onDone && onDone(); return; }
      node.textContent += chars[i++];
      if (chars[i - 1] !== ' ' && LP.audio && i % 3 === 0) LP.audio.write();
      setTimeout(tick, speed || 28);
    })();
    return cancel;
  },

  /* 数字滚动 from → to */
  countUp(node, from, to, dur, fmt) {
    const start = performance.now();
    fmt = fmt || (v => Math.round(v));
    (function frame(t) {
      const p = Math.min(1, (t - start) / (dur || 800));
      const e = 1 - Math.pow(1 - p, 3);
      node.textContent = fmt(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(frame);
    })(start);
  },

  flash() {
    const f = LP.$('#fx-flash');
    f.classList.remove('on');
    void f.offsetWidth;
    f.classList.add('on');
  },

  /* 元素抖动（错误反馈） */
  shake(node) {
    node.animate([
      { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' },
      { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' },
      { transform: 'translateX(0)' }
    ], { duration: 320, easing: 'ease-out' });
  }
};
