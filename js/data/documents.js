/* ============================================================
   资料数据 —— 剧情与数据分离
   type: diary 日记 | photo 照片 | letter 信件 | map 地图 | file 损坏文件
   cred: 可信度（高/中/低 + 记录性质）

   编号规则（v3）：
   - 日记 01-31 按日期先后编号（月份污损的按日期排序）
   - 照片 01-12 按 IMG 文件编号（拍摄日期）先后编号
   - 文案中的人物使用占位符：{Z}=周宁 {C}=陈川 {L}=李禾
     身份确认前渲染为代号，确认后渲染为真名（LP.inv.sub）
   ============================================================ */
window.LP = window.LP || {};
LP.data = LP.data || {};

LP.data.documents = {

  /* ---------------- 日记（按时间编号 01-31） ---------------- */
  diary_01: {
    id: 'diary_01', type: 'diary', no: '01', title: '日记 · 其一',
    date: '……月02日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act2',
    content: [
      '{C} 说，等这一切结束，他要回家吃他娘做的面，要放很多葱花。',
      '我们都笑了。笑着笑着，大家都没说话。',
      '原来想家是会传染的。'
    ],
    clues: [],
    related: ['person_chen', 'letter_03']
  },

  diary_02: {
    id: 'diary_02', type: 'diary', no: '02', title: '日记 · 其二',
    date: '3月2日', cred: { level: '中', kind: '主观记录' },
    unlock: 'start',
    content: [
      '搬进来的第二天。晚上四个人围着一盏灯，读一本旧书。',
      '书皮掉了，字是好的。',
      '{Z} 读得最慢，每个字都嚼一遍。{C} 听着听着就打瞌睡，被 {L} 用笔杆敲醒。',
      '灯芯噼啪响了一声。谁都没有说困。'
    ],
    clues: [],
    related: ['person_zhou', 'person_chen', 'person_li']
  },

  diary_03: {
    id: 'diary_03', type: 'diary', no: '03', title: '日记 · 其三',
    date: '3月3日', cred: { level: '中', kind: '主观记录' },
    unlock: 'start',
    content: [
      '夜校今晚开课。',
      '来了八个人，都是码头上扛包的。最大的四十岁，最小的才十五。',
      '教他们写自己的名字。有个汉子握着笔，手一直在抖，写出来的「王」字歪歪扭扭。',
      '他不好意思地笑。我说：不抖了，就是好字。'
    ],
    clues: [],
    related: ['diary_15', 'photo_05', 'person_linyuan']
  },

  diary_04: {
    id: 'diary_04', type: 'diary', no: '04', title: '日记 · 其四',
    date: '3月4日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act4',
    content: [
      '天没亮就去渡口看船。',
      '头班船，卯时三刻。晨雾大，三丈外看不见人。',
      '我把水路画了下来，哪里有滩，哪里转弯，都标清楚了。',
      '{Z} 说，有这张图，心里就踏实。'
    ],
    clues: [],
    related: ['location_ferry', 'photo_08']
  },

  diary_05: {
    id: 'diary_05', type: 'diary', no: '05', title: '日记 · 其五',
    date: '3月5日', cred: { level: '中', kind: '主观记录' },
    unlock: 'start',
    content: [
      '钟摆滴答了一夜。{Z} 还在刻蜡纸。',
      '钢针尖细，她的手指被扎破了两处，血珠渗出来，她随手擦在围裙上。',
      '我说歇会儿吧。她头也不抬：字比血重。',
      '《新芽》第二期，明天就能印出来了。'
    ],
    clues: ['clue_xinya'],
    related: ['person_zhou', 'photo_02', 'diary_06']
  },

  diary_06: {
    id: 'diary_06', type: 'diary', no: '06', title: '日记 · 其六',
    date: '3月6日', cred: { level: '中', kind: '主观记录' },
    unlock: 'start',
    content: [
      '楼下全是油墨味。{C} 一边摇油印机一边抱怨，说这辈子都不想再闻这个味儿了。',
      '可我看见他偷偷多印了五十份。',
      '我问他多印的给谁。他说：多一个人识字，就多一颗火种。',
      '说完他自己先不好意思了，转身去洗滚筒。'
    ],
    clues: [],
    related: ['person_chen', 'diary_05', 'photo_02']
  },

  diary_07: {
    id: 'diary_07', type: 'diary', no: '07', title: '日记 · 其七',
    date: '3月7日', cred: { level: '中', kind: '主观记录' },
    unlock: 'start',
    content: [
      '今天才知道，{L} 的相机是当掉她那支派克笔换的。',
      '那是她父亲留给她的唯一物件。',
      '我问她舍得吗。她擦着镜头，过了很久才说：笔是写给自己的，相机是留给大家的。',
      '她就是这样的人。话少，每一句都落在实处。'
    ],
    clues: [],
    related: ['person_li', 'photo_09']
  },

  diary_08: {
    id: 'diary_08', type: 'diary', no: '08', title: '日记 · 其八',
    date: '3月8日', cred: { level: '中', kind: '主观记录' },
    unlock: 'start',
    content: [
      '七点半，天刚亮透，我们把路线走了一遍。',
      '从住处出发，过老街，绕到钟楼后面，再上渡口。{C} 在老街转错了弯，一头扎进面摊。',
      '摊主认识他，笑他：又来？连面都没给你下。',
      '我们都笑了。笑完，{Z} 把路线又画了一遍，说：不能错。一次都不能错。'
    ],
    clues: [],
    related: ['location_oldstreet', 'location_clocktower', 'location_ferry', 'photo_04']
  },

  diary_09: {
    id: 'diary_09', type: 'diary', no: '09', title: '日记 · 其九',
    date: '3月9日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act3',
    content: [
      '{L} 说，她的胶卷只剩最后一卷了。',
      '我问她要留到什么时候拍。她说：留到你们回来的那天。',
      '{C} 在旁边起哄，说回来那天要吃面，面也要拍下来。',
      '一屋子人都笑了。',
      '原来大家都在心里，偷偷盼着那一天。'
    ],
    clues: [],
    related: ['person_li', 'photo_12']
  },

  diary_10: {
    id: 'diary_10', type: 'diary', no: '10', title: '日记 · 其十',
    date: '……月09日', cred: { level: '中', kind: '主观记录' },
    unlock: 'start',
    content: [
      '搬进了新地方。房间不大，窗户朝北，白天也要点灯。',
      '{Z} 说北窗好，北窗安静，适合看书。',
      '{C} 说北窗冷。{L} 没说话，把桌子搬到了窗边，说光线够拍照就行。',
      '四个人，一间屋。也好。'
    ],
    clues: [],
    related: ['person_zhou', 'person_chen', 'person_li']
  },

  diary_11: {
    id: 'diary_11', type: 'diary', no: '11', title: '日记 · 其十一',
    date: '3月10日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act2',
    content: [
      '{L} 把每张照片的背面都写上日期和天气。',
      '我问她为什么。她说：「怕以后的人忘记。也怕以后的人记错。」',
      '她又补了一句：照片不会替人撒谎，人会。',
      '这句话我想了很久。'
    ],
    clues: ['clue_photoback'],
    related: ['person_li', 'photo_09', 'photo_11']
  },

  diary_12: {
    id: 'diary_12', type: 'diary', no: '12', title: '日记 · 其十二',
    date: '3月11日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act2',
    content: [
      '城里气氛不对。盘查的人多了，夜校门口也出现了生面孔。',
      '{Z} 连夜把《新芽》的印版拆下来，藏进了钟楼夹层。',
      '她说，最危险的地方最安静。',
      '钟楼啊钟楼，你替我们守着。'
    ],
    clues: [],
    related: ['location_clocktower', 'person_zhou']
  },

  diary_13: {
    id: 'diary_13', type: 'diary', no: '13', title: '日记 · 其十三',
    date: '3月11日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act2',
    content: [
      '今晚不印报。',
      '四个人比赛写字，谁写得最差，明天谁洗碗。',
      '{C} 写得最丑，丑得理直气壮。{L} 把他的字拍了下来，说这也是记录。',
      '笑声把窗外的风声都盖住了。'
    ],
    clues: [],
    related: ['diary_12', 'photo_02']
  },

  diary_14: {
    id: 'diary_14', type: 'diary', no: '14', title: '日记 · 其十四',
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

  diary_15: {
    id: 'diary_15', type: 'diary', no: '15', title: '日记 · 其十五',
    date: '3月13日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act2',
    content: [
      '夜校最小的学生叫石头，今天学会了写「中国」两个字。',
      '他举着纸满教室跑，说要拿回去给娘看。',
      '临走，他塞给我一颗糖，说：先生，甜。',
      '糖我没吃。我把它包好了。'
    ],
    clues: [],
    related: ['diary_03', 'diary_27', 'photo_06']
  },

  diary_16: {
    id: 'diary_16', type: 'diary', no: '16', title: '日记 · 其十六',
    date: '3月14日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act2',
    content: [
      '半夜醒来，看见 {Z} 坐在窗前。',
      '她问我：值得吗？',
      '我还没想好怎么答，她自己说了：值得。',
      '顿了顿，又说：就是有点想家。',
      '原来最坚定的人，也有想家的时候。'
    ],
    clues: [],
    related: ['person_zhou', 'diary_31']
  },

  diary_17: {
    id: 'diary_17', type: 'diary', no: '17', title: '日记 · 其十七',
    date: '3月15日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act3',
    content: [
      '明天是个要紧日子。今晚我们包了饺子。',
      '面和得硬了，馅是白菜的，没有肉。{C} 说，等回来，他要吃放很多葱花的面，吃到撑。',
      '{Z} 笑他没出息。{L} 没说话，把四双手包饺子的样子拍了下来。',
      '锅里热气升起来的时候，我忽然觉得，这大概就是家的样子。'
    ],
    clues: [],
    related: ['photo_07', 'person_chen']
  },

  diary_18: {
    id: 'diary_18', type: 'diary', no: '18', title: '日记 · 其十八',
    date: '3月15日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act2',
    content: [
      '事情有变。我们本来约定十七号就走，现在要再等等。',
      '{Z} 把联络的办法改了：以钟声为号。',
      '她在布告栏那边等我的时候说——',
      '「等钟响七次以后，我们就该走了。」',
      '七次。我记住了。'
    ],
    clues: ['clue_bell7'],
    related: ['location_clocktower', 'person_zhou']
  },

  diary_19: {
    id: 'diary_19', type: 'diary', no: '19', title: '日记 · 其十九',
    date: '3月16日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act4',
    content: [
      '倒春寒，冷得厉害。',
      '{C} 把他娘絮的棉袄，脱下来披在了石头身上。石头不要，他瞪眼：拿着！',
      '转过身，他自己冻得直搓手。',
      '这个总喊冷的人，最怕别人冷。'
    ],
    clues: [],
    related: ['person_chen', 'letter_03', 'diary_15']
  },

  diary_20: {
    id: 'diary_20', type: 'diary', no: '20', title: '日记 · 其二十',
    date: '……月17日', cred: { level: '中', kind: '主观记录' },
    unlock: 'start',
    content: [
      '今天是17号。',
      '{C} 又在抱怨天气，说被子永远是潮的。{L} 一整天没说话，只是拍照。{Z} 问我：我们真的知道自己在做什么吗？',
      '我不知道怎么回答。',
      '我只知道，有些事现在不做，以后也许就没有机会了。'
    ],
    clues: ['clue_date17'],
    related: ['diary_21', 'photo_09']
  },

  diary_21: {
    id: 'diary_21', type: 'diary', no: '21', title: '日记 · 其二十一',
    date: '3月17日', cred: { level: '中', kind: '主观记录' },
    unlock: 'start',
    content: [
      '三月十七日。',
      '路过旧钟楼的时候，钟慢了四分钟。{C} 说这钟和他一样，总是慢半拍。我们都笑了。',
      '我们在钟下站了很久。{L} 举起相机，说要给我们拍一张。',
      '快门响的时候，谁都没有说话。不知道为什么，我忽然觉得，这一天以后会被记住的。'
    ],
    clues: ['clue_clocktower'],
    related: ['photo_09', 'location_clocktower']
  },

  diary_22: {
    id: 'diary_22', type: 'diary', no: '22', title: '日记 · 其二十二',
    date: '3月17日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act3',
    content: [
      '{C} 收到他娘的回信，薄薄一张纸，他读了三遍。',
      '信末写着「勿念」，他把那两个字用铅笔描了又描。',
      '他抬头冲我笑：我娘说面给我留着。',
      '笑着笑着，他揉了揉眼睛，说是油墨熏的。',
      '今天没有印报。'
    ],
    clues: [],
    related: ['person_chen', 'letter_03']
  },

  diary_23: {
    id: 'diary_23', type: 'diary', no: '23', title: '日记 · 其二十三',
    date: '3月17日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act5',
    content: [
      '夜里看见 {L} 在灯下缝衣服。',
      '凑近了才看清，她是把底片一片一片缝进棉衣的夹层。',
      '她说：东西带不走太多，底片一定要带走。',
      '照片不会替人撒谎。她要把真相，一件一件带出去。'
    ],
    clues: [],
    related: ['person_li', 'diary_11', 'photo_11']
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
    related: ['letter_02', 'letter_03', 'photo_11', 'timeline']
  },

  diary_25: {
    id: 'diary_25', type: 'diary', no: '25', title: '日记 · 其二十五',
    date: '3月18日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act4',
    content: [
      '三月十八日，雨。',
      '夜校的教室空了。黑板上还留着石头写的两个字：中国。',
      '我没有擦。',
      '等我回来，接着教。'
    ],
    clues: [],
    related: ['diary_15', 'photo_11', 'timeline']
  },

  diary_26: {
    id: 'diary_26', type: 'diary', no: '26', title: '日记 · 其二十六',
    date: '3月19日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act5',
    content: [
      '我开始写一份新的东西。不是日记，是单独的一页。',
      '如果有一天有人看到它，我希望他知道——我们并不后悔。',
      '这一页我写了很久。最后一句，我决定空着。',
      '{Z} 问我为什么空着。我说：因为那句话不该由我来说。',
      '她点了点头，好像懂了。'
    ],
    clues: ['clue_page32_hint'],
    related: ['page_032']
  },

  diary_27: {
    id: 'diary_27', type: 'diary', no: '27', title: '日记 · 其二十七',
    date: '3月19日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act5',
    content: [
      '石头送的那颗糖，我一直没舍得吃。',
      '今天拿出来看了看，糖纸都有些软了。',
      '我把它重新包好，夹进了日记里。',
      '甜的东西，要留给甜的日子。'
    ],
    clues: [],
    related: ['diary_15']
  },

  diary_28: {
    id: 'diary_28', type: 'diary', no: '28', title: '日记 · 其二十八',
    date: '3月20日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act5',
    content: [
      '今晚写下了一句话：如果我回不来——',
      '写到这里，我停住了，又把它涂掉了。',
      '没有如果。要做的事，就去做。',
      '{Z} 说过：不走的话，就连知道结果的资格都没有。'
    ],
    clues: [],
    related: ['diary_31', 'diary_29']
  },

  diary_29: {
    id: 'diary_29', type: 'diary', no: '29', title: '日记 · 其二十九',
    date: '3月20日', cred: { level: '中', kind: '主观记录' },
    unlock: 'act5',
    content: [
      '明天就是二十一号了。',
      '这本日记，就快写完了。',
      '最后一页写什么，我还没有想好。',
      '也许，该留一点给读它的人。'
    ],
    clues: [],
    related: ['diary_30', 'page_032']
  },

  diary_30: {
    id: 'diary_30', type: 'diary', no: '30', title: '日记 · 其三十（最后一篇）',
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

  diary_31: {
    id: 'diary_31', type: 'diary', no: '31', title: '日记 · 其三十一',
    date: '……月22日', cred: { level: '中', kind: '主观记录' },
    unlock: 'start',
    content: [
      '{Z} 今天又问那个问题：如果不知道结果，还要不要向前走？',
      '我说我不知道。',
      '她说她想了一晚上，觉得答案应该是「要」。理由是：不走的话，就连知道结果的资格都没有。',
      '她总是想得比我深。'
    ],
    clues: [],
    related: ['person_zhou']
  },

  /* ---------------- 照片（按拍摄日期编号 01-12） ---------------- */
  photo_01: {
    id: 'photo_01', type: 'photo', no: '01', title: '旧照片 · 青年单人像',
    date: '未知', cred: { level: '高', kind: '视觉记录' },
    unlock: 'start',
    src: 'assets/images/photo_linyuan.jpg',
    meta: { file: 'IMG_0302.jpg', size: '640 KB', scan: '600dpi' },
    desc: '一个年轻人站在窗前，手里捏着一支笔。照片有些虚，像是他自己按的快门。',
    back: { text: '「给自己。——远」', crease: false },
    clues: ['clue_linyuan_self'],
    related: ['person_linyuan']
  },

  photo_02: {
    id: 'photo_02', type: 'photo', no: '02', title: '旧照片 · 油印机',
    date: '未知', cred: { level: '高', kind: '视觉记录' },
    unlock: 'act2',
    src: 'assets/images/photo_press.jpg',
    meta: { file: 'IMG_0305.jpg', size: '592 KB', scan: '600dpi' },
    desc: '一台手摇油印机，滚筒上还沾着油墨。画面角落有一双手，指腹全是黑的。',
    back: { text: '「0305 阴 · 第二期开印」', crease: false },
    clues: ['clue_xinya'],
    related: ['diary_05', 'diary_06']
  },

  photo_03: {
    id: 'photo_03', type: 'photo', no: '03', title: '旧照片 · 《新芽》',
    date: '未知', cred: { level: '高', kind: '视觉记录' },
    unlock: 'act4',
    src: 'assets/images/photo_xinya.jpg',
    meta: { file: 'IMG_0306.jpg', size: '578 KB', scan: '600dpi' },
    desc: '一张油印小报的特写。油墨不匀，字迹深浅不一，但报头两个字刻得极认真。',
    back: { text: '「0306 阴 · 印出来了」', crease: false },
    clues: [],
    related: ['diary_05', 'diary_06']
  },

  photo_04: {
    id: 'photo_04', type: 'photo', no: '04', title: '旧照片 · 面摊',
    date: '未知', cred: { level: '高', kind: '视觉记录' },
    unlock: 'act3',
    src: 'assets/images/photo_stall.jpg',
    meta: { file: 'IMG_0309.jpg', size: '614 KB', scan: '600dpi' },
    desc: '老街转角的面摊。一个年轻人背对镜头坐着，面前的碗见了底。',
    back: { text: '「0309 晴 · 老街口，他总嫌葱花少」', crease: false },
    clues: [],
    related: ['person_chen', 'location_oldstreet', 'diary_08']
  },

  photo_05: {
    id: 'photo_05', type: 'photo', no: '05', title: '旧照片 · 夜校合影',
    date: '未知', cred: { level: '高', kind: '视觉记录' },
    unlock: 'act2',
    src: 'assets/images/photo_school.jpg',
    meta: { file: 'IMG_0310.jpg', size: '688 KB', scan: '600dpi' },
    desc: '八个人挤在夜校门口，每人手里举着一张纸，纸上是各自刚学会写的名字。',
    back: { text: '「0310 晴 · 他们都会写自己的名字了」', crease: false },
    clues: ['clue_nightschool'],
    related: ['diary_03', 'diary_15', 'person_linyuan']
  },

  photo_06: {
    id: 'photo_06', type: 'photo', no: '06', title: '旧照片 · 小先生们',
    date: '未知', cred: { level: '高', kind: '视觉记录' },
    unlock: 'act2',
    src: 'assets/images/photo_kids.jpg',
    meta: { file: 'IMG_0312.jpg', size: '640 KB', scan: '600dpi' },
    desc: '夜校的孩子们挤在黑板前。黑板上一笔一划，写着两个大字。',
    back: { text: '「0312 晴 · 小先生们」', crease: false },
    clues: [],
    related: ['diary_15', 'photo_05']
  },

  photo_07: {
    id: 'photo_07', type: 'photo', no: '07', title: '旧照片 · 饺子',
    date: '未知', cred: { level: '高', kind: '视觉记录' },
    unlock: 'act3',
    src: 'assets/images/photo_dumpling.jpg',
    meta: { file: 'IMG_0315.jpg', size: '602 KB', scan: '600dpi' },
    desc: '一张方桌，四双手，一排歪歪扭扭的白菜饺子。照片边缘有一点虚，像是谁笑场了。',
    back: { text: '「0315 晴 · 出发前夜」', crease: false },
    clues: [],
    related: ['diary_17']
  },

  photo_08: {
    id: 'photo_08', type: 'photo', no: '08', title: '旧照片 · 渡船',
    date: '未知', cred: { level: '高', kind: '视觉记录' },
    unlock: 'act3',
    src: 'assets/images/photo_ferry.jpg',
    meta: { file: 'IMG_0316.jpg', size: '655 KB', scan: '600dpi' },
    desc: '晨雾里的一条渡船。船头挂着一盏小马灯，光很弱，但没有灭。',
    back: { text: '「0316 阴 · 晨雾，船来了」', crease: false },
    clues: ['clue_ferry_boat'],
    related: ['location_ferry', 'diary_04']
  },

  photo_09: {
    id: 'photo_09', type: 'photo', no: '09', title: '旧照片 · 四人合影',
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
    clues: [],
    related: ['diary_21', 'location_clocktower']
  },

  photo_10: {
    id: 'photo_10', type: 'photo', no: '10', title: '旧照片 · 钟楼',
    date: '未知', cred: { level: '高', kind: '视觉记录' },
    unlock: 'act1_done',
    src: 'assets/images/photo_clocktower.jpg',
    meta: { file: 'IMG_0318.jpg', size: '955 KB', scan: '600dpi' },
    desc: '一座旧钟楼。砖墙上的钟面停在七点十七分。',
    back: { text: '「0318 雨 · 钟停了」', crease: false },
    clues: ['clue_clock717_visual'],
    related: ['location_clocktower']
  },

  photo_11: {
    id: 'photo_11', type: 'photo', no: '11', title: '旧照片 · 雨中的街',
    date: '未知', cred: { level: '高', kind: '视觉记录' },
    unlock: 'act4',
    src: 'assets/images/photo_rain_street.jpg',
    meta: { file: 'IMG_0319.jpg', size: '701 KB', scan: '600dpi' },
    desc: '一条空荡荡的老街，下着雨。青石板路反着光，像是有人刚刚离开。',
    back: { text: '「0318 雨 · 送他们走」', crease: false },
    clues: ['clue_rain_0318'],
    related: ['diary_24', 'letter_02', 'timeline']
  },

  photo_12: {
    id: 'photo_12', type: 'photo', no: '12', title: '旧照片 · 开着的门',
    date: '未知', cred: { level: '高', kind: '视觉记录' },
    unlock: 'photosort',
    src: 'assets/images/photo_door.jpg',
    meta: { file: 'IMG_0321.jpg', size: '610 KB', scan: '600dpi' },
    desc: '一扇开着的木门。屋里没有人，桌上的墨还没有干。她说过，最后一卷胶卷要留到回来那天——这一张，是那卷的最后一张。',
    back: { text: '「0321 阴 · 门开着」', crease: false },
    clues: ['clue_open_door'],
    related: ['diary_09', 'diary_30', 'page_032']
  },

  /* ---------------- 信件 ---------------- */
  letter_01: {
    id: 'letter_01', type: 'letter', no: '01', title: '信件 · 致 {Z}',
    date: '……月20日', cred: { level: '中', kind: '主观记录' },
    unlock: 'start',
    content: [
      '{Z}：',
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
    related: ['person_chen', 'diary_01', 'timeline']
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
    related: ['person_li', 'photo_09', 'photo_11']
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
    related: ['diary_26', 'diary_30']
  }
};
