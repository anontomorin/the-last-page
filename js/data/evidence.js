/* 线索 / 证据板数据 */
window.LP = window.LP || {};
LP.data = LP.data || {};

LP.data.clues = {
  clue_317: {
    id: 'clue_317', label: '「3-17」',
    desc: '照片背面折痕里压着的两个数字。是日期？编号？还是别的什么？',
    from: 'photo_09', links: ['diary_21', 'location_clocktower']
  },
  clue_date17: {
    id: 'clue_date17', label: '「今天是17号」',
    desc: '日记的第二十篇。17这个数字，似乎还会出现。',
    from: 'diary_20', links: ['clue_317']
  },
  clue_clocktower: {
    id: 'clue_clocktower', label: '旧钟楼',
    desc: '3月17日，四个人在旧钟楼下合了影。',
    from: 'diary_21', links: ['location_clocktower', 'photo_09']
  },
  clue_bell7: {
    id: 'clue_bell7', label: '「等钟响七次」',
    desc: '「等钟响七次以后，我们就该走了。」——钟楼的钟，还能响吗？',
    from: 'diary_18', links: ['location_clocktower']
  },
  clue_717: {
    id: 'clue_717', label: '7:17',
    desc: '钟面早已停在 7:17。七声是约定信号；七与钟面上的 7:17 都指向公告栏第七行。',
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
    desc: '部分照片背题记录了日期与天气；合影背面留白，日期藏在折痕里，天气要从画面判断。',
    from: 'diary_11', links: ['photo_09', 'photo_11', 'person_li']
  },
  clue_linyuan_self: {
    id: 'clue_linyuan_self', label: '「给自己。——远」',
    desc: '单人照的背面，是林远留给自己的三个字。',
    from: 'photo_01', links: ['person_linyuan']
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
    desc: '空街照片背面标着 0318 和「雨」，为离开之日提供了一条可核对的记录。',
    from: 'photo_11', links: ['timeline']
  },
  clue_clock717_visual: {
    id: 'clue_clock717_visual', label: '停在 7:17 的钟面',
    desc: '照片里的钟，也停在七点十七分。它停了快八十年。',
    from: 'photo_10', links: ['clue_717']
  },
  clue_0317_confirm: {
    id: 'clue_0317_confirm', label: '「0317 那天，钟楼下」',
    desc: '李禾的编号说明，证实了 3-17 的含义。',
    from: 'letter_04', links: ['clue_317', 'photo_09']
  },
  clue_row7: {
    id: 'clue_row7', label: '「记住，第七行」',
    desc: '周宁的信：布告贴在钟楼里，记住第七行。',
    from: 'letter_02', links: ['location_clocktower', 'clue_717']
  },
  clue_page32_hint: {
    id: 'clue_page32_hint', label: '「最后一句，空着」',
    desc: '林远说，最后一句不该由他来说。',
    from: 'diary_26', links: ['page_032']
  },
  clue_page32_cut: {
    id: 'clue_page32_cut', label: '被裁掉的最后一页',
    desc: '日记的最后一页被整齐地裁去了。切口很平——是他自己动的手。',
    from: 'diary_31', links: ['page_032']
  },
  /* ---------------- v2 新增线索 ---------------- */
  clue_xinya: {
    id: 'clue_xinya', label: '《新芽》',
    desc: '一份手刻蜡纸、油印出来的小报。周宁说：字比血重。',
    from: 'diary_05', links: ['photo_02', 'photo_03', 'person_zhou']
  },
  clue_nightschool: {
    id: 'clue_nightschool', label: '夜校',
    desc: '码头上的夜校。多一个人识字，就多一颗火种。',
    from: 'photo_05', links: ['diary_03', 'diary_15', 'person_linyuan']
  },
  clue_ferry_boat: {
    id: 'clue_ferry_boat', label: '晨雾中的渡船',
    desc: '0316，阴。临行之前，她又去渡口看了一次船。',
    from: 'photo_08', links: ['location_ferry', 'diary_04']
  },
  clue_photosort: {
    id: 'clue_photosort', label: '她按时间记住了一切',
    desc: '编号即日期，月日在前，顺序在后。李禾用编号替所有人守住了时间的顺序。',
    from: 'letter_04', links: ['photo_12', 'clue_photoback']
  },
  clue_ferry_time: {
    id: 'clue_ferry_time', label: '「卯时三刻」',
    desc: '船班木牌上被反复描深的头班船。他们走的时候，天还没亮。',
    from: 'scene_ferry', links: ['location_ferry', 'diary_04']
  },
  clue_open_door: {
    id: 'clue_open_door', label: '开着的门',
    desc: '最后一张照片：一扇开着的门。门开着，人未归——或者，门是为后来的人留的。',
    from: 'photo_12', links: ['page_032']
  }
};

/* 证据板节点关系（用于连线） */
LP.data.evidenceGraph = [
  { from: 'photo_09', to: 'clue_317' },
  { from: 'clue_317', to: 'diary_21' },
  { from: 'diary_21', to: 'location_clocktower' },
  { from: 'diary_18', to: 'clue_bell7' },
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
  { from: 'photo_11', to: 'clue_rain_0318' },
  { from: 'clue_conflict_sun', to: 'timeline' },
  { from: 'clue_conflict_rain', to: 'timeline' },
  { from: 'clue_rain_0318', to: 'timeline' },
  { from: 'diary_31', to: 'clue_page32_cut' },
  { from: 'clue_page32_cut', to: 'page_032' },
  /* v2 */
  { from: 'diary_05', to: 'clue_xinya' },
  { from: 'clue_xinya', to: 'photo_03' },
  { from: 'photo_05', to: 'clue_nightschool' },
  { from: 'clue_nightschool', to: 'diary_15' },
  { from: 'photo_08', to: 'clue_ferry_boat' },
  { from: 'clue_ferry_boat', to: 'location_ferry' },
  { from: 'letter_04', to: 'clue_photosort' },
  { from: 'clue_photosort', to: 'photo_12' },
  { from: 'diary_04', to: 'clue_ferry_time' },
  { from: 'clue_ferry_time', to: 'location_ferry' },
  { from: 'photo_12', to: 'clue_open_door' }
];

/* ============================================================
   证据板 · 主动推理规则（P0）
   ------------------------------------------------------------
   玩家不再只是拖节点——而是要「亲自连出关系」：
     · 选中两个节点，选定关系类型（支持 / 矛盾 / 补充 / 同一），
       可再写一句理由、并挂上作为依据的原件。
     · 系统按下面的规则判定：连对了 → 记入 state.evidenceLinks；
       连错了 → 给出「哪一类关系对不上」的反馈，不计入。
     · 主线推进要求玩家至少建立 requiredFor 里指定的若干条正确关系。
   ------------------------------------------------------------ */
LP.data.reasonTypes = [
  { key: 'support',   label: '支持',   desc: '一者为另一者提供旁证' },
  { key: 'conflict',  label: '矛盾',   desc: '两者说法互相冲突，需查明原因' },
  { key: 'supplement',label: '补充',   desc: '两者互相补全同一件事的拼图' },
  { key: 'same',      label: '同一',   desc: '两者指向同一个人 / 同一天 / 同一物' }
];

/* 正确关系表：from<to 归一化后比对。
   每条 = 玩家能「自己推出来」的关键结论，且都有原件支撑。 */
LP.data.reasonRules = [
  /* —— 身份链：线索名字 → 人物（第三幕核心） —— */
  { from: 'clue_zhou_name', to: 'person_zhou', types: ['same'],
    why: '「周宁」就是日记里那个总在提问的「Z」。名字与人对上了。',
    src: ['letter_02', 'location_clocktower'], key: 'id_zhou' },
  { from: 'clue_chen_name', to: 'person_chen', types: ['same'],
    why: '家书末尾署名「陈川」——那个总喊冷的「C」有了名字。',
    src: ['letter_03'], key: 'id_chen' },
  { from: 'clue_li_name', to: 'person_li', types: ['same'],
    why: '照片编号说明的落款是「李禾」——沉默的「L」是把一切留下来的人。',
    src: ['letter_04', 'photo_11'], key: 'id_li' },

  /* —— 时间冲突链：三种天气说法互相矛盾（第四幕动机） —— */
  { from: 'clue_conflict_sun', to: 'clue_conflict_rain', types: ['conflict'],
    why: '林远写「天气很好」，周宁记得「下着雨」——同一天不可能既晴又雨。',
    src: ['diary_24', 'letter_02'], key: 'cf_sun_rain' },
  { from: 'clue_cold_0316', to: 'clue_rain_0318', types: ['conflict'],
    why: '三月十六「倒春寒」与三月十八「雨」，说明这根本不是同一天。',
    src: ['letter_03', 'photo_11'], key: 'cf_cold_rain' },

  /* —— 折痕链：把第一幕的发现与照片本体接起来 —— */
  { from: 'photo_09', to: 'clue_317', types: ['support'],
    why: '折痕压在合影背面——「3-17」正是从这张照片上读出来的。',
    src: ['photo_09'], key: 'crease_src' },
  { from: 'clue_0317_confirm', to: 'clue_317', types: ['support'],
    why: '李禾的编号说明证实了「3-17」就是三月十七日。',
    src: ['letter_04'], key: 'crease_proof' },

  /* —— 缺失页链：最后一页被裁去 —— */
  { from: 'diary_31', to: 'clue_page32_cut', types: ['support'],
    why: '切口很平，是作者自己动的手——最后一页被整齐裁去。',
    src: ['diary_31'], key: 'page_cut' },
  { from: 'clue_page32_cut', to: 'page_032', types: ['same'],
    why: '被裁掉的那一页，就是缺失的 PAGE_032。',
    src: ['diary_31', 'page_032'], key: 'page_is_032' }
];

/* ------------------------------------------------------------
   补齐：板上「可关联」的每一对，都给出可判定的关系类型。
   ------------------------------------------------------------
   静态关联图（evidenceGraph）与线索自带的 links 里，原本只有个位数
   的关系能被玩家确认，其余的虚线看得见却连不上。这里把每一条真实
   关联都补全，玩家选中两个节点、选对类型，即可亲手把它确立下来。
   ------------------------------------------------------------ */
(function () {
  const R = (from, to, types, why, key, src) => ({ from, to, types, why, key, src });
  LP.data.reasonRules.push(
    /* —— 合影 / 折痕 / 钟楼 —— */
    R('photo_09', 'clue_317', ['support', 'supplement'],
      '折痕压在合影背面——「3-17」正是从这张照片上读出来的。', 'link_crease_src', ['photo_09']),
    R('clue_317', 'diary_21', ['support', 'supplement'],
      '「3-17」在日记其二十一中落了地——那天四人在钟楼下合了影。', 'link_317_diary21', ['diary_21']),
    R('diary_21', 'location_clocktower', ['support', 'supplement'],
      '日记其二十一写明：3月17日，四人在旧钟楼下合了影。', 'link_diary21_clocktower', ['diary_21']),
    R('diary_18', 'clue_bell7', ['support', 'supplement'],
      '日记其十八：「等钟响七次以后，我们就该走了。」', 'link_diary18_bell7', ['diary_18']),
    R('clue_bell7', 'clue_717', ['support', 'supplement'],
      '约定的「七声」，与停在 7:17 的钟面——两个「七」互相印证。', 'link_bell7_717', ['diary_18', 'photo_10']),
    R('clue_717', 'clue_zhou_name', ['support', 'supplement'],
      '钟面 7:17 指向公告栏第七行；第七行上写着一个名字。', 'link_717_zhouname', ['letter_02', 'location_clocktower']),
    R('clue_clocktower', 'location_clocktower', ['same', 'support'],
      '「3月17日，四人在旧钟楼下合了影」——说的就是钟楼。', 'link_clocktower_loc', ['diary_21']),
    R('clue_clocktower', 'photo_09', ['support', 'supplement'],
      '那张合影，正是在旧钟楼下拍的。', 'link_clocktower_photo09', ['diary_21', 'photo_09']),
    R('clue_clock717_visual', 'clue_717', ['support', 'supplement'],
      '照片里的钟也停在 7:17——与「第七行」的说法互相印证。', 'link_visual717', ['photo_10']),
    R('clue_717', 'letter_02', ['support', 'supplement'],
      '周宁在信里说「布告贴在钟楼里，记住第七行」——7:17 与第七行是同一个提示。', 'link_717_letter02', ['letter_02']),
    R('clue_row7', 'clue_717', ['support', 'supplement'],
      '「记住，第七行」——第七行与钟面 7:17 指向同一处。', 'link_row7_717', ['letter_02']),
    R('clue_row7', 'location_clocktower', ['support', 'supplement'],
      '「布告贴在钟楼里」——这条提示把人指向钟楼。', 'link_row7_clocktower', ['letter_02']),
    R('clue_date17', 'clue_317', ['support', 'supplement'],
      '日记第二十篇写「今天是17号」——17 这个数字还会再出现。', 'link_date17_317', ['diary_20']),

    /* —— 身份：线索里的名字 ↔ 人物 —— */
    R('letter_03', 'clue_chen_name', ['support', 'supplement'],
      '《家书》末尾的署名——那个总喊冷的「C」，叫陈川。', 'link_letter03_chenname', ['letter_03']),
    R('letter_04', 'clue_li_name', ['support', 'supplement'],
      '《照片编号说明》的落款——沉默的「L」，叫李禾。', 'link_letter04_liname', ['letter_04']),
    R('clue_linyuan_self', 'person_linyuan', ['same', 'support'],
      '单人照背面是「给自己。——远」——写这行字的人，是林远。', 'link_self_linyuan', ['photo_01']),

    /* —— 时间冲突：三种「那一天」 —— */
    R('diary_24', 'clue_conflict_sun', ['support', 'supplement'],
      '日记其二十四：「天气很好」——可它记的到底是哪一天？', 'link_diary24_sun', ['diary_24']),
    R('letter_02', 'clue_conflict_rain', ['support', 'supplement'],
      '门缝信上写着：走的那天，下着雨。', 'link_letter02_rain', ['letter_02']),
    R('letter_03', 'clue_cold_0316', ['support', 'supplement'],
      '家书写于三月十六——「倒春寒，冷得很」。', 'link_letter03_cold', ['letter_03']),
    R('photo_11', 'clue_rain_0318', ['support', 'supplement'],
      '雨中空街的照片，背面标着 0318 与「雨」。', 'link_photo11_rain', ['photo_11']),
    R('clue_conflict_sun', 'timeline', ['support', 'supplement'],
      '「天气很好」这一条，被放进时间线，等交叉验证。', 'link_sun_timeline', ['diary_24']),
    R('clue_conflict_rain', 'timeline', ['support', 'supplement'],
      '「那天下着雨」这一条，被放进时间线，等交叉验证。', 'link_rain_timeline', ['letter_02']),
    R('clue_rain_0318', 'timeline', ['support', 'supplement'],
      '「0318 · 雨」是一条可核对的记录——交给时间线去对。', 'link_0318_timeline', ['photo_11']),

    /* —— 编号 / 顺序 —— */
    R('clue_0317_confirm', 'photo_09', ['support', 'supplement'],
      '编号说明写的是「0317 那天，钟楼下」——正对上那张合影。', 'link_0317confirm_photo09', ['letter_04']),
    R('letter_04', 'clue_photosort', ['support', 'supplement'],
      '《照片编号说明》：编号即日期，月日在前、顺序在后。', 'link_letter04_photosort', ['letter_04']),
    R('clue_photosort', 'photo_12', ['support', 'supplement'],
      '按编号排序，最后一张是 12 号——一扇开着的门。', 'link_photosort_photo12', ['letter_04']),
    R('clue_photoback', 'clue_photosort', ['support', 'supplement'],
      '照片背面记着日期与天气——「编号即日期」这句话正由此而来。', 'link_photoback_sort', ['diary_11', 'letter_04']),
    R('clue_photoback', 'photo_11', ['support', 'supplement'],
      '雨街照片背面的落款，就是「背面有记录」的一个实例。', 'link_photoback_photo11', ['photo_11']),

    /* —— 缺失页与最后一页 —— */
    R('clue_page32_hint', 'page_032', ['support', 'supplement'],
      '「最后一句，空着」——林远说，最后一句不该由他来说。', 'link_hint_032', ['diary_26']),
    R('photo_12', 'clue_open_door', ['support', 'supplement'],
      '最后一张照片：一扇开着的门。人未归，还是门为后来的人留着？', 'link_photo12_opendoor', ['photo_12']),
    R('clue_open_door', 'page_032', ['support', 'supplement'],
      '空着的最后一句，也许就等在那扇开着的门后面。', 'link_opendoor_032', ['photo_12', 'page_032']),

    /* —— 《新芽》与夜校 —— */
    R('diary_05', 'clue_xinya', ['support', 'supplement'],
      '日记其五：周宁刻蜡纸印《新芽》，说「字比血重」。', 'link_diary05_xinya', ['diary_05']),
    R('clue_xinya', 'photo_03', ['support', 'supplement'],
      '照片《新芽》——一份手刻油印的小报。', 'link_xinya_photo03', ['photo_03']),
    R('clue_xinya', 'photo_02', ['support', 'supplement'],
      '油印机旁的那张照片，印的就是《新芽》。', 'link_xinya_photo02', ['photo_02']),
    R('clue_xinya', 'person_zhou', ['support', 'supplement'],
      '刻蜡纸、手上扎出血的人是周宁——她说，字比血重。', 'link_xinya_zhou', ['diary_05']),
    R('photo_05', 'clue_nightschool', ['support', 'supplement'],
      '夜校合影——码头上的识字班。', 'link_photo05_nightschool', ['photo_05']),
    R('clue_nightschool', 'diary_15', ['support', 'supplement'],
      '日记其十五：夜校最小的学生石头，今天学会了写「中国」。', 'link_nightschool_diary15', ['diary_15']),
    R('clue_nightschool', 'diary_03', ['support', 'supplement'],
      '日记其三：夜校开课，来了八个扛包的。', 'link_nightschool_diary03', ['diary_03']),
    R('clue_nightschool', 'person_linyuan', ['support', 'supplement'],
      '在夜校里教他们写字的人，是林远。', 'link_nightschool_linyuan', ['diary_03', 'diary_15']),

    /* —— 渡口 —— */
    R('photo_08', 'clue_ferry_boat', ['support', 'supplement'],
      '渡船照片：0316 阴，晨雾中的船。', 'link_photo08_ferryboat', ['photo_08']),
    R('clue_ferry_boat', 'location_ferry', ['support', 'supplement'],
      '船在渡口——这条线索指向那个地点。', 'link_ferryboat_loc', ['photo_08']),
    R('clue_ferry_boat', 'diary_04', ['support', 'supplement'],
      '日记其四：天没亮就去渡口看船，晨雾大，三丈外看不见人。', 'link_ferryboat_diary04', ['diary_04']),
    R('diary_04', 'clue_ferry_time', ['support', 'supplement'],
      '日记其四：头班船，卯时三刻。', 'link_diary04_ferrytime', ['diary_04']),
    R('clue_ferry_time', 'location_ferry', ['support', 'supplement'],
      '被反复描深的那班船，木牌就立在渡口。', 'link_ferrytime_loc', ['diary_04'])
  );
})();

/* 主线解锁要求：第三幕需要玩家亲手建立下面三条身份关系 */
LP.data.reasonRequired = {
  act3: ['id_zhou', 'id_chen', 'id_li']
};
