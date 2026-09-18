/* 动画工具：打字机、数字滚动、闪烁 */
window.LP = window.LP || {};
LP.anim = {
  /* 打字机效果；返回取消函数 */
  typewriter(node, text, speed, onDone) {
    node.textContent = '';
    let i = 0, cancelled = false;
    const chars = String(text).split('');
    (function tick() {
      if (cancelled) return;
      if (i >= chars.length) { onDone && onDone(); return; }
      node.textContent += chars[i++];
      if (chars[i - 1] !== ' ' && LP.audio && i % 3 === 0) LP.audio.write();
      setTimeout(tick, speed || 28);
    })();
    return () => { cancelled = true; };
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
