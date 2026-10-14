/* ============================================================
   主线任务文案与目标定义 —— 「当前调查」引导卡的数据层
   ------------------------------------------------------------
   · 每个任务绑定一个真实幕（act），步骤的完成条件全部读取
     LP.state 的真实字段，不另维护进度。
   · action 是「前往目标」按钮的行为描述：gotoDoc / gotoScene /
     gotoTab / gotoDuo 由 questGuideSystem 翻译成真实导航。
   · 文案只指引行动，不泄露日期、身份或谜题答案。
   ============================================================ */
window.LP = window.LP || {};

LP.questData = (function () {

  const has = (k, id) => LP.state.has(k, id);
  const done = id => has('completedPuzzles', id);

  /* 第三幕证据板要求的三条身份关系（与 data/evidence.js 一致） */
  function reasonDone() {
    const s = LP.state.get();
    const req = (LP.data.reasonRequired && LP.data.reasonRequired.act3) || [];
    return req.filter(k => (s.evidenceLinks || []).includes(k)).length;
  }
  function reasonTotal() {
    const req = (LP.data.reasonRequired && LP.data.reasonRequired.act3) || [];
    return req.length;
  }
  function allPeopleKnown() {
    return ['person_linyuan', 'person_zhou', 'person_chen', 'person_li']
      .every(pid => LP.data.people[pid].known || has('discoveredPeople', pid));
  }
  /* 时间线分组/定日期进度（timelineSystem 使用 tlWeather / tlDate） */
  function tlGrouped() { return (LP.state.get().tlWeather || []).length >= 5; }
  function tlDated() { return (LP.state.get().tlDate || []).filter(Boolean).length >= 3; }

  /* ---------- 六幕任务 ----------
     step: { text, done(state), wait?: 双人模式下此步需搭档配合 }
     action: { label, kind, target } */
  const QUESTS = [
    {
      act: 1, title: '从一张旧照片开始',
      why: '档案索引指向一张四人合影——它的背面藏着这份档案的第一个疑问。',
      steps: {
        solo: [
          { text: '打开四人合影，翻到背面看看', done: () => has('discoveredEvidence', 'clue_317') },
          { text: '回到日记里，找与折痕相关的那一页', done: () => has('discoveredDocuments', 'diary_21') },
          { text: '让两条记录互相印证', done: () => done('act1') }
        ],
        A: [
          { text: '读完日记 · 其二十一', done: () => has('discoveredDocuments', 'diary_21') },
          { text: '等待记录者描述照片背面的折痕', done: () => done('duo_crease'), wait: true },
          { text: '让两条记录互相印证', done: () => done('act1') }
        ],
        B: [
          { text: '打开四人合影，翻到背面看看', done: () => has('photoFlipped', 'photo_09') },
          { text: '把折痕里的符号描述给执笔者听', done: () => done('duo_diary21'), wait: true },
          { text: '让两条记录互相印证', done: () => done('act1') }
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
          { text: '前往旧钟楼，敲响大钟，数清它响了几下', done: () => done('bell7') },
          { text: '查看公告栏，第七行写着谁', done: () => has('discoveredEvidence', 'clue_zhou_name') },
          { text: '确认这条记录指向的人', done: () => done('act2') }
        ],
        A: [
          { text: '等待记录者敲响大钟，把次数念给你听', done: () => done('bell7'), wait: true },
          { text: '等待记录者念出公告栏第七行的名字', done: () => has('discoveredEvidence', 'clue_zhou_name'), wait: true },
          { text: '确认这条记录指向的人', done: () => done('act2') }
        ],
        B: [
          { text: '前往旧钟楼，敲响大钟，数清它响了几下', done: () => done('bell7') },
          { text: '查看公告栏，第七行写着谁', done: () => has('discoveredEvidence', 'clue_zhou_name') },
          { text: '确认这条记录指向的人', done: () => done('act2') }
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
          { text: '确认全部四位人物的身份', done: allPeopleKnown },
          { text: `在证据板上建立身份关系（${'#'}）`, done: () => reasonDone() >= reasonTotal(), dynamic: 'reason' },
          { text: '核验通过', done: () => done('act3') }
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
          { text: '按天色把时间线卡片分组', done: tlGrouped },
          { text: '为每一天确定日期', done: tlDated },
          { text: '交叉验证，修复时间线', done: () => done('timeline') }
        ],
        A: [
          { text: '把搭档念来的日期记入时间线', done: () => done('timeline'), wait: true },
          { text: '档案深处出现了新的东西', done: () => LP.state.get().act >= 5 }
        ],
        B: [
          { text: '按天色把时间线卡片分组', done: tlGrouped },
          { text: '为每一天确定日期（天气念给执笔者核对）', done: tlDated },
          { text: '修复时间线，再校验拍摄顺序', done: () => done('photo_sort') }
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
          { text: '确证人物、地点、时间、照片与信件五类事实', done: () => has('discoveredDocuments', 'photo_09') && has('discoveredDocuments', 'photo_11') && allPeopleKnown() && ['location_clocktower', 'location_oldstreet', 'location_ferry'].every(l => has('discoveredLocations', l)) && done('timeline') && ['letter_02', 'letter_03', 'letter_04'].every(l => has('discoveredDocuments', l)) },
          { text: '逐段修复 PAGE_032', done: () => done('page32'), duoWait: true },
          { text: '读完修复后的这一页', done: () => LP.state.get().act >= 6 }
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
          { text: '写下你对三问的回答', done: () => !!LP.state.get().finalMessage },
          { text: '双人模式：与搭档合卷', done: () => LP.state.get().mode === 'solo' || !!LP.state.get().merged, duoOnly: true }
        ]
      },
      actions: {
        default: { label: '前往结局页', kind: 'ending' }
      }
    }
  ];

  return { QUESTS };
})();
