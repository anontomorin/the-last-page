/* ============================================================
   极简静态服务器（零依赖）
   ------------------------------------------------------------
   用途：给自动化测试提供 http://127.0.0.1:<port> 的本地站点。
   用法：node _playtest/serve.js [port]
   默认端口 8123；被占用时自动 +1 重试（最多 10 次）。
   ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8'
};

function createServer() {
  return http.createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    const full = path.join(ROOT, urlPath);
    // 防目录穿越
    if (!full.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
    fs.readFile(full, (err, buf) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404 ' + urlPath); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream' });
      res.end(buf);
    });
  });
}

/* 作为脚本直接运行时：启动并打印端口 */
if (require.main === module) {
  const start = parseInt(process.argv[2] || '8123', 10);
  let port = start, tries = 0;
  const tryListen = () => {
    const srv = createServer();
    srv.once('error', e => {
      if (e.code === 'EADDRINUSE' && tries++ < 10) { port++; tryListen(); }
      else { console.error('无法启动服务：', e.message); process.exit(1); }
    });
    srv.listen(port, '127.0.0.1', () => {
      console.log(`[serve] http://127.0.0.1:${port}  (root: ${ROOT})`);
    });
  };
  tryListen();
}

module.exports = { createServer, ROOT };
