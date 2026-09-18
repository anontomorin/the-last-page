/* ============================================================
   资料数据 —— 剧情与数据分离
   type: diary 日记 | photo 照片 | letter 信件 | map 地图 | file 损坏文件
   cred: 可信度（高/中/低 + 记录性质）
   ============================================================ */
window.LP = window.LP || {};
LP.data = LP.data || {};

LP.data.documents = {

  /* ---------------- 日记 ---------------- */
  diary_01: {
    id: 'diary_01', type: 'diary', no: '01', title: '日记 · 其一',
    date: '……月17日', cred: { level: '中', kind: '主观记录' },
    unlock: 'start',
    content: [
      '今天是17号。',
      'C 又在抱怨天气，说被子永远是潮的。L 一整天没说话，只是拍照。Z 问我：我们真的知道自己在做什么吗？',
      '我不知道怎么回答。',
      '我只知道，有些事现在不做，以后也许就没有机会了。'
    ],
    clues: ['clue_date17'],
    related: ['diary_03', 'photo_01']
  },

  diary_02: {
    id: 'diary_02', type: 'diary', no: '02', title: '日记 · 其二',
    date: '……月09日', cred: { level: '中', kind: '主观记录' },
    unlock: 'start',
    content: [
      '搬进了新地方。房间不大，窗户朝北，白天也要点灯。',
      'Z 说北窗好，北窗安静，适合看书。',
      'C 说北窗冷。L 没说话，把桌子搬到了窗边，说光线够拍照就行。',
      '四个人，一间屋。也好。'
    ],
    clues: [],
    related: ['person_zhou', 'person_chen', 'person_li']
  },

  diary_03: {
    id: 'diary_03', type: 'diary', no: '03', title: '日记 · 其三',
    date: '3月17日', cred: { level: '中', kind: '主观记录' },
    unlock: 'start',
    content: [
      '三月十七日。',
      '路过旧钟楼的时候，钟慢了四分钟。C 说这钟和他一样，总是慢半拍。我们都笑了。',
      '我们在钟下站了很久。L 举起相机，说要给我们拍一张。',
      '快门响的时候，谁都没有说话。不知道为什么，我忽然觉得，这一天以后会被记住的。'
    ],
    clues: ['clue_clocktower'],
    related: ['photo_01', 'location_clocktower'],
    onReadWith: { clue: 'clue_317', trigger: 'deduce_act1' }
  },

  diary_05: {
    id: 'diary_05', type: 'diary', no: '05', title: '日记 · 其五',
    date: '……月22日', cred: { level: '中', kind: '主观记录' },
    unlock: 'start',
    content: [
      'Z 今天又问那个问题：如果不知道结果，还要不要向前走？',
      '我说我不知道。',
      '她说她想了一晚上，觉得答案应该是「要」。理由是：不走的话，就连知道结果的资格都没有。',
      '她总是想得比我深。'
    ],
    clues: [],
    related: ['person_zhou']
  },

  diary_07: {
    id: 'diary_07', type: 'diary', no: '07', title: '日记 · 其七',
    date: '……月02日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act2',
    content: [
      'C 说，等这一切结束，他要回家吃他娘做的面，要放很多葱花。',
      '我们都笑了。笑着笑着，大家都没说话。',
      '原来想家是会传染的。'
    ],
    clues: [],
    related: ['person_chen', 'letter_03']
  },

  diary_12: {
    id: 'diary_12', type: 'diary', no: '12', title: '日记 · 其十二',
    date: '3月15日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act2',
    content: [
      '事情有变。我们本来约定十七号就走，现在要再等等。',
      'Z 把联络的办法改了：以钟声为号。',
      '她在布告栏那边等我的时候说——',
      '「等钟响七次以后，我们就该走了。」',
      '七次。我记住了。'
    ],
    clues: ['clue_bell7'],
    related: ['location_clocktower', 'person_zhou']
  },

  diary_15: {
    id: 'diary_15', type: 'diary', no: '15', title: '日记 · 其十五',
    date: '3月10日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act2',
    content: [
      'L 把每张照片的背面都写上日期和天气。',
      '我问她为什么。她说：「怕以后的人忘记。也怕以后的人记错。」',
      '她又补了一句：照片不会替人撒谎，人会。',
      '这句话我想了很久。'
    ],
    clues: ['clue_photoback'],
    related: ['person_li', 'photo_01', 'photo_05']
  },

  diary_19: {
    id: 'diary_19', type: 'diary', no: '19', title: '日记 · 其十九',
    date: '3月12日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act2',
    content: [
      '今天教大家认字。来的人比上次多。',
      '有个孩子问我：先生，认字有什么用？',
      '我说：认字以后，你就可以把自己的故事写下来，留给很远很远以后的人看。',
      '孩子又问：他们会看吗？',
      '我说：会的。一定会的。'
    ],
    clues: [],
    related: ['person_linyuan']
  },

  diary_24: {
    id: 'diary_24', type: 'diary', no: '24', title: '日记 · 其二十四',
    date: '3月██日', cred: { level: '低', kind: '主观记录 · 日期污损' },
    unlock: 'act4',
    content: [
      '三月██日。（此处被水渍浸染）',
      '今天是个好日子。天气很好。',
      '我们把东西送到了。回来的时候，太阳正好落在钟楼背后。',
      '我在心里跟自己说：记住今天。'
    ],
    clues: ['clue_conflict_sun'],
    related: ['letter_02', 'letter_03', 'photo_05', 'timeline']
  },

  diary_27: {
    id: 'diary_27', type: 'diary', no: '27', title: '日记 · 其二十七',
    date: '3月19日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act5',
    content: [
      '我开始写一份新的东西。不是日记，是单独的一页。',
      '如果有一天有人看到它，我希望他知道——我们并不后悔。',
      '这一页我写了很久。最后一句，我决定空着。',
      'Z 问我为什么空着。我说：因为那句话不该由我来说。',
      '她点了点头，好像懂了。'
    ],
    clues: ['clue_page32_hint'],
    related: ['page_032']
  },

  diary_31: {
    id: 'diary_31', type: 'diary', no: '31', title: '日记 · 其三十一（最后一篇）',
    date: '3月21日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act5',
    content: [
      '这本日记快写完了。',
      '最后一页，我想留给……',
      '（后面的字被整齐地裁掉了。切口很平，是他自己动的手。）'
    ],
    clues: ['clue_page32_cut'],
    related: ['page_032']
  },

  /* ---------------- 照片 ---------------- */
  photo_01: {
    id: 'photo_01', type: 'photo', no: '01', title: '旧照片 · 四人合影',
    date: '未知', cred: { level: '高', kind: '视觉记录' },
    unlock: 'start',
    src: 'assets/images/IMG_0317.jpg',
    meta: { file: 'IMG_0317.jpg', size: '812 KB', scan: '600dpi', note: '文件名与编号由数字化系统自动生成' },
    desc: '四名年轻人站在一栋旧建筑前。风把最左边那人的衣角吹了起来。没有人笑，但也没有人显得难过。',
    back: {
      text: '（背面似乎是空白的。）',
      crease: true,          // 右下角折痕
      creaseClue: 'clue_317'
    },
    hotspots: [],            // 人物确认后由系统注入高亮
    clues: [],
    related: ['diary_03', 'location_clocktower']
  },

  photo_02: {
    id: 'photo_02', type: 'photo', no: '02', title: '旧照片 · 青年单人像',
    date: '未知', cred: { level: '高', kind: '视觉记录' },
    unlock: 'start',
    src: 'assets/images/photo_linyuan.jpg',
    meta: { file: 'IMG_0302.jpg', size: '640 KB', scan: '600dpi' },
    desc: '一个年轻人站在窗前，手里捏着一支笔。照片有些虚，像是他自己按的快门。',
    back: { text: '「给自己。——远」', crease: false },
    clues: ['clue_linyuan_self'],
    related: ['person_linyuan']
  },

  photo_03: {
    id: 'photo_03', type: 'photo', no: '03', title: '旧照片 · 钟楼',
    date: '未知', cred: { level: '高', kind: '视觉记录' },
    unlock: 'act1_done',
    src: 'assets/images/photo_clocktower.jpg',
    meta: { file: 'IMG_0318.jpg', size: '955 KB', scan: '600dpi' },
    desc: '一座旧钟楼。砖墙上的钟面停在七点十七分。',
    back: { text: '「0318 雨 · 钟停了」', crease: false },
    clues: ['clue_clock717_visual'],
    related: ['location_clocktower']
  },

  photo_05: {
    id: 'photo_05', type: 'photo', no: '05', title: '旧照片 · 雨中的街',
    date: '未知', cred: { level: '高', kind: '视觉记录' },
    unlock: 'act4',
    src: 'assets/images/photo_rain_street.jpg',
    meta: { file: 'IMG_0319.jpg', size: '701 KB', scan: '600dpi' },
    desc: '一条空荡荡的老街，下着雨。青石板路反着光，像是有人刚刚离开。',
    back: { text: '「0318 雨 · 送他们走」', crease: false },
    clues: ['clue_rain_0318'],
    related: ['diary_24', 'letter_02', 'timeline']
  },

  /* ---------------- 信件 ---------------- */
  letter_01: {
    id: 'letter_01', type: 'letter', no: '01', title: '信件 · 致 Z',
    date: '……月20日', cred: { level: '中', kind: '主观记录' },
    unlock: 'start',
    content: [
      'Z：',
      '你说得对，我们必须想清楚自己在做什么。',
      '但有些事，想清楚了也还是要做。没想清楚的，做着做着就清楚了。',
      '你说我们会不会被忘记？我想，会的吧。大多数人都被忘记了。',
      '可被忘记，不等于没有存在过。——L.Y.'
    ],
    clues: [],
    related: ['person_zhou', 'person_linyuan']
  },

  letter_02: {
    id: 'letter_02', type: 'letter', no: '02', title: '信件 · 门缝里的纸',
    date: '3月16日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act2_door',
    content: [
      '远：',
      '布告我贴在钟楼里了。记住，第七行。',
      '你们总说我疑心重。可越是这种时候，越要把每一行字都看清楚。',
      '我记得走的那天下着雨，冷得很。你在本子上却写「天气很好」。',
      '也许你的记忆比我的勇敢。——Z.N.'
    ],
    clues: ['clue_row7', 'clue_conflict_rain'],
    related: ['location_clocktower', 'person_zhou', 'diary_24']
  },

  letter_03: {
    id: 'letter_03', type: 'letter', no: '03', title: '信件 · 家书',
    date: '3月16日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act3',
    content: [
      '娘：',
      '见字如面。这里的面没有你做的好吃，葱花也舍不得多放。',
      '这几天倒春寒，冷得很，我把你絮的那件棉袄又翻出来穿上了。',
      '儿子在外边都好，认识了几个朋友，都是好人。勿念。',
      '等忙完这一阵，我就回家。——儿 陈川'
    ],
    clues: ['clue_cold_0316', 'clue_chen_name'],
    related: ['person_chen', 'diary_07', 'timeline']
  },

  letter_04: {
    id: 'letter_04', type: 'letter', no: '04', title: '信件 · 照片编号说明',
    date: '3月20日', cred: { level: '高', kind: '整理说明' },
    unlock: 'act3',
    content: [
      '留给整理这些照片的人：',
      '照片我都编了号，月日在前，顺序在后。0317 那天，钟楼下，我们四个人。',
      '0318 下雨，我拍了一张空街。没有人，但我想，空着也是一种记录。',
      '我不怎么写字。照片就是我说的话。',
      '如果有一天你们看到这些照片，请记得它们背后的人。——李禾'
    ],
    clues: ['clue_li_name', 'clue_0317_confirm'],
    related: ['person_li', 'photo_01', 'photo_05']
  },

  /* ---------------- 地图 ---------------- */
  map_01: {
    id: 'map_01', type: 'map', no: '01', title: '城区旧图',
    date: '未知', cred: { level: '中', kind: '二次记录' },
    unlock: 'act1_done',
    src: 'assets/images/map_old.jpg',
    desc: '一张手绘的城区旧图。钟楼、老街、渡口被红笔圈了出来。',
    clues: [],
    related: ['location_clocktower', 'location_oldstreet', 'location_ferry']
  },

  /* ---------------- 损坏文件 ---------------- */
  page_032: {
    id: 'page_032', type: 'file', no: '032', title: 'PAGE_032.dat',
    date: '——', cred: { level: '？', kind: '损坏文件' },
    unlock: 'act5',
    damaged: true,
    content: [],   // 由第32页系统动态生成
    clues: [],
    related: ['diary_27', 'diary_31']
  }
};

/* 日记占位：档案记录共 31 篇，多数尚未修复 */
LP.data.diaryPlaceholders = [];
for (let i = 4; i <= 31; i++) {
  const skip = [5, 7, 12, 15, 19, 24, 27, 31];
  if (skip.includes(i)) continue;
  LP.data.diaryPlaceholders.push({
    id: 'diary_' + String(i).padStart(2, '0'),
    no: String(i).padStart(2, '0'),
    title: '日记 · 待修复'
  });
}
/* 照片占位：共 12 张 */
LP.data.photoPlaceholders = [];
for (let i = 3; i <= 12; i++) {
  if (i === 3 || i === 5) continue;
  LP.data.photoPlaceholders.push({
    id: 'photo_' + String(i).padStart(2, '0'),
    no: String(i).padStart(2, '0'),
    title: '照片 · 待修复'
  });
}
