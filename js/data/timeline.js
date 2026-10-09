/* 时间线数据 —— 第四幕「那一天」的交叉验证
   ------------------------------------------------------------
   设计要点（v4 · 信息泄露修复）：
   · 卡面只给出「谁写的 / 写了什么 / 可信度」，绝不直接标日期与天色
   · 日期来源被移出卡面正文：照片背题、折痕、编号说明一律写在「原件」里，
     玩家必须从时间线卡跳去原件（或听搭档描述）才能读到
     —— 这正是 P0「不打开原件就无法直接得到全部日期答案」的落点
   · 玩家必须先按「天色」把资料分成三堆，再给每一堆定日子
   · 天气也要分清直接记载与画面推断（合影短影子）
   · refId 指向原件 id，卡面据此提供「查看原件」入口（双向导航的另一半）
   ------------------------------------------------------------ */
window.LP = window.LP || {};
LP.data = LP.data || {};

/* 三选一的天色 */
LP.data.timelineWeather = [
  { key: 'cold', label: '阴冷' },
  { key: 'sun',  label: '晴' },
  { key: 'rain', label: '雨' }
];

/* 七张待排序的证据卡
   —— text 只保留「纸面上能看到的那句话」，日期一律退回原件 */
LP.data.timelineCards = [
  {
    id: 'tl_letter03', refId: 'letter_03',
    title: '陈川的家书', kind: 'letter',
    weather: 'cold',
    text: '「这几天倒春寒，冷得很，我把你絮的那件棉袄又翻出来穿上了。」',
    cred: '中 · 主观记录'
  },
  {
    id: 'tl_photo09', refId: 'photo_08',
    title: '晨雾中的渡船', kind: 'photo',
    weather: 'cold',
    text: '一张渡船的照片。背面写着一行小字——写了什么，得把照片翻过来看。（原件在记录者卷）',
    cred: '高 · 视觉记录'
  },
  {
    id: 'tl_photo01', refId: 'photo_09',
    title: '钟楼下的合影', kind: 'photo',
    weather: 'sun',
    text: '四个人站在钟下。地上的影子很短，支持晴天判断；合影背面没有日期题字。',
    cred: '高 · 视觉记录'
  },
  {
    id: 'tl_diary24', refId: 'diary_24',
    title: '林远的日记 · 廿四', kind: 'diary',
    weather: 'sun',
    text: '「今天是个好日子。天气很好。」（此页日期被水渍浸染）',
    cred: '低 · 日期污损'
  },
  {
    id: 'tl_photo05', refId: 'photo_11',
    title: '雨中的空街', kind: 'photo',
    weather: 'rain',
    text: '一条雨中的空街。背面有一行题字与日期——需要翻面才能读到。（原件在记录者卷）',
    cred: '高 · 视觉记录'
  },
  {
    id: 'tl_letter02', refId: 'letter_02',
    title: '周宁的信', kind: 'letter',
    weather: 'rain',
    text: '「我记得走的那天下着雨，冷得很。你在本子上却写『天气很好』。」',
    cred: '中 · 主观记录'
  },
  {
    id: 'tl_diary25', refId: 'diary_25',
    title: '林远的日记 · 廿五', kind: 'diary',
    weather: 'rain',
    text: '「夜校的教室空了。黑板上还留着两个字。门口积着一小滩水——进来的人，鞋都是湿的。」',
    cred: '中 · 主观记录'
  }
];

/* 正确的三天（num 为校验用日期，不直接展示） */
LP.data.timelineDays = [
  { day: '3月16日', num: '16', weather: 'cold', accept: ['tl_letter03', 'tl_photo09'],
    fact: '倒春寒。陈川在住处写下家书；李禾在晨雾里看清了头班船。' },
  { day: '3月17日', num: '17', weather: 'sun', accept: ['tl_photo01', 'tl_diary24'],
    fact: '大晴。四人在钟楼前合影；当晚把东西送到了。原本约好这天走。' },
  { day: '3月18日', num: '18', weather: 'rain', accept: ['tl_photo05', 'tl_letter02', 'tl_diary25'],
    fact: '雨。他们从这里离开。夜校的教室空了下来。' }
];

/* 天色 ↔ 中文标签 */
LP.data.weatherLabel = k => {
  const w = LP.data.timelineWeather.find(x => x.key === k);
  return w ? w.label : '';
};
