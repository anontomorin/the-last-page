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

---

# 第三轮：第六/七章补深 —— 全交互界面反馈与动效规范化（2026-10-14 晚）

## 六章 · 交互界面补全

- **6.1 工作台**：检索无结果时显示「未检索到与『关键词』相关的档案」；标签页墨线下划线（二轮已加）；资料项/新资料脉冲（二轮已加）
- **6.2 查看器**：`.red-mark` 红标批注金色衬底显影动画；Escape 关闭与遮罩过渡保持
- **6.4 人物卡**：四卡错峰入场（90ms 间隔）
- **6.5 证据板**：关系连线以墨画方式从节点「书写」显现（`stroke-dashoffset` 过渡，仅整板渲染后播放一次，拖动重绘不重复）；成功=两节点金环+连线点亮，失败=红环+文字反馈（非纯颜色）；**节点拖动位置持久化**（独立 localStorage 键 `lp_evpos_v1`，不改存档结构）；关系对话框 Escape 关闭 + 焦点移入首个选项
- **6.6 时间线**：验证错误时字段级突出（天气错→高亮天色下拉，日期错→高亮日期输入，均不清空已填内容）；成功时三日槽位逐段落位动画（金→绿）；拖放之外的点选放置原本已具备
- **6.7 提示/弹窗**：Toast 统一退出淡出动画；通话面板/照片排序/合卷/关系对话框全部支持 Escape 关闭，通话面板关闭后焦点归还触发按钮
- **6.8 结局**：最终页新增「跳过书写 ›」（中断打字机、瞬间补齐全部行、直接进入印章流程）；印章落印带回弹动画；纸页左侧淡金边缘光照；打印模式排除动效装饰

## 七章 · 动效规范化

- 新增 `css/motion.css`：统一时长变量（`--t-fast 160ms / --t-base 320ms / --t-slow 600ms / --t-reveal 1000ms`）、缓动曲线、mo 前缀关键帧集中管理（moFadeUp/moCard/moPaper/moInk/moStamp/moGlowRing/moWarnRing）、工具类（.mo-fade-up/.mo-card/.mo-paper/.mo-glow/.mo-warn）
- 所有新动效仅用 transform/opacity/stroke 可控属性；既有全局 `prefers-reduced-motion` 块自动覆盖新增动画

## 修复

- 证据板节点位置取值 bug（`layout()` 返回 x/y 误取 left/top 导致节点堆叠遮挡），已通过复现脚本定位修复
- 资源版本号 bump 为 `?v=20261014c`

## 测试

- `npm test` 全过（含双开 A/B 六幕通关，修复后复跑确认）
- 新增验收截图：`evidence_ink_draw.png`（连线墨画+任务卡 1/3 动态计数）、`ending_print_skip.png`（跳过书写按钮）

---

# 第三轮：资源引用修复 · 统一动效规范 · 地图与实地探索精修（2026-10-14）

> 定位：保留原有视觉语言的精修升级。P0 = 地图与实地探索；P1 = 线索/工作台/证据板/时间线；P2 = PAGE_032 与结局。
> 全部改动均不触碰剧情、谜题答案、线索/地点 ID、解锁规则、A/B 信息隔离、隐藏 ARG 入口与存档关键字段。

## 一、阶段 0 · 基线与备份

- 分支 `main`；基线提交 `bd7df88`；本轮起于检查点提交 `9b3f0ef`。
- 修改前运行 `npm test`（含 `_playtest/harness.js`）：**全部通过**（29 JS 语法 / 数据一致性 / 87 听写向量 / 冒烟 / 双开六幕通关）。

## 二、阶段 1 · 资源引用与动效规范（纯工程/视觉）

| 文件 | 改动 |
|---|---|
| `index.html` | **修正 39 处 CSS/JS 资源 URL**：把版本参数从属性引号外（`href="css/global.css"?v=…`）移到引号内（`href="css/global.css?v=…`），统一为 `20261014d`；在 `quest-guide.css` 之后接入 `css/motion.css` |
| `css/global.css` | `#fx-scanlines` 透明度 `.05 → .014`；`#fx-noise` `.05 → .018`，噪点动画 `1.2s → 3.2s`；`#fx-flash` 峰值 `.9 → .3`（避免全屏闪白） |
| `css/motion.css` | 补全令牌（`--t-micro 180ms`、`--t-reveal 900ms`、`--ease-soft` 曲线）；新增本轮关键帧（moRing/moSweep/moRevealLine/moDust/moRipple/moSwingOnce/moClipDrop/moFocusZoom 等）；末尾追加 `prefers-reduced-motion` 兜底 |
| `js/utils/animation.js` | 向后兼容增强：`countUp` 返回取消函数并自动取消同节点旧动画；新增 `reducedMotion()` / `after(node,fn,ms)` / `cleanup(root)` / `playOnce(node,cls)` / `cancel(node)`；`typewriter`/`flash`/`shake` 在减少动态效果下降级 |

## 三、阶段 2 · 地图与进入现场过场

- `.map-wrap` 桌面最大宽度 `860px → 980px`（规格 940–1040 区间）。
- 新增 `sceneTransition()`：**先 `openScene` 建好目标内容，再叠加纸张过场**（`pointer-events:none`、约 520ms、可被清理），不延迟建场、不阻塞交互与测试。
- **地图完整入场动画只在首次播放**：二次进入加 `.map-wrap.no-intro`，跳过纸面淡入/边框描画/路线描画/节点错峰，但保留「新解锁」的一次性印章扩散环。
- 节点状态机、预览卡、路线墨画、已勘察金点、返回恢复选中 —— 沿用并保持。

## 四、阶段 3 · 实地探索（本轮最高优先级）

- `.scene-stage`：`min(760px,94vw)` → **`min(960px,94vw)`**，高度 `min(72vh,640px)`，最小 420px；移动端 `min(60vh,480px)`、最小 340px。分层：照片衬底 → 尘粒环境层 → 遮罩/白纱 → 热点 → 反馈面板。
- **环境动效生命周期**：`bindSceneLifecycle()` 用 `IntersectionObserver` 在场景不可见时暂停尘粒；离开场景（返回工作台）时 `cleanup` 清除定时器/水波/过场遮罩。
- **热点统一手感**：默认安静 → hover/focus 微上移+描边+焦点环 → 按下扩散环+压感 → 已勘察金色勾记（来自真实 `completedPuzzles`）→ 首次发现一次聚焦入档（`found`）；键盘 Enter/Space 等价。
- **钟楼第七声**：前六声只做钟面回应 + 双层声波（不再每声全屏闪白）；第七声一次柔和暖光 + 场景低幅震动 + 木门金边微光，与叙事文本同步；`bellRings ≥ 7` 时提前 return，**不会重放高潮**；A/B 规则不变。
- **公告栏第七行**：点对目标行后 `moRevealLine` 700ms 渐显（水渍退去），再落金色底线；点错只给局部提示，不清空其他状态。
- **照片折痕**：翻面不变；点击折痕先由 `moSweep` 侧光沿折线扫过（620ms），落定后**立即入档**并显示线索卡；减少动态效果下直接显示。
- **渡口水波**：同一时刻最多 6 个涟漪，连点不堆叠；波纹定时器登记清理。**老街**：摊位/青石板点击触发局部聚焦（`focus-in`），不给整幅背景加强滤镜。

## 五、阶段 4–5 · 线索入档 / 工作台 / 证据板 / 时间线

- **线索入档**（`investigationSystem.js`）：`discoverClue` 仅首次入档时置 `pendingNewClue`，`renderClues` 对新线索卡播放一次 `moClipDrop` 纸条落位并让线索计数 `bump`；重复渲染不重播。
- **查看器**（`documentSystem.js`）：保留 Esc 关闭与纸片动画；新增**关闭后焦点交还**打开查看器的元素（`closeViewerAndRestore`）。
- **证据板**（`evidenceSystem.js`）：新增节点拖拽 `dragging` 抬起态（松开平滑落位、不改存储坐标）；新增**独立 SVG 连线预览层**，连线模式下从起点跟随指针画虚线（不被重绘清除）；正确=墨线描画+双节点金环+文字说明，错误=局部朱红+文字说明（不靠颜色单独传递）。
- **时间线**（`timelineSystem.js`）：成功演出收紧到 **≤900ms**（落位 600ms + 0/120/240ms 错峰）；点选放置的选中态由内联 outline 改为 `.picked` 类 + 槽位 `:focus-within` 温和高亮；失败仅标错字段、保留已填内容与点选放置。

## 六、阶段 6 · PAGE_032 与结局

- **修复了「跳过书写」可能二次触发结局的隐患**：新增完成守卫 `finished`，跳过与逐行两条路径都汇入 `finish()`，保证印章/完整度流程只执行一次；跳过时 `LP.anim.cancel(page)` 取消打字机与登记定时器后补齐全部行，不漏行、不重复。
- 最终页首次修复加 `fp-enter`（`moPaper` 纸页落位）；`resume()` 恢复时**不**加该类，不重放首次修复动画、不修改玩家输入。
- 结尾行用 `moFadeUp` 稳定淡入；`#print-page::before` 纸边淡金光为静态（不循环）；打印媒体下隐藏跳过按钮与装饰（截图 `r3_ending_print_1366` 仅输出最终页）。

## 七、测试与截图

- `npm test`（阶段 2–6 改动后复跑）：**全部通过** —— 29 JS 语法 / 数据一致性 / 87 听写向量 / 冒烟（隐藏 ARG `css_032`、焦点样式）/ **双开 A/B 六幕通关**，零运行期错误。
- 新增 `_playtest/shots4.js`（支持 `ONLY=名字` 子集运行），产出 20 张第三轮验收截图于 `_playtest/shots/`：
  - 启动页：`r3_boot_desktop_1920`、`r3_boot_mobile_390`、`r3_boot_mobile_320`
  - 地图：`r3_map_enter_1366`（新解锁）、`r3_map_unlock_1366`（已勘察+预览）、`r3_map_desktop_1920`、`r3_map_mobile_390`
  - 钟楼：`r3_scene_bell7_1366`（第七声）、`r3_scene_board_row7_1366`（第七行显影）、`r3_scene_desktop_1920`、`r3_scene_mobile_390`
  - 渡口/老街：`r3_scene_ferry_fx_1366`、`r3_scene_oldstreet_fx_1366`
  - 推理：`r3_evidence_1366`（连线+进度）、`r3_timeline_fail_1366`（字段/分组失败）、`r3_timeline_done_1366`
  - 结局：`r3_p32_recovery_1366`、`r3_ending_write_1366`（含跳过）、`r3_ending_resume_1366`、`r3_ending_print_1366`（打印）
- 双人卷别下的活动流程由既有 `playthrough.js` 覆盖（A 卷不可进入现场、B 卷现场探索、碎片码合卷、隐藏结局）。

## 八、已知问题与剩余风险

1. `css/document.css` / `motion.css` 中的 `.red-mark`（红标批注显影）在当前剧情数据里**没有被使用**——文档正文未标记该类，故该动画实际无触发点（保留样式，未伪造正文标记）。
2. 生成钟面照片自带罗马数字与约 10:08 指针，与 HTML 权威指针（7:17）在白纱下仍略有叠影；HTML 指针为权威呈现。
3. 时间线仍未提供「键盘拖放」替代（现有点选放置已覆盖无拖放场景，键盘用户可用点选）。
4. 打印样张通过 `emulateMedia('print')` 校验；未在真实系统打印对话框中人工核对页边距。

## 九、明确未改动

- 剧情文本、谜题答案与同义答案、线索/地点/人物 ID、六幕节点与通关条件；
- A/B 双人信息隔离、通话/口述/听写、碎片码交换、合卷与署名逻辑；
- 隐藏 ARG 路径 `#/archive/A-017/page/032`、键入 `0-3-2`、`--missing-page` 线索；
- `LP` 命名空间、系统初始化顺序、`localStorage` 存档键与结构（证据板位置仍用独立键 `lp_evpos_v1`）。
