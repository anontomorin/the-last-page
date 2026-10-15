/* DOM 工具 */
window.LP = window.LP || {};
LP.$  = (sel, root) => (root || document).querySelector(sel);
LP.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

/* 图缺失兜底（方案 §6.10「绝不留白」）：图片加载失败时隐藏 <img>，
   让其下的 CSS 渐层 / 纸色衬底显出来。捕获阶段监听，覆盖动态创建的图片。 */
window.addEventListener('error', e => {
  const t = e.target;
  if (t && t.tagName === 'IMG') t.style.visibility = 'hidden';
}, true);

LP.el = function (tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (k.startsWith('on') && typeof attrs[k] === 'function')
        node.addEventListener(k.slice(2), attrs[k]);
      else node.setAttribute(k, attrs[k]);
    }
  }
  (children || []).forEach(c => {
    if (c == null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
};

LP.escapeHtml = s => String(s).replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
