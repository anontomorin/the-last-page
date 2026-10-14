/* ============================================================
   视觉回归入口（Node 包装）
   ------------------------------------------------------------
   解析可用的 Python（需 Pillow），转调 _playtest/visual-diff.py。

   用法：
     node _playtest/visual-diff.js <基线目录> <当前目录> [--threshold 1.5] [--report 目录]
     npm run test:visual            # 默认 baseline vs shots
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

/* 依次尝试：环境变量 → 托管 venv → PATH 上的 python */
function findPython() {
  const cands = [
    process.env.PYTHON_PATH,
    'C:/Users/郭家兴/.workbuddy/binaries/python/envs/default/Scripts/python.exe',
    'python',
    'python3'
  ].filter(Boolean);
  for (const c of cands) {
    if (c.includes('/') || c.includes('\\')) {
      if (!fs.existsSync(c)) continue;
    }
    const r = spawnSync(c, ['-c', 'import PIL'], { encoding: 'utf8' });
    if (r.status === 0) return c;
  }
  return null;
}

const args = process.argv.slice(2);
const baseline = args[0] || path.join(__dirname, 'baseline');
const current = args[1] || path.join(__dirname, 'shots');
const rest = args.slice(2);
if (!rest.includes('--report')) rest.push('--report', path.join(__dirname, 'visual-report'));

const py = findPython();
if (!py) {
  console.error('未找到可用的 Python + Pillow。');
  console.error('请设置 PYTHON_PATH，或安装 Pillow：pip install pillow');
  process.exit(2);
}

const r = spawnSync(py, [path.join(__dirname, 'visual-diff.py'), baseline, current, ...rest], {
  stdio: 'inherit', encoding: 'utf8'
});
process.exit(r.status === null ? 2 : r.status);
