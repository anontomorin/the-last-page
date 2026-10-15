# 美术资产 · 风格圣经与生成记录（art-prompts）

> 对应方案：`FRONTEND_REBUILD_PLAN.md` §6。本文档是全部美术资产的**唯一权威风格定义**；
> 每张新图的提示词、参考图与重roll记录都追加在 §4 的表格里——这张表是后续再生成时最重要的资产。

---

## 1. 风格定义（Style Bible）

### 1.1 一句话风格

**民国中国小镇的棕褐色银盐老照片**——像从一本 1935 年的档案相册里取出来的纸面，
柔和、克制、微微褪色，永远不恐怖、不戏剧化。

### 1.2 色板

| 用途 | 值 | 说明 |
|---|---|---|
| 纸面高光 | `#F4F1EA` | 相纸边缘 / 天空过曝区 |
| 纸面中间调 | `#C9B896` | 主体受光面 |
| 棕褐主调 | `#8A6F4D` | 全图主导色温（sepia 基准） |
| 暗部 | `#3E342A` | 阴影 / 门洞 / 树影 |
| 最深黑 | `#241F18` | 仅小面积（窗框、砖缝） |
| 点缀暖色 | `#B98A2F` | 极少：灯光、金色反光 |

> UI 令牌（`tokens.json`）管界面配色；本表只管**照片内部**的色调目标。

### 1.3 光线规则（全项目统一）

- **唯一光源：上午柔和自然光**（东/东南向窗光或天光）。
- 允许：轻雾、薄云漫射、逆光剪影（远景）。
- 禁止：夜景、硬光直射、强投影、霓虹、烛光戏剧光。

### 1.4 镜头与构图规则

| 类别 | 规则 |
|---|---|
| 场景图 | 3:2 横幅（1536×1024 生成）+ 竖档（1024×1536）；地平线放中下 1/3；**留出干净的中景区域** |
| 肖像 | 3:4（768×1024）+ 1:1（768×768）；胸像以上；视线看向画面外或微垂，**不看镜头** |
| 物件特写 | 近 45° 俯角或平视；主体占画面 60–80% |
| 颗粒 | 均匀细颗粒（后处理统一叠加，提示词只提「胶片颗粒」） |

### 1.5 质感关键词（提示词里逐字使用）

```
民国中国小镇，棕褐色调银盐老照片，胶片颗粒，柔和自然光，
轻微褪色，低饱和，克制的档案质感。画面中不出现任何可读文字、数字、水印、
logo、边框、现代物品。
```

### 1.6 负面词固定段（每次都带）

```
无可读文字、无数字、无水印、无 logo、无边框、无现代元素、非恐怖氛围、非末日、非赛博霓虹
```

### 1.7 正 / 负例句

**✅ 正例**（主体段写法）：

> 旧钟楼立于石板街角，砖砌塔身有一道拱形木门，门前一条长椅；
> 晨光从画面左侧照来，远景街道微雾；平视中景构图，塔身放在画面右侧三分之二处，
> 左侧留出干净的街道空间；保持与参考图完全一致的老照片风格。

**❌ 负例**（不要这样写）：

- 「时钟指针指向 7 点 17 分」——**答案进图 = 致命违规**（§6.1）
- 「公告栏上写着……」——任何可读文字都不允许
- 「恐怖的、阴森的、血迹」——氛围越界
- 「高清、8K、锐利」——破坏银盐质感

### 1.8 答案隔离硬约束（§6.1 复述，违者废弃重做）

| 对象 | 规则 |
|---|---|
| 钟面时间 | ❌ 图内不得出现 7:17 或任何「正确的」时间；钟面指针由 DOM 绘制 |
| 公告栏第七行 | ❌ 图内文字只能是模糊伪字；真实文字是 DOM |
| 折痕数字 / 日期天气 | ❌ 一律 DOM |
| 地图 | ❌ 不出图，必须 SVG |
| 图标 | ❌ 不出图，内联 SVG |

---

## 2. 黄金参考图（i2i 的 image1 来源）

> 2026-10-15 起原件统一为 WebP（§6.9「WebP 主」；原 JPG 在 git 历史中可还原）。

| 参考图 | 用途 |
|---|---|
| `assets/images/photo_clocktower.webp` | 钟楼 / 街景类派生 |
| `assets/images/photo_ferry.webp` | 渡口 / 水景类派生 |
| `assets/images/photo_linyuan.webp` | 人物肖像类派生 |
| `assets/images/IMG_0317.webp` | **人物一致性锚点**（合影；所有肖像必须以它为参考） |

**定调 hero**：`assets/images/cover_archive.webp`（档案桌 + 日记 + 信封 + 窗外钟楼）。
本轮审定为既定 hero（存量高质量、风格达标，零积分），后续所有派生以它为风格基准。

---

## 3. 生成流水线（五步）

1. **风格圣经** —— 本文档 §1。
2. **定调 hero** —— 已审定为存量 `cover_archive.webp`（零积分；若未来重做，允许 roll 6–10 次）。
3. **以图生图派生** —— ImageGen `image1` = 上表对应参考图；`input_fidelity: high`；
   提示词 = §1.5 质感前缀 + 主体段（§1.7 模板）；人物必须写「与参考图中同一张脸」。
4. **确定性后处理** —— `tools/art-pipeline.py`：sepia 统一 → 颗粒 → 暗角 → 裁切 → 缩放
   → 水印区裁除 → WebP（q82–85）导出 + 写 manifest。**「风格一致」由这一步保证，不靠提示词。**
5. **拼版质检 + 导出** —— `tools/art-pipeline.py contact-sheet` 拼版 → 人工审核 → 体积核对。

---

## 4. 生成记录表（逐张追加，不删历史）

> 存量 17 张 WebP 生成于本规范建立之前，提示词未存档，标注为「存量」。
> 本轮（2026-10-15）净增派生的记录从下方表格开始。

| 文件 | 类型 | 参考图 (image1) | 重roll | 采用版本 | 备注 |
|---|---|---|---|---|---|
| cover_archive.webp | 存量 | — | — | — | 定调 hero |
| scene_clocktower.webp | 存量 | — | — | — | |
| scene_ferry.webp | 存量 | — | — | — | 图内「候船」木牌为剧情合理文字，非答案 |
| scene_oldstreet.webp | 存量 | — | — | — | |
| scene_reading_room.webp | 存量 | — | — | — | |
| portrait_linyuan.webp | 存量 | — | — | — | |
| portrait_zhou_ning.webp | 存量 | — | — | — | |
| portrait_chen_chuan.webp | 存量 | — | — | — | |
| portrait_li_he.webp | 存量 | — | — | — | |
| detail_clock_0717.webp | 存量 | — | — | — | 钟面时间为无关时刻；DOM 指针覆盖（R4 通过） |
| detail_notice_row7.webp | 存量 | — | — | — | 图内为伪字 + 88% 白纱覆盖（R4 通过） |
| detail_letter.webp | 存量 | — | — | — | |
| detail_fold_mark.webp | 存量 | — | — | — | |
| page32_damaged.webp | 存量 | — | — | — | |
| page32_restored.webp | 存量 | — | — | — | |
| ending_spring_morning.webp | 存量 | — | — | — | |
| texture_paper_light.webp | 存量 | — | — | — | |

### 本轮净增（P5）

> 工具：ImageGen i2i（`image1` = 参考图，`input_fidelity: high`，1024 宽原生尺寸）。
> 流水线：`tools/art-pipeline.py process`（sepia 统一 0.30 → 颗粒(文件名定种) → 暗角 0.12 → cover 裁切 → WebP 质量阶梯到 role 预算）。
> 事故记录：首轮 3 张并行生成时，两张同名 PNG 同秒写出互相覆盖（浪费 1 次生成）→ 之后一律**串行生成 + 立即改名**。

| 文件 | 类型 | 参考图 (image1) | 重roll | 采用版本 | 备注 |
|---|---|---|---|---|---|
| scene_clocktower_tall.webp | 竖档场景 960×1280 | photo_clocktower.webp | 1/2（第 1 次被同名覆盖） | 第 2 次 | q80 · 145 KB |
| portrait_linyuan_1x1.webp | 1:1 肖像 768×768 | photo_linyuan.webp | 1/1 | 第 1 次 | q84 · 37.8 KB |
| cover_tall.webp | 竖版封面 900×1350 | cover_archive.webp | 1/2（第 1 次即被覆盖的歧义图，经相似度判定找回） | 第 1 次 | q82 · 101 KB |
| scene_ferry_tall.webp | 竖档场景 960×1280 | photo_ferry.webp | 1/1 | 第 1 次 | q84 · 73.9 KB |
| scene_oldstreet_tall.webp | 竖档场景 960×1280 | scene_oldstreet.webp | 1/1 | 第 1 次 | q80 · 145.4 KB |
| scene_reading_room_tall.webp | 竖档场景 960×1280 | scene_reading_room.webp | 1/1 | 第 1 次 | q84 · 111.6 KB |
| portrait_zhou_ning_1x1.webp | 1:1 肖像 768×768 | portrait_zhou_ning.webp | 1/1 | 第 1 次 | q84 · 45.5 KB（预留） |
| portrait_chen_chuan_1x1.webp | 1:1 肖像 768×768 | portrait_chen_chuan.webp | 1/1 | 第 1 次 | q84 · 51.4 KB（预留） |
| portrait_li_he_1x1.webp | 1:1 肖像 768×768 | portrait_li_he.webp | 1/1 | 第 1 次 | q84 · 51.7 KB（预留） |
| ui_paper_1024.webp | 纸纹 1024×1024 | texture_paper_light.webp（已退役，git 历史可查） | 1/1 | 第 1 次 | q84 · 34.2 KB，--flat 处理（无 sepia/颗粒/暗角） |

**接入记录（P5-2）**：

- 启动页封面：`<picture>` ≤640px 切 `cover_tall.webp`；`display:contents` 让 picture 不参与布局。
- 场景照片（ui2 + 旧壳同步）：`<picture>` ≤640px 切 `scene_*_tall.webp`；`decoding=async`。
- 纸纹：`.paper-doc` 换用 `ui_paper_1024.webp`（1024 tile，接缝更少）；`texture_paper_light.webp` 退役。
- 全部 JS 创建的 `<img>` 补 `decoding=async`；文档缩略图补 `loading=lazy`；结局主视觉 / 阅览室图补 `width/height` 防 CLS。
- 全局兜底：`dom.js` 捕获阶段监听 img error → 隐藏破图，露出 CSS 渐层衬底（§6.10）。
- 1:1 肖像为**预留资产**：人物卡实际是 3:4（方案预设与实现不符），3:4 原档继续上岗。
