/* 人物数据 —— 四人核心人物组 */
window.LP = window.LP || {};
LP.data = LP.data || {};

LP.data.people = {
  person_linyuan: {
    id: 'person_linyuan', no: 'LY-01',
    name: '林远', keyword: '选择',
    known: true,                    // 档案主，开局即知
    age: '约20岁', role: '档案的主人',
    traits: ['有理想', '会犹豫', '也会害怕', '但仍然向前'],
    question: '如果不知道结果，还要不要向前走？',
    bio: '这本日记的主人。一个普通的年轻人，在一个不普通的年代里，认真记录着自己和朋友们的生活。他也会怀疑，也会想家，也会在深夜里写不出一个字。但他一直在写。',
    related: ['diary_20', 'diary_30', 'diary_18', 'diary_14', 'diary_24', 'diary_26', 'diary_31', 'photo_01', 'letter_01']
  },
  person_zhou: {
    id: 'person_zhou', no: 'ZN-02',
    name: '周宁', keyword: '怀疑',
    known: false,
    age: '？', role: '？',
    traits: ['理性', '敏锐', '总要问一个为什么'],
    question: '我们真的知道自己在做什么吗？',
    bio: '四人中的「思考者」。她不是反对者——恰恰相反，她比谁都认真。她的怀疑，是她对这件事负责的方式。',
    bioLocked: '资料残缺。只有代号「Z」出现在林远的日记里。',
    related: ['diary_30', 'diary_18', 'letter_01', 'letter_02', 'photo_09'],
    identifyBy: 'clue_zhou_name'
  },
  person_chen: {
    id: 'person_chen', no: 'CC-03',
    name: '陈川', keyword: '生活',
    known: false,
    age: '？', role: '？',
    traits: ['幽默', '爱抱怨', '想家', '可靠'],
    question: '等结束了，回家吃一碗放很多葱花的面。',
    bio: '四人中的「生活家」。他抱怨天气、抱怨被子、抱怨没有葱花的面——但每一次该做的事情，他从来没有落下过。他让这段历史保持着普通人的温度。',
    bioLocked: '资料残缺。日记里只有一个爱抱怨的「C」。',
    related: ['diary_10', 'diary_01', 'letter_03', 'photo_09'],
    identifyBy: 'clue_chen_name'
  },
  person_li: {
    id: 'person_li', no: 'LH-04',
    name: '李禾', keyword: '记忆',
    known: false,
    age: '？', role: '？',
    traits: ['安静', '克制', '用相机说话'],
    question: '照片不会替人撒谎，人会。',
    bio: '四人中的「记录者」。她话很少，但每一张照片背后都有她写下的日期、天气和地点。多年以后，正是这些沉默的照片，替所有人守住了真相。',
    bioLocked: '资料残缺。只有一个举着相机的「L」。',
    related: ['diary_11', 'letter_04', 'photo_09', 'photo_10', 'photo_11'],
    identifyBy: 'clue_li_name'
  }
};
