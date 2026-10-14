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

---

# 第二轮：全交互界面与地图/实地探索动效升级（2026-10-14 晚）

> 定位：保留原有美术风格的精修升级，重点为地图与实地探索（P0），兼及核心交互反馈（P1）。

## 一、地图全面升级（P0）

- **手绘档案地图构图**：纸张底（多重径向渐层）、制图边框 + 四角定位线、方向罗盘（北）、比例尺装饰（示意）、三层手绘笔触河流（含缓慢高光流动）、街区块面/巷道轮廓、树丛、桥梁——全部由 SVG 原生形状 + CSS 绘制，无外部依赖
- **地点地标**：每个地点有独立手绘符号（档案馆档案盒 / 钟楼塔身+钟面 / 老街屋檐 / 渡口渡船+水波），锁定地点地标同步淡化
- **节点状态机**：未解锁（虚线淡影+？？？）/ 待勘察（红环）/ 已勘察（金点记档，读真实 `discoveredLocations`）/ 新解锁（一次性落印章扩散环）/ 选中（金红双环脉冲）；触控热区大于可见节点；全部节点支持键盘（Tab 聚焦 + Enter/Space）并带 aria-label
- **墨水路线**：`pathLength=1` 归一化描画（长短路线节奏一致），节点错峰入场；两端均已走访的路段追加一次金色行进光点后停止
- **地点预览卡**：悬停/聚焦/点击更新（名称/编号/描述/状态徽标：尚未开放·待勘察·✓已勘察/可调查数量），返回地图时恢复选中地点
- **图例**：改为可折叠 details，含自绘图例图标
- 保留原有单击直接进入现场行为（兼容既有测试），地点 ID/坐标/解锁条件/`canEnterScene` 双人规则全部未动

## 二、实地探索场景（P0）

- **分层构图**：场景生成照片衬底（背景层）+ 缓慢漂移的光斑尘粒环境层（低密度、可减动效关闭）+ 前景暗角/白纱 + 热点层 + 叙事反馈层
- **热点统一手感**：hover/focus 抬起+描边、按下扩散环、已勘察金色勾记（来自真实 `completedPuzzles`：bell7/board_row7/clocktower_door/bench_paper，刷新后仍正确）、tabindex/role/aria 全键盘可达
- **钟楼专属**：每次敲钟产生两层环形声波；第七声触发场景低幅震动 + 旧木门金色微光（铁索暗示）；钟面/公告栏/门逻辑不变
- **渡口专属**：点击水面在指针位置扩散同心波纹（自动消散）；船班木牌点击轻摆
- **老街专属**：场景构图与面摊/青石板热点反馈（招牌摊位聚焦动效）

## 三、核心交互反馈（P1）

- 工作台标签页墨线描画式下划线、内容区轻柔滑入、资料项按下手感与新资料一次性脉冲、检索框 focus 光环
- 按钮统一 pressed 态；toast 语义化边条；照片翻面纸片阴影；查看器工具按钮按下反馈
- 证据板节点拖拽抬起/选中金色光环；时间线拖拽中卡片浮起旋转、槽位柔和呼吸、卡片落位吸附动画

## 四、测试与验收

- `npm test` 全过：29 文件语法 / 数据一致性 / 87 听写向量 / 冒烟（隐藏 ARG）/ **双开 A/B 六幕通关**；零 JS 错误
- 视觉验收截图（`_playtest/shots/`，由 `_playtest/shots2.js` 生成）：`map_act2_desktop`（新解锁+墨线路线）、`map_act4_ferry_desktop`（多地点已勘察+选中+预览卡）、`map_mobile_390`、`scene_clocktower_fx`（钟声波+公告栏）、`scene_ferry_fx`（水面波纹）、`scene_oldstreet_fx`
- 资源版本号 bump 为 `?v=20261014b` 防旧缓存

## 五、已知限制

1. 渡口生成场景图的候船木牌上带有「候船」两字（生成图残留），属环境装饰、与谜题无关；如需严格无字可重新生成该图。
2. 时间线卡片暂未新增「点击选择目标槽」的拖放替代操作（现有拖放在移动端触屏可用，但无键盘替代）。
3. 预览卡在自动化截图中曾出现一次旧街预览残留，经实测脚本复验为截图脚本时序问题，实际交互（hover/聚焦/点击）均正确。
