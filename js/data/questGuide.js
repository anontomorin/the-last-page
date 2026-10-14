/* ============================================================
   主线任务文案与目标定义 —— 「当前调查」引导卡的数据层
   ------------------------------------------------------------
   · 每个任务绑定一个真实幕（act）。
   · P2 解耦：步骤完成条件写成「纯谓词」done(state, data)，
     不再闭包读取 LP.state —— 这是 ui2 视图层能做到
     viewModel/render 双双纯粹的前提（FRONTEND_REBUILD_PLAN §5.3）。
   · action 是「前往目标」按钮的行为描述：doc / scene / tab / duo /
     ending，由 questGuideSystem 翻译成真实导航。
   · 文案只指引行动，不泄露日期、身份或谜题答案。
   ============================================================ */
window.LP = window.LP || {};

LP.questData = (function () {

  /* ---------- 纯读取助手（只读传入的 state，不碰 LP.state） ----------
     缺失 state 时**主动抛错**而不是静默返回 false：
     判定被误当成「全未完成」会静默污染引导进度，必须立即暴露。 */
  function needState(s) {
    if (!s || typeof s !== 'object') {
      throw new Error('questGuide: 步骤判定需要 state —— 请以 done(state, data) 调用');
    }
    return s;
  }
  const arr = (s, k) => (Array.isArray(needState(s)[k]) ? s[k] : []);
  const has = (s, k, id) => arr(s, k).includes(id);
  const done = (s, id) => arr(s, 'completedPuzzles').includes(id);
  const actOf = s => (s && Number(s.act)) || 0;

  /* 第三幕证据板要求的三条身份关系（与 data/evidence.js 一致） */
  function reasonReq() {
    return (LP.data.reasonRequired && LP.data.reasonRequired.act3) || [];
  }
  function reasonDone(s) {
    return reasonReq().filter(k => arr(s, 'evidenceLinks').includes(k)).length;
  }
  function reasonTotal() { return reasonReq().length; }

  function allPeopleKnown(s) {
    return ['person_linyuan', 'person_zhou', 'person_chen', 'person_li']
      .every(pid => LP.data.people[pid].known || has(s, 'discoveredPeople', pid));
  }
  /* 时间线分组/定日期进度（timelineSystem 使用 tlWeather / tlDate） */
  function tlGrouped(s) { return arr(s, 'tlWeather').length >= 5; }
  function tlDated(s) { return arr(s, 'tlDate').filter(Boolean).length >= 3; }

  /* ---------- 六幕任务 ----------
     step: { text, done(state, data), wait?: 双人模式下此步需搭档配合,
             duoOnly?: 仅双人模式显示, dynamic?: 'reason' 需注入计数 }
     action: { label, kind, target } */
  const QUESTS = [
    {
      act: 1, title: '从一张旧照片开始',
      why: '档案索引指向一张四人合影——它的背面藏着这份档案的第一个疑问。',
      steps: {
        solo: [
          { text: '打开四人合影，翻到背面看看', done: s => has(s, 'discoveredEvidence', 'clue_317') },
          { text: '回到日记里，找与折痕相关的那一页', done: s => has(s, 'discoveredDocuments', 'diary_21') },
          { text: '让两条记录互相印证', done: s => done(s, 'act1') }
        ],
        A: [
          { text: '读完日记 · 其二十一', done: s => has(s, 'discoveredDocuments', 'diary_21') },
          { text: '等待记录者描述照片背面的折痕', done: s => done(s, 'duo_crease'), wait: true },
          { text: '让两条记录互相印证', done: s => done(s, 'act1') }
        ],
        B: [
          { text: '打开四人合影，翻到背面看看', done: s => has(s, 'photoFlipped', 'photo_09') },
          { text: '把折痕里的符号描述给执笔者听', done: s => done(s, 'duo_diary21'), wait: true },
          { text: '让两条记录互相印证', done: s => done(s, 'act1') }
        ]
      },
      actions: {
        solo: { label: '打开合影', kind: 'doc', target: 'photo_09' },
        A: { label: '打开日记 · 其二十一', kind: 'doc', target: 'diary_21' },
        B: { label: '打开合影', kind: 'doc', target: 'photo_09' }
      }
    },
    {
      act: 2, title: '钟声之后，还有一条记录',
      why: '钟楼的大钟和公告栏都还留着那几天的痕迹，值得亲自去确认。',
      steps: {
        solo: [
          { text: '前往旧钟楼，敲响大钟，数清它响了几下', done: s => done(s, 'bell7') },
          { text: '查看公告栏，第七行写着谁', done: s => has(s, 'discoveredEvidence', 'clue_zhou_name') },
          { text: '确认这条记录指向的人', done: s => done(s, 'act2') }
        ],
        A: [
          { text: '等待记录者敲响大钟，把次数念给你听', done: s => done(s, 'bell7'), wait: true },
          { text: '等待记录者念出公告栏第七行的名字', done: s => has(s, 'discoveredEvidence', 'clue_zhou_name'), wait: true },
          { text: '确认这条记录指向的人', done: s => done(s, 'act2') }
        ],
        B: [
          { text: '前往旧钟楼，敲响大钟，数清它响了几下', done: s => done(s, 'bell7') },
          { text: '查看公告栏，第七行写着谁', done: s => has(s, 'discoveredEvidence', 'clue_zhou_name') },
          { text: '确认这条记录指向的人', done: s => done(s, 'act2') }
        ]
      },
      actions: {
        solo: { label: '前往旧钟楼', kind: 'scene', target: 'location_clocktower' },
        A: { label: '等待搭档 · 打开通话', kind: 'duo' },
        B: { label: '前往旧钟楼', kind: 'scene', target: 'location_clocktower' }
      }
    },
    {
      act: 3, title: '让代号回到名字',
      why: '档案里的人都只剩代号。名字对上了不算数——要拿出能互相印证的记录。',
      steps: {
        default: [
          { text: '确认全部四位人物的身份', done: s => allPeopleKnown(s) },
          { text: `在证据板上建立身份关系（${'#'}）`, done: s => reasonDone(s) >= reasonTotal(), dynamic: 'reason' },
          { text: '核验通过', done: s => done(s, 'act3') }
        ]
      },
      actions: {
        default: { label: '前往证据板', kind: 'tab', target: 'evidence' }
      }
    },
    {
      act: 4, title: '把互相矛盾的记录放回时间里',
      why: '同一天的记忆里出现了三种天气。先分组，再定日期，最后交叉验证。',
      steps: {
        solo: [
          { text: '按天色把时间线卡片分组', done: s => tlGrouped(s) },
          { text: '为每一天确定日期', done: s => tlDated(s) },
          { text: '交叉验证，修复时间线', done: s => done(s, 'timeline') }
        ],
        A: [
          { text: '把搭档念来的日期记入时间线', done: s => done(s, 'timeline'), wait: true },
          { text: '档案深处出现了新的东西', done: s => actOf(s) >= 5 }
        ],
        B: [
          { text: '按天色把时间线卡片分组', done: s => tlGrouped(s) },
          { text: '为每一天确定日期（天气念给执笔者核对）', done: s => tlDated(s) },
          { text: '修复时间线，再校验拍摄顺序', done: s => done(s, 'photo_sort') }
        ]
      },
      actions: {
        solo: { label: '前往时间线', kind: 'tab', target: 'timeline' },
        A: { label: '等待搭档 · 打开通话', kind: 'duo' },
        B: { label: '前往时间线', kind: 'tab', target: 'timeline' }
      }
    },
    {
      act: 5, title: '修复缺失的五个片段',
      why: 'PAGE_032 只剩乱码。已确证的人物、地点、时间、照片与信件，可以一段段把它修回来。',
      steps: {
        default: [
          {
            text: '确证人物、地点、时间、照片与信件五类事实',
            done: s => has(s, 'discoveredDocuments', 'photo_09')
              && has(s, 'discoveredDocuments', 'photo_11')
              && allPeopleKnown(s)
              && ['location_clocktower', 'location_oldstreet', 'location_ferry'].every(l => has(s, 'discoveredLocations', l))
              && done(s, 'timeline')
              && ['letter_02', 'letter_03', 'letter_04'].every(l => has(s, 'discoveredDocuments', l))
          },
          { text: '逐段修复 PAGE_032', done: s => done(s, 'page32'), duoWait: true },
          { text: '读完修复后的这一页', done: s => actOf(s) >= 6 }
        ]
      },
      actions: {
        default: { label: '打开 PAGE_032', kind: 'doc', target: 'page_032' }
      }
    },
    {
      act: 6, title: '最后一句，交给你来写',
      why: '档案已经完整，只剩最后一行留白。那句话不属于过去。',
      steps: {
        default: [
          { text: '写下你对三问的回答', done: s => !!(s && s.finalMessage) },
          { text: '双人模式：与搭档合卷', done: s => (s && s.mode) === 'solo' || !!(s && s.merged), duoOnly: true }
        ]
      },
      actions: {
        default: { label: '前往结局页', kind: 'ending' }
      }
    }
  ];

  return { QUESTS };
})();
