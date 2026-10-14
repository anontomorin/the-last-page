# 视觉与体验升级 · 改动报告（2026-10-14）

> 任务书：`the-last-page-redesign-brief.md`（《第32页：写给未来的信》视觉与体验升级）
> 项目：the-last-page · 纯前端 HTML/CSS/JS · GitHub Pages 子路径部署

## 一、品牌更名

- 正式名称：**《第32页：写给未来的信》**（英文：`PAGE 032 — A LETTER TO THE FUTURE`）
- 更新位置：`index.html` 标题/描述/启动页主标题/启动页副标、README 标题与简介
- **未改动**（按任务书要求保留）：`A-017`、`PAGE_032`、`LP` 命名空间、隐藏线索路由 `#/archive/A-017/page/032`、键入 `0-3-2` 线索、存档键、GitHub Pages 仓库路径

## 二、视觉系统（明亮纸张 / 现代编辑式档案馆）

- 新调色板（`css/variables.css`）：暖白 `#F7F5EE`、卡片 `#FFFDF8`、主文字 `#28343A`、柔和砖红 `#B85E52`（仅用于关键线索/印章/主 CTA）、阳光淡金 `#E9CD91`、档案浅蓝 `#DCEAF0`、春芽绿 `#DCE8D7`
- 全屏扫描线透明度 0.05→**0.015**、噪点 0.05→**0.02** 且动画放缓；红色旗带保留但弱化
- 工作台标题栏新增 **「主线 n/6」**（`#wb-act-progress`），与「档案完整度」分离显示

## 三、启动页改版

- 封面主视觉 `cover_archive.webp`（生成）+ CSS 左侧渐层保证标题可读；移动端改垂直渐层
- 布局：档案编号 → 正式名称 → 英文副标 → 宣传语 → **3 步极简说明**（查看原件 / 发现与关联 / 交叉验证）→ 异常记录条 → **开始调查**（主 CTA）/ **继续整理**（有存档时）→ **双人拼卷**（次级折叠入口，展开后选执笔者卷 A / 记录者卷 B 并说明信息差异）
- 载入过场缩短（420ms/行→260ms/行）、提供**跳过按钮**、`prefers-reduced-motion` 下自动跳过

## 四、主线引导系统（新增 3 文件）

| 文件 | 职责 |
|---|---|
| `js/data/questGuide.js` | 六幕任务文案、A/B/单人分支步骤、行动目标定义 |
| `js/systems/questGuideSystem.js` | 读取真实状态决定当前任务、渲染任务卡、绑定真实导航与高亮 |
| `css/quest-guide.css` | 任务卡样式、目标高亮动画、移动端适配 |

- 任务卡显示：主线 n/6、任务标题、原因、步骤（未开始/进行中/✓完成）、状态徽标（进行中 / **等待搭档线索** / ✓ 本幕目标已达成）、主行动按钮、可折叠、「已完成的调查」列表（由真实 `act` 推导）
- 完成条件全部接入真实字段：`discoveredEvidence/Documents/People/Locations`、`completedPuzzles`、`evidenceLinks`（对照 `reasonRequired.act3`）、`tlWeather/tlDate`、`ocrFragments`、`photoFlipped`、`finalMessage/merged`
- 「前往目标」全部使用真实函数：`LP.archive.setTab` + 原件定位高亮、`LP.map.openScene`、`LP.duo.openPanel`、`LP.ending.resume`
- **不泄露答案**：任务文案只描述行动；A 卷看不到照片类目标（`docVisible` 拦截自动转通话面板）；等待步骤显示「搭档」徽标并指向通话面板
- 隐藏 ARG 线索不进入任务卡；三级提示系统保持独立

## 五、图片资源（17 张全部本地生成，PNG→WebP q82，合计约 2.1 MB）

| 文件 | 用途 / 集成位置 |
|---|---|
| `cover_archive.webp` | 启动页封面主视觉 |
| `scene_clocktower.webp` | 钟楼场景衬底（`.scene-photo`，热点下层，白纱保可读） |
| `scene_oldstreet.webp` | 老街场景衬底 |
| `scene_ferry.webp` | 渡口场景衬底 |
| `scene_reading_room.webp` | 地图页「旧阅览室」配图 |
| `portrait_linyuan/zhou_ning/chen_chuan/li_he.webp` | 人物页肖像卡（未确认身份显示留白相框，不剧透） |
| `detail_fold_mark.webp` | 合影背面（折痕照片）查看器衬底 |
| `detail_clock_0717.webp` | 钟楼场景 `.clock-face` 钟面衬底（HTML 指针叠加，答案以页面为准） |
| `detail_notice_row7.webp` | 公告栏纸张衬底（白纱下仍由真实 HTML 文字呈现 12 行） |
| `detail_letter.webp` | 信件查看器纸张衬底 |
| `page32_damaged.webp` / `page32_restored.webp` | PAGE_032 查看器衬底，随修复状态切换 |
| `ending_spring_morning.webp` | 结局页主视觉 |
| `texture_paper_light.webp` | 文档纸张低对比纹理 |

- 风格：按用户要求对齐既有档案照片（`photo_clocktower.jpg`、`IMG_0317.jpg` 等）的 **sepia 银盐老照片**质感，以原图为参考图生成（image-to-image）；图中无可读文字/数字，谜题信息全部由真实 HTML 呈现
- 既有 13 张剧情原件图片全部保留未动；所有路径为相对路径

## 六、回归测试结果

| 检查项 | 结果 |
|---|---|
| `npm test`（语法 29 文件 / 数据一致性 / 87 听写向量 / 冒烟 / **双开六幕通关**） | ✓ 全部通过 |
| 双开通关实测（A/B 各一卷，合卷 100%） | ✓ 全部断言通过，无 JS 错误 |
| 存档续玩 | ✓ 启动页「继续整理」+ `btn-continue` 逻辑保持 |
| A/B 信息隔离 | ✓ 通关测试覆盖（听写/碎片码交换才能推进） |
| 桌面 1920×1080 / 1366×768、移动 390×844 / 320×568 截图 | ✓ `_playtest/shots/`（8 张），无页面级横向溢出（body `overflow-x:hidden`） |
| 隐藏 ARG（URL 路由 + 键入 032） | ✓ 冒烟测试通过 |

## 七、已知限制

1. 生成的人物肖像与合影中的人物是「相近脸」而非严格同一人（生成模型限制）；已用高参考度 image-to-image 尽量对齐。
2. 钟面照片上自带指针与 HTML 指针叠加，视觉上略有重影；HTML 指针是权威呈现， veil 渐层已减弱照片指针的存在感。
3. 移动端 320px 下启动页底部小字会折行，不影响功能。
4. 截图脚本 `_playtest/shots.js` 与报告所需环境变量（`PLAYWRIGHT_PATH`/`CHROME_PATH`）同 `_playtest/playthrough.js`。

## 八、文件变更清单

**新增**：`js/data/questGuide.js`、`js/systems/questGuideSystem.js`、`css/quest-guide.css`、`assets/images/*.webp`（17 张）、`_playtest/shots.js`、`REDESIGN_REPORT.md`

**修改**：`index.html`（标题/封面启动页/任务卡容器/主线进度/资源引用）、`css/variables.css`（调色板）、`css/global.css`（降噪/启动页样式）、`css/map.css`、`css/document.css`、`css/archive.css`、`css/ending.css`（图片集成样式）、`js/systems/archiveSystem.js`（启动流程/跳过/双人折叠/主线进度/肖像卡/任务卡初始化）、`js/systems/mapSystem.js`（场景图/阅览室图/公告栏衬底）、`js/systems/documentSystem.js`（信件/PAGE_032 衬底）、`js/systems/photoSystem.js`（折痕背面衬底）、`js/systems/endingSystem.js`（结局主视觉）、`README.md`、`_playtest/playthrough.js`（适配折叠式双人入口）
