# 逻辑契约 · CONTRACT

> **性质**：冻结文档 + 可执行断言。本文件定义《第32页：写给未来的信》**不允许被重构改动**的逻辑边界。
> **效力**：**最高**。`_playtest/contract.test.js` 是本文件的机器化实现——**任何重构都不得修改该测试文件**。
> 若某项确需变更，必须先单独评审本文件，并同步更新测试与迁移方案（尤其存档迁移）。
> **运行**：`npm run test:contract`，或随 `npm test` 一起运行。

---

## 1. 命名空间与初始化顺序（冻结）

保留全局 `LP` 与 IIFE 模块结构，不引入模块系统、打包器、CDN、运行时依赖。

初始化顺序**不得变更**：

```
LP.save.load
  → LP.router.init
    → LP.doc.init
      → LP.map.init
        → LP.inv.initHint
          → LP.duo.init
            → LP.archive.init
```

**规则 C1**：新模块必须挂到 `LP.*` 下，并在 `index.html` 中按依赖顺序显式引入（带版本号）。

---

## 2. 状态结构（冻结）

`LP.state` 的 **29 个字段名、语义与默认值**不得变更：

```
currentScene · act · mode · archiveProgress
discoveredEvidence · discoveredPeople · discoveredLocations · discoveredDocuments
unlockedDocs · unlockedLocationsData
timelineNodes · tlWeather · tlDate
evidenceLinks · evidenceTrials · act3Hinted
unlockedPages · completedPuzzles · hiddenClues
finalMessage · partnerMessage · partnerName · merged
bellRings · photoFlipped · hintLevels · ocrFragments · page32Found · ending
```

> **注**：初稿此处误记为 27 项，漏了 `act3Hinted`（第三幕引导只提示一次）与 `page32Found`（第32页已触发）。由 `contract.test.js` 首次运行抓出，已按实际代码修正。这两个字段属于既有状态语义，不得删除。

**规则 C2**：允许新增字段，**不允许**重命名、删除或改变既有字段的语义与默认值。

---

## 3. 存档（冻结）

| 键 | 用途 | 值 |
|---|---|---|
| `last-page-save-v1` | 主存档（`LP.storage.KEY`） | 完整 state JSON |
| `lp_evpos_v1` | 证据板节点位置（**独立键**，不进主存档） | `{ id: {left, top} }` |
| `lp_ui` | 新旧壳切换开关（P2 引入） | `'next'` \| 未设置 |

**规则 C3**：键名与结构不得变更。若必须变更，需提供**迁移方案**（读到旧键 → 转换 → 写新键 → 保留旧键一个版本）。

**规则 C4**：`LP.save.hasSave()` 的判定语义不变（`act > 0 || discoveredDocuments.length > 0`），"继续整理" 行为不变。

---

## 4. 路由与隐藏 ARG（冻结）

| 项 | 值 |
|---|---|
| 隐藏路径 | `#/archive/A-017/page/032`（正则 `/#\/archive\/A-017\/page\/0?32/i`） |
| 命中写入 | `hiddenClues` 加入 `'url_032'` |
| 档案本体路径 | `#/archive/A-017` |
| 键盘线索 | 依次键入 `0` `3` `2` → 写入 `css_032` |
| CSS 变量线索 | `--archive-index: 031`、`--missing-page: 032` |
| HTML 注释碎片 | `ARCHIVE FRAGMENT 01` / `ARCHIVE FRAGMENT 02` 保留 |

**规则 C5**：以上全部保留。**不得**删除 HTML 注释、CSS 变量或任何可能属于隐藏 ARG 的代码线索。

---

## 5. 谜题与数据（冻结）

| 项 | 基线值 |
|---|---|
| `reasonRules` 数量 | **53** |
| `reasonRequired.act3` | `["id_zhou", "id_chen", "id_li"]` |
| `evidenceGraph` 数量 | 31 |
| `clues` / `documents` / `people` / `locations` | 25 / 49 / 4 / 4 |
| 时间线卡片 | 7 |
| `PAGE32.fragments` | 5 |

**规则 C6**：谜题 ID、答案、同义答案、`reasonRules` 全量、`reasonRequired` 内容、六幕判定条件均不得改动。

**规则 C7**：**A/B 信息隔离**不得削弱——A 卷不可进入实地现场；B 卷负责实地探索；口述 / 听写 / 碎片码通道不变。

**规则 C8**：**视觉不得泄露另一卷信息**——任何动画文案、图标、提示中都不得出现对方卷才该知道的内容。

---

## 6. 打印（冻结）

**规则 C9**：`window.print()` 只输出 `#print-page`；跳过按钮与所有装饰动效不得进入打印输出。

---

## 7. 资源引用与加载顺序（冻结）

**规则 C10（血泪教训）**：资源版本参数**必须写在属性引号内**。

```html
✅ <link rel="stylesheet" href="css/global.css?v=20261015a">
❌ <link rel="stylesheet" href="css/global.css"?v=20261015a>
```

引号外的版本参数会被浏览器解析为布尔属性，导致**缓存失效机制静默失效**（本项目历史上曾因此让 39 处缓存策略全部失灵）。

**规则 C11**：所有资源使用**统一版本号**，同一批次改动统一 bump。

**规则 C12**：CSS 加载顺序固定：

```
reset.css → tokens.css → variables.css → global.css
→ archive.css → document.css → map.css → timeline.css
→ evidence.css → ending.css → quest-guide.css → motion.css（最后）
```

`motion.css` 必须在最后，其中的 `prefers-reduced-motion` 兜底必须保留。

---

## 8. 部署（冻结）

**规则 C13**：只允许**相对路径**。`assets/images/x.webp` ✅；`/assets/images/x.webp` ❌（GitHub Pages 子路径部署会 404）。无 `<base>` 标签、无绝对域名。

---

## 9. 可执行断言清单

`_playtest/contract.test.js` 逐条实现以下断言：

| # | 断言 | 对应规则 |
|---|---|---|
| 1 | `LP.state.DEFAULTS` 的键集合与基线一致（29 键） | C2 |
| 2 | 存档键 `last-page-save-v1`、`lp_evpos_v1` 存在且未变 | C3 |
| 3 | `hasSave()` 语义字符串未变 | C4 |
| 4 | 隐藏路径正则可命中 `#/archive/A-017/page/032` 与 `/032` | C5 |
| 5 | `--missing-page === 032`、`--archive-index === 031` | C5 |
| 6 | HTML 保留 `ARCHIVE FRAGMENT 01/02` 注释 | C5 |
| 7 | `reasonRules.length === 53` | C6 |
| 8 | `reasonRequired.act3` 内容一致 | C6 |
| 9 | `evidenceGraph.length === 31` | C6 |
| 10 | `PAGE32.fragments.length === 5` | C6 |
| 11 | 全部资源引用版本参数在引号内 | C10 |
| 12 | CSS 加载顺序符合 C12 | C12 |
| 13 | 源码中不存在绝对路径 `/assets/` | C13 |

---

*本文件为冻结契约。实施完成后应产出《重构实施报告》，但**不得**修改本文件与 `contract.test.js`。*
