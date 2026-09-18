/* localStorage 封装 */
window.LP = window.LP || {};
LP.storage = {
  KEY: 'last-page-save-v1',
  read() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  write(data) {
    try { localStorage.setItem(this.KEY, JSON.stringify(data)); } catch (e) {}
  },
  clear() {
    try { localStorage.removeItem(this.KEY); } catch (e) {}
  }
};
