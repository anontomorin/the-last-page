/* 时间线数据 —— 第四幕「那一天”的交叉验证 */
window.LP = window.LP || {};
LP.data = LP.data || {};

/* 三张待排序的证据卡 */
LP.data.timelineCards = [
  {
    id: 'tl_letter03', refId: 'letter_03',
    title: '陈川的家书', kind: 'letter',
    weather: '冷', date: '3月16日',
    text: '「这几天倒春寒，冷得很……」',
    cred: '中 · 主观记录'
  },
  {
    id: 'tl_photo01', refId: 'photo_09',
    title: '钟楼下的合影', kind: 'photo',
    weather: '晴', date: '3月17日',
    text: '照片里的影子很短——是个大晴天。',
    cred: '高 · 视觉记录'
  },
  {
    id: 'tl_diary24', refId: 'diary_24',
    title: '林远的日记', kind: 'diary',
    weather: '晴', date: '3月17日',
    text: '「今天是个好日子。天气很好。」',
    cred: '低 · 日期污损'
  },
  {
    id: 'tl_photo05', refId: 'photo_11',
    title: '雨中的空街', kind: 'photo',
    weather: '雨', date: '3月18日',
    text: '「0318 雨 · 送他们走」',
    cred: '高 · 视觉记录'
  },
  {
    id: 'tl_letter02', refId: 'letter_02',
    title: '周宁的信', kind: 'letter',
    weather: '雨', date: '3月18日',
    text: '「我记得走的那天下着雨，冷得很。」',
    cred: '中 · 主观记录'
  },
  {
    id: 'tl_photo09', refId: 'photo_08',
    title: '晨雾中的渡船', kind: 'photo',
    weather: '阴', date: '3月16日',
    text: '「0316 阴 · 晨雾，船来了」',
    cred: '高 · 视觉记录'
  },
  {
    id: 'tl_diary25', refId: 'diary_25',
    title: '林远的日记 · 廿五', kind: 'diary',
    weather: '雨', date: '3月18日',
    text: '「教室空了。黑板上还留着两个字。」',
    cred: '中 · 主观记录'
  }
];

/* 正确的三天 */
LP.data.timelineDays = [
  { day: '3月16日', weather: '冷 · 倒春寒', accept: ['tl_letter03', 'tl_photo09'],
    fact: '陈川在住处写下家书；李禾在晨雾里看清了头班船。' },
  { day: '3月17日', weather: '晴', accept: ['tl_photo01', 'tl_diary24'],
    fact: '四人在钟楼前合影；当晚把东西送到了。' },
  { day: '3月18日', weather: '雨', accept: ['tl_photo05', 'tl_letter02', 'tl_diary25'],
    fact: '雨中，他们离开。夜校的教室空了下来。' }
];
