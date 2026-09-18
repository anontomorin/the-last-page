/* 线索 / 证据板数据 */
window.LP = window.LP || {};
LP.data = LP.data || {};

LP.data.clues = {
  clue_317: {
    id: 'clue_317', label: '「3-17」',
    desc: '照片背面折痕里压着的两个数字。是日期？编号？还是别的什么？',
    from: 'photo_01', links: ['diary_03', 'location_clocktower']
  },
  clue_date17: {
    id: 'clue_date17', label: '「今天是17号」',
    desc: '日记的第一篇。17这个数字，似乎还会出现。',
    from: 'diary_01', links: ['clue_317']
  },
  clue_clocktower: {
    id: 'clue_clocktower', label: '旧钟楼',
    desc: '3月17日，四个人在旧钟楼下合了影。',
    from: 'diary_03', links: ['location_clocktower', 'photo_01']
  },
  clue_bell7: {
    id: 'clue_bell7', label: '「等钟响七次」',
    desc: '「等钟响七次以后，我们就该走了。」——钟楼的钟，还能响吗？',
    from: 'diary_12', links: ['location_clocktower']
  },
  clue_717: {
    id: 'clue_717', label: '7:17',
    desc: '钟响七声之后，指针停在了 7:17。七。第七行，会不会有什么？',
    from: 'scene_clocktower', links: ['clue_bell7', 'letter_02']
  },
  clue_zhou_name: {
    id: 'clue_zhou_name', label: '周宁',
    desc: '公告栏第七行的名字。日记里的「Z」，终于有了自己的名字。',
    from: 'scene_clocktower', links: ['person_zhou']
  },
  clue_chen_name: {
    id: 'clue_chen_name', label: '陈川',
    desc: '家书末尾的署名。那个总喊冷、总想家的「C」，叫陈川。',
    from: 'letter_03', links: ['person_chen']
  },
  clue_li_name: {
    id: 'clue_li_name', label: '李禾',
    desc: '照片编号说明的落款。沉默的「L」，是把一切留下来的人。',
    from: 'letter_04', links: ['person_li']
  },
  clue_photoback: {
    id: 'clue_photoback', label: '照片背面的日期',
    desc: '李禾在每张照片中写下日期与天气——这是不会撒谎的记录。',
    from: 'diary_15', links: ['photo_01', 'photo_05', 'person_li']
  },
  clue_linyuan_self: {
    id: 'clue_linyuan_self', label: '「给自己。——远」',
    desc: '单人照的背面，是林远留给自己的三个字。',
    from: 'photo_02', links: ['person_linyuan']
  },
  clue_conflict_sun: {
    id: 'clue_conflict_sun', label: '「天气很好」',
    desc: '林远记下的那一天，天气晴朗。可是，真的是「那一天」吗？',
    from: 'diary_24', links: ['timeline']
  },
  clue_conflict_rain: {
    id: 'clue_conflict_rain', label: '「那天下着雨」',
    desc: '周宁记忆里的离开之日，下着雨。和林远的记录对不上。',
    from: 'letter_02', links: ['timeline', 'diary_24']
  },
  clue_cold_0316: {
    id: 'clue_cold_0316', label: '「倒春寒，冷得很」',
    desc: '陈川三月十六日的家书。冷。——第三个版本的「那一天」？',
    from: 'letter_03', links: ['timeline']
  },
  clue_rain_0318: {
    id: 'clue_rain_0318', label: '0318 · 雨',
    desc: '照片不会撒谎：3月18日，雨，空无一人的街。',
    from: 'photo_05', links: ['timeline']
  },
  clue_clock717_visual: {
    id: 'clue_clock717_visual', label: '停在 7:17 的钟面',
    desc: '照片里的钟，也停在七点十七分。它停了快八十年。',
    from: 'photo_03', links: ['clue_717']
  },
  clue_0317_confirm: {
    id: 'clue_0317_confirm', label: '「0317 那天，钟楼下」',
    desc: '李禾的编号说明，证实了 3-17 的含义。',
    from: 'letter_04', links: ['clue_317', 'photo_01']
  },
  clue_row7: {
    id: 'clue_row7', label: '「记住，第七行」',
    desc: '周宁的信：布告贴在钟楼里，记住第七行。',
    from: 'letter_02', links: ['location_clocktower', 'clue_717']
  },
  clue_page32_hint: {
    id: 'clue_page32_hint', label: '「最后一句，空着」',
    desc: '林远说，最后一句不该由他来说。',
    from: 'diary_27', links: ['page_032']
  },
  clue_page32_cut: {
    id: 'clue_page32_cut', label: '被裁掉的最后一页',
    desc: '日记的最后一页被整齐地裁去了。切口很平——是他自己动的手。',
    from: 'diary_31', links: ['page_032']
  }
};

/* 证据板节点关系（用于连线） */
LP.data.evidenceGraph = [
  { from: 'photo_01', to: 'clue_317' },
  { from: 'clue_317', to: 'diary_03' },
  { from: 'diary_03', to: 'location_clocktower' },
  { from: 'diary_12', to: 'clue_bell7' },
  { from: 'clue_bell7', to: 'clue_717' },
  { from: 'clue_717', to: 'clue_zhou_name' },
  { from: 'clue_zhou_name', to: 'person_zhou' },
  { from: 'letter_03', to: 'clue_chen_name' },
  { from: 'clue_chen_name', to: 'person_chen' },
  { from: 'letter_04', to: 'clue_li_name' },
  { from: 'clue_li_name', to: 'person_li' },
  { from: 'diary_24', to: 'clue_conflict_sun' },
  { from: 'letter_02', to: 'clue_conflict_rain' },
  { from: 'letter_03', to: 'clue_cold_0316' },
  { from: 'photo_05', to: 'clue_rain_0318' },
  { from: 'clue_conflict_sun', to: 'timeline' },
  { from: 'clue_conflict_rain', to: 'timeline' },
  { from: 'clue_rain_0318', to: 'timeline' },
  { from: 'diary_31', to: 'clue_page32_cut' },
  { from: 'clue_page32_cut', to: 'page_032' }
];
