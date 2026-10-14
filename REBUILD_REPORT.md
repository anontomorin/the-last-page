# 重构实施报告 · REBUILD_REPORT

> 对应方案：`FRONTEND_REBUILD_PLAN.md`｜契约：`STYLE_CONTRACT.md`、`CONTRACT.md`
> 本报告只记录**已实施**的内容与实际验证结果；未做的部分明确标注。

**当前进度**：P0 完成 ✅ ｜ P1 完成 ✅ ｜ P2/P3 未开始 ⬜ ｜ P4/P5（美术）未开始 ⬜ ｜ P6 未开始 ⬜

**提交序列**：

| 提交 | 阶段 | 内容 |
|---|---|---|
| `b2db414` | P0 | 建立风格契约与逻辑契约 + 可执行门禁 |
| `0b3d33c` | P1 | 颜色字面量收编为令牌（RGB 三元组，零视觉变化） |
| `30d72fe` | P1 | D1 落地：主红统一为深档案红 `#8E1B1B` |

---

## 一、P0 · 契约与基线（零视觉变化）

### 1.1 新增文件

| 文件 | 作用 |
|---|---|
| `css/tokens.css` | **设计令牌唯一来源**：色板 / 幕数底色阶梯 / 字体 / 间距 / 圆角 / 阴影 / 时长 / 缓动 / RGB 三元组色基 |
| `tokens.json` | 令牌的机器可读镜像，供 lint 与工具消费 |
| `STYLE_CONTRACT.md` | 风格契约（冻结）：色板、排版、质感上限、动效语法、无障碍、图片规范、决策记录 |
| `CONTRACT.md` | 逻辑契约（冻结）：命名空间、状态、存档、隐藏 ARG、谜题数据、打印、引用与部署规范 |
| `_playtest/style-lint.js` | 风格 lint（5 项） |
| `_playtest/contract.test.js` | 逻辑契约测试（15 项断言） |
| `_playtest/style-baseline.json` | 字面量棘轮基线 |
| `_playtest/visual-diff.py` / `.js` | 像素差视觉回归工具 |

### 1.2 修改文件

| 文件 | 改动 |
|---|---|
| `css/variables.css` | 由「定义具体值」改为「旧名 → 令牌」**别名垫片**（兼容层），保证既有引用继续可用 |
| `css/motion.css` | 移除重复的 `:root` 时长定义（改由 `tokens.css` 提供唯一来源） |
| `index.html` | 接入 `tokens.css`；加载顺序固定为 `reset → tokens → variables → 各模块 → motion`；全部资源版本统一为 `20261015a` |
| `_playtest/harness.js` | 新增「风格 lint」「逻辑契约」两层（离线、低成本，排在浏览器测试之前） |
| `_playtest/shots4.js` | 支持 `--baseline` 输出到视觉基线目录 |
| `package.json` | 新增 `test:style` / `test:contract` / `test:visual` / `shots` / `shots:baseline` |
| `.gitignore` | 忽略 `_playtest/baseline/`、`_playtest/visual-report/` |

### 1.3 P0 抓出的真问题

**`LP.state.DEFAULTS` 实为 29 个字段，而方案初稿记为 27。** 漏掉了 `act3Hinted`（第三幕引导只提示一次）与 `page32Found`（第32页已触发）。由 `contract.test.js` 首次运行即抓出，已修正 `CONTRACT.md` 并记入修订说明。

> 这正是建立契约测试的意义：**文档会记错，机器不会。**

### 1.4 P0 门禁结果

| 门禁 | 结果 |
|---|---|
| 风格 lint | ✅ 5/5 |
| 逻辑契约测试 | ✅ 15/15 |
| 基线截图齐全 | ✅ 20 张（1920/1366/390/320 四尺寸） |
| **渲染零变化** | ✅ **20 张截图 vs 改动后 平均差全部 0.000%** |
| `npm test` 六层 | ✅ 全绿 |

---

## 二、P1 · 令牌收编与 D1 落地

### 2.1 收编方式：RGB 三元组色基（而非逐个透明度令牌）

实测发现**单个色基的透明度取值极为分散**——`rgba(185,138,47,…)` 一个色基就出现 **11 种**不同透明度。若逐个令牌化会产生 40+ 个令牌，反而加剧碎片化。

因此采用：

```css
/* 令牌层：只收敛「色基」 */
--rgb-red: 142,27,27;

/* 调用处：保留精确透明度 */
box-shadow: 0 0 0 12px rgba(var(--rgb-red), 0);
```

效果：色基统一（改一处即全局生效），透明度表达力不减。

### 2.2 数字变化

| 指标 | 收编前 | 收编后 | 变化 |
|---|---:|---:|---|
| 颜色字面量总数 | 225 | **151** | **−74（−33%）** |
| ├ hex 字面量 | 90 | 87 | −3 |
| └ rgba 字面量 | 135 | **64** | **−71（−53%）** |
| `var(--t-*)` 时长引用 | 8 | 8 | 待 P2 处理 |

### 2.3 D1 落地（含决策修订）

**修订原因**：初稿选 `#B85E52` 为主红，理由是「与已生成的 17 张图一致」。实测发现**该理由不成立**——生成图是**棕褐调银盐照片**，本身并不含 `#B85E52`。同时 D2 已决定保留「档案米白」底色，深档案红与之更协调。

**量化对比（20 张截图 vs P0 基线）**：

| 方向 | 平均差范围 | 0.000% 的张数 | 结论 |
|---|---|---|---|
| 主红 = `#B85E52` | 0.05% – **1.45%** | 0 | 改动面大，最大项逼近阈值 |
| **主红 = `#8E1B1B`** | 0.00% – **0.48%** | **10 / 20** | **采纳，改动面缩小约 3 倍** |

**落地内容**：
- `--c-red` 改为 `#8E1B1B`（唯一主红）；`#B85E52` 降为 `--c-red-soft`（保留备用，当前无引用）
- `--rgb-red` = `142,27,27`；`--rgb-red-soft` = `184,94,82`
- 25 处红色 rgba 全部统一到 `var(--rgb-red)` → **红色收敛为单轨**
- `variables.css` 的 `--red` 指向 `var(--c-red)`，取值与切换前相同 → **500+ 处 `var(--red)` 零变化**

**顺带清理**：删除 7 个**零引用**的臆测令牌 `--a-red-08/12/20/55`、`--a-gold-30/55`、`--a-ink-12`（P0 时预留但实测从未被任何规则引用），以符合「不造无用令牌」原则。

> D1 能「改两个取值即全局生效」，正是先做 P1 令牌化的价值。

---

## 三、改动性质分类

### 3.1 纯视觉 / 样式（不涉及行为）

- `css/tokens.css`（新增）、`css/variables.css`（垫片化）、`css/motion.css`（去重）
- 各模块 CSS 的 71 处颜色令牌化 + 25 处红色统一
- `index.html` 的资源加载顺序与版本号

### 3.2 工程 / 测试基础设施（不涉及游戏逻辑）

- `_playtest/style-lint.js`、`contract.test.js`、`visual-diff.py|js`、`style-baseline.json`
- `_playtest/harness.js`（新增两层）、`shots4.js`（`--baseline`）
- `package.json` scripts、`.gitignore`

### 3.3 事件 / 生命周期改动

**本轮为零。** P0/P1 未触碰任何 `js/systems/*` 与 `js/core/*` 业务代码。逻辑改动留待 P2/P3。

---

## 四、测试报告

| 命令 | 结果 | 说明 |
|---|---|---|
| `npm test` | ✅ 通过 | 六层：语法(29 文件) / 数据一致性 / 听写(87 向量) / 风格 lint(5) / 逻辑契约(15) / 冒烟 + 双开六幕通关 |
| `npm run test:style` | ✅ 5/5 | 可单独运行 |
| `npm run test:contract` | ✅ 15/15 | 可单独运行 |
| `npm run test:visual` | ✅ 20/20 | 阈值 1.5% |
| `npm run test:playthrough` | ✅ 通过 | 含在 `npm test` 内 |

**未执行**：真实系统打印对话框的页边距人工核对（仍用 `emulateMedia('print')` 校验）。

**测试环境**：Windows / Chrome（`C:/Program Files/Google/Chrome/Application/chrome.exe`）+ `playwright-core`；视觉对比用 Managed venv 的 Pillow 12.3.0。

---

## 五、截图与产物路径

| 产物 | 路径 |
|---|---|
| 视觉基线（20 张） | `_playtest/baseline/r3_*.png` |
| 当前截图（20 张） | `_playtest/shots/r3_*.png` |
| 差异报告与热力图 | `_playtest/visual-report/`（仅超阈值时生成） |
| 棘轮基线 | `_playtest/style-baseline.json` |

覆盖尺寸：1920×1080 / 1366×768 / 390×844 / 320×568。
覆盖场景：启动页（3 张）、地图（4 张）、钟楼第七声、公告栏第七行、渡口、老街、场景桌面/移动、证据板、时间线成功/失败、PAGE_032 修复、结局书写/恢复/打印。

> 基线目录已按 `.gitignore` 排除（可用 `npm run shots:baseline` 随时重建）。**基线已于 D1 落地后重建**，作为 P2/P3 的对比基准。

---

## 六、已知问题与剩余风险

1. **未做的核心部分**：P2/P3（新壳视图层迁移、`state → viewModel → render` 拆分、`?ui=next` 开关）**尚未开始**。这是「完全重构前端界面」的主体，当前只完成了它的前置条件（契约 + 门禁 + 令牌化）。
2. **纸张/地图装饰色未收编**：仍有约 53 种不同 hex 属纸张/地图过渡色（多为 2 次性），保留为 Tier 2 债务，计划随 P2 组件重写时归并为语义令牌。
3. **时长字面量未收编**：166 处动画时长仍为字面量，`var(--t-*)` 仅 8 处。棘轮已锁死（只能减少），归并放在 P2。
4. **棘轮基线的性质**：颜色/时长字面量的检查是「棘轮」而非「绝对值」——它保证**不新增**，不保证存量已清零。这一点已在 lint 输出中如实标注。
5. **动效帧序抖动**：视觉回归中带动画的场景存在 ≤0.5% 的固有波动（钟声波、尘粒）。判断依据是**静态页面恒为 0.000%**；如需更严格可对动画场景改用「静态化截图」模式。
6. **未在真实打印对话框验证**：仅通过媒体模拟校验。

---

## 七、明确未改动

- 剧情文本、谜题答案与同义答案、线索/地点/人物 ID、六幕节点与通关条件
- A/B 双人信息隔离、通话/口述/听写、碎片码交换、合卷与署名逻辑
- 隐藏 ARG 路径 `#/archive/A-017/page/032`、键入 `0-3-2`、HTML 注释碎片、CSS 线索变量
- `LP` 命名空间、系统初始化顺序、`localStorage` 存档键与结构（`last-page-save-v1`、`lp_evpos_v1`）
- 全部 `js/systems/*`、`js/core/*`、`js/data/*` 业务代码（本轮零改动）

以上均有 `_playtest/contract.test.js` 的 15 条断言作机器化保证。

---

## 八、下一步（P2/P3）

方案见 `FRONTEND_REBUILD_PLAN.md` §5、§9。要点：

1. 新增 `ui2/` 目录与 `?ui=next` 开关，新旧壳并存
2. 把 `mapSystem` 等系统的 **`state → viewModel(state) → render(vm)`** 拆开（纯函数、无副作用）
3. 按 `primitives → components → screens` 顺序迁移，每层跑一次 `npm run test:visual` 与 `npm test`
4. 收编 166 处时长字面量到 `var(--t-*)`，并归并纸张/地图装饰色
5. 全绿后翻转默认、删除旧实现

> 注意：P2/P3 是本项目**唯一涉及业务代码结构**的阶段，风险最高；必须坚持「每层迁移后立即跑视觉回归 + 双开通关」的节奏。

---

# P2 实施：绞杀者新壳（第一个垂直切片 —— 主线任务卡）

## 一、架构落地

| 新增 | 说明 |
|---|---|
| `ui2/index.js` | `LP.ui2`：开关（`?ui=next` / `localStorage.lp_ui=next`）、视图注册表、`mount()` |
| `ui2/view/questGuide.js` | `viewModel(state, data, ui) → vm` 与 `render(vm, ctx) → DOM`，**两个纯函数** |
| `ui2/primitives.css` | 新壳原子类（`.u2-card` / `.u2-badge` / `.u2-focusable`） |
| `ui2/components.css` | 任务卡新壳样式（`.u2-qg-*`），与旧壳视觉等价 |
| `ui2/screens.css` | P3 屏幕迁移用的占位 |

- 目录按方案文档置于**项目根级** `ui2/`。`index.html` 加载顺序：`motion.css` 之后接三份 ui2 样式；`js/data/questGuide.js` 之后接 `ui2/index.js` 与视图层。资源版本统一 `20261015a`。
- 类名命名空间 `u2-*`：新旧壳 DOM 并存、互不干扰，任何情况下都可回退。
- **旧壳完整保留**：`questGuideSystem.js` 的原渲染改名 `renderLegacy(box)`，默认仍走它。

## 二、`state → view-model → render` 解耦（P2 硬门禁）

`viewModel` 与 `render` 都不读写 `LP.state`，也不产生副作用：

```
LP.state.get() ─┐
LP.data        ─┼→ viewModel(s, d, ui) → vm（纯数据）→ render(vm, ctx) → DOM
会话 UI 状态   ─┘                                        ↑
                        事件 → ctx.onXxx() → systems 层业务 → 状态变更 → 回到起点
```

为达成这一点，数据层的步骤判定由闭包改为**纯谓词**：

```js
// 改前：闭包直接读 LP.state
{ text: '…', done: () => has('discoveredEvidence', 'clue_317') }
// 改后：只读传入的 state
{ text: '…', done: s => has(s, 'discoveredEvidence', 'clue_317') }
```

并新增 `needState()` 守卫：`state` 缺失时**主动抛错**，而不是静默判为「未完成」。

## 三、过程中发现并修复的两个真实缺陷

二者都不是本次重构引入的，而是被新加的工具照出来的。

**① `--sun` 从未定义 → 两条金色边框从未显示过**

`css/global.css` 的 `.boot-tag` 与 `css/quest-guide.css` 的 `.qg-wait-flag` 都写了 `border: … var(--sun)`，但项目里**从未定义 `--sun`**。CSS 中引用未定义变量且无 fallback 时，**整条声明会静默失效**（不是回退成某个值，而是完全不生效）。

→ 修复为已有的 `var(--c-gold)`（记入决策 D3）。带来一处**有意的视觉变化**：启动页宣传语出现 3px 金色左边框，「搭档」标签出现 1px 金色描边。
→ 新增 lint 规则 **A5「CSS 变量引用完整性」**，这类缺陷以后由机器守。

**② 判定签名错配导致旧壳静默降级**

数据层签名从 `done()` 改为 `done(state, data)` 后，`renderLegacy` 仍按旧签名 `st.done()` 调用 → `state` 为 `undefined` → **旧壳所有步骤判定退化成「未完成」**。

由 `ui-compare` 的像素对比抓出（新壳显示 `✓ 已完成`，旧壳显示序号 `1`）。

> **最值得记的一点**：首版对比用例恰好全是「全部未完成」的场景（act1/act5/act6 的初始状态），4 张 100% 一致，**造成假绿**。补齐「部分完成」用例后差异才暴露。
> → 视觉回归的用例**必须覆盖状态差异**，否则「一致」毫无意义。

→ 修复调用点，并新增契约断言 14 锁定签名与语义（含「漏传 state 必须抛错」）。

## 四、门禁增强

| 工具 | 变化 |
|---|---|
| `style-lint.js` | 新增 A5 变量引用完整性；A2 资源引用正则与 CSS 扫描范围扩展到 `ui2/`（共 6 条规则） |
| `contract.test.js` | 新增断言 14；断言 11/12/13 扩展覆盖 `ui2/`（共 16 条） |
| `ui-compare.js`（新增） | 同状态分别以旧壳 / 新壳渲染并逐张像素对比：`npm run ui:compare:diff` |

## 五、验证结果

- **新壳一致性**：`ui-compare` **8/8 全部 0.000%** —— 覆盖 act1 部分完成 · act2 A 卷等待 · act3 证据关系 0/3 与 3/3 · act5 A · act6 已写 · 折叠态。
- **六层回归**：`npm test` 全绿 —— 29 语法 / 数据一致性 / 87 听写 / lint 6 / 契约 16 / 双开通关。
- **全量视觉回归**（20 张 vs P1 基线）：全部在阈值内，其中 10 张 0.000%。
  - 有差异的集中在 `r3_boot_*`（0.045%–0.456%），即 `--sun` 修复让启动页金色左边框真正生效；其余为含动画场景的帧序抖动。
  - 基线已按修复后的状态重建。

## 六、P2/P3 进度与下一步

| 组件 / 屏幕 | 状态 |
|---|---|
| 主线任务卡 | ✅ 已迁移（旧壳保留） |
| 查看器 / 证据板 / 时间线 | ⬜ 待迁移 |
| P3 五个屏幕（启动 / 工作台 / 地图 / 实地 / 结局） | ⬜ 待迁移 |

迁移模式已跑通，后续按同一套路推进：
**数据层纯谓词 → viewModel + render 纯函数 → 旧壳 `renderLegacy` 保留 → `ui-compare` 验证 0.000% → `npm test` 六层回归**。
