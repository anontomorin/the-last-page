/* ============================================================
   结局系统 —— 第六幕《写给未来》最终书写 / 双人合卷 / 隐藏结局
   ============================================================ */
window.LP = window.LP || {};
LP.ending = (function () {

  /* 当前卷的问题集 */
  function myQuestions() {
    const mode = LP.state.get().mode;
    if (mode === 'A') return LP.story.ENDING.questionsA;
    if (mode === 'B') return LP.story.ENDING.questionsB;
    return LP.story.ENDING.questions;
  }

  function start() {
    document.body.dataset.act = 6;
    document.body.classList.add('theme-bright');
    LP.router.go('ending');
    const stage = LP.$('#ending-stage');
    stage.innerHTML = '';

    const mode = LP.state.get().mode;
    const questions = myQuestions();
    const roleLine = mode === 'A' ? '执笔者卷 · 你的三问'
      : mode === 'B' ? '记录者卷 · 你的三问' : null;

    stage.appendChild(LP.el('div', { class: 'end-q-head' }, [
      LP.el('div', { class: 'mono', text: 'ARCHIVE A-017 · FINAL PAGE' + (mode !== 'solo' ? ' · DUO' : '') }),
      LP.el('h2', { text: '第六幕 · 写给未来' }),
      LP.el('p', {
        text: mode === 'solo'
          ? '第32页的最后一行，林远留空了。\n他说：那句话不该由他来说。\n现在，这一页交给你。'
          : '第32页的最后一行，林远留空了。\n这一页需要两只手才能写完——\n你的三问在这里，你搭档的三问在 ta 那里。\n写完后，合卷。（每问一句话就好，40 字以内，碎片码会短很多。）'
      }),
      roleLine ? LP.el('div', { class: 'mono', text: roleLine, style: 'font-size:.65rem;color:var(--gold);letter-spacing:.25em;margin-top:.6rem' }) : null
    ]));

    const form = LP.el('div', { class: 'end-form' });
    const LIM = mode === 'solo' ? '120' : '40';
    const inputs = [];
    questions.forEach((q, i) => {
      const ta = LP.el('textarea', { placeholder: '写下你的回答……', maxlength: LIM });
      inputs.push(ta);
      form.appendChild(LP.el('div', { class: 'end-q' }, [
        LP.el('label', { html: `<span class="qn">Q${i + 1}</span>${LP.escapeHtml(q.q)}` }),
        ta
      ]));
    });
    let nameInput = null;
    if (mode !== 'solo') {
      nameInput = LP.el('textarea', { placeholder: '你的署名（将出现在合卷页上）', maxlength: '8', rows: '1' });
      form.appendChild(LP.el('div', { class: 'end-q' }, [
        LP.el('label', { html: '<span class="qn">✍</span>署名' }),
        nameInput
      ]));
    }
    stage.appendChild(form);

    const submit = LP.el('div', { class: 'end-submit' });
    const btn = LP.el('button', { class: 'btn-primary', text: mode === 'solo' ? '写下最后一页' : '写下我这半页' });
    btn.addEventListener('click', () => {
      const answers = inputs.map(t => t.value.trim());
      if (answers.some(a => !a) || (mode !== 'solo' && !nameInput.value.trim())) {
        LP.audio.error();
        LP.ui.toast(mode === 'solo' ? '三句话都要写下——这一页需要完整。' : '三问与署名都要写下。', 'red');
        return;
      }
      LP.audio.complete();
      LP.state.set({
        finalMessage: {
          name: mode !== 'solo' ? nameInput.value.trim() : '',
          q1: answers[0], q2: answers[1], q3: answers[2]
        }
      });
      printFinalPage(stage);
    });
    submit.appendChild(btn);
    stage.appendChild(submit);
  }

  /* 最终页的行：单人=全部；双人未合卷=只有自己这半（对方留白） */
  function finalPageLines() {
    const s = LP.state.get();
    const fm = s.finalMessage || {};
    const mode = s.mode;
    const qs = myQuestions();

    if (mode === 'solo') {
      return [
        { text: '他们曾年轻，我们正年轻。', cls: 'user' },
        { text: '如果你正在读这一页，说明很多年已经过去了。', cls: '' },
        { text: '……', cls: '' },
        { text: '问：' + qs[0].q, cls: '' },
        { text: '答：' + (fm.q1 || ''), cls: 'user' },
        { text: '问：' + qs[1].q, cls: '' },
        { text: '答：' + (fm.q2 || ''), cls: 'user' },
        { text: '问：' + qs[2].q, cls: '' },
        { text: '答：' + (fm.q3 || ''), cls: 'user' }
      ];
    }

    /* 双人：交替排版——A 的问与答（墨色）、B 的问与答（朱色） */
    const qA = LP.story.ENDING.questionsA, qB = LP.story.ENDING.questionsB;
    const mine = fm;
    const partner = s.partnerMessage;
    const lines = [
      { text: '他们曾年轻，我们正年轻。', cls: 'user' },
      { text: '如果你正在读这一页，说明很多年已经过去了。', cls: '' },
      { text: '……', cls: '' }
    ];
    for (let i = 0; i < 3; i++) {
      const k = 'q' + (i + 1);
      // A 的问答
      lines.push({ text: '问：' + qA[i].q, cls: '' });
      if (mode === 'A') lines.push({ text: '答：' + (mine[k] || ''), cls: 'user' });
      else lines.push({ text: partner ? '答：' + partner[k] : '（这一半，还在你的执笔者那里。）', cls: partner ? 'partner' : 'blank' });
      // B 的问答
      lines.push({ text: '问：' + qB[i].q, cls: '' });
      if (mode === 'B') lines.push({ text: '答：' + (mine[k] || ''), cls: 'user' });
      else lines.push({ text: partner ? '答：' + partner[k] : '（这一半，还在你的记录者那里。）', cls: partner ? 'partner' : 'blank' });
    }
    return lines;
  }

  /* 打印动画：逐行「印」到最终页上 */
  function printFinalPage(stage) {
    stage.innerHTML = '';
    const page = LP.el('div', { id: 'print-page' });
    page.appendChild(LP.el('div', { class: 'fp-head' }, [
      LP.el('span', { text: 'ARCHIVE A-017' }),
      LP.el('span', { text: 'PAGE 032 · 补写页' })
    ]));
    stage.appendChild(page);

    const lines = finalPageLines();
    let i = 0;
    (function next() {
      if (i >= lines.length) return afterPrint(stage, page);
      const row = LP.el('div', { class: 'fp-line ' + lines[i].cls });
      page.appendChild(row);
      LP.anim.typewriter(row, lines[i].text, lines[i].cls === 'user' ? 34 : 22, () => {
        i++;
        setTimeout(next, 220);
      });
    })();
  }

  function afterPrint(stage, page) {
    const s = LP.state.get();
    // 双人：合卷署名区
    if (s.mode !== 'solo') {
      const sig = LP.el('div', { class: 'fp-duo-sig mono' });
      const myName = (s.finalMessage && s.finalMessage.name) || '？';
      const partnerName = s.partnerName || '＿＿＿＿';
      const myRole = s.mode === 'A' ? '执笔者' : '记录者';
      const partnerRole = s.mode === 'A' ? '记录者' : '执笔者';
      sig.innerHTML = `—— 由 ${myRole}·${LP.escapeHtml(myName)} 与 ${partnerRole}·${LP.escapeHtml(partnerName)} 共同写就`;
      page.appendChild(sig);
    }
    page.appendChild(LP.el('div', { class: 'fp-stamp' }, [
      LP.el('span', { class: 'stamp', text: s.merged ? '合卷完成' : '档案完成' })
    ]));
    LP.audio.complete();

    const pctBox = LP.el('div', { class: 'end-complete' }, [
      LP.el('div', { class: 'mono dim', text: '档案完整度', style: 'font-size:.7rem;letter-spacing:.3em' }),
      LP.el('div', { class: 'pct mono', text: '96.7%' })
    ]);
    stage.appendChild(pctBox);
    const pctEl = pctBox.querySelector('.pct');
    const steps = [96.7, 99.2, 99.9, 100];
    let si = 0;
    (function step() {
      if (si >= steps.length - 1) { pctEl.textContent = '100%'; return showEndingLines(stage); }
      LP.anim.countUp(pctEl, steps[si], steps[si + 1], 1100, v => v.toFixed(1) + '%');
      si++;
      setTimeout(step, 1250);
    })();
  }

  /* 从工作台「返回结束页」 */
  function resume() {
    const fm = LP.state.get().finalMessage;
    LP.router.go('ending');
    const stage = LP.$('#ending-stage');
    stage.innerHTML = '';
    if (!fm) { start(); return; }

    const page = LP.el('div', { id: 'print-page' });
    page.appendChild(LP.el('div', { class: 'fp-head' }, [
      LP.el('span', { text: 'ARCHIVE A-017' }),
      LP.el('span', { text: 'PAGE 032 · 补写页' })
    ]));
    finalPageLines().forEach(l =>
      page.appendChild(LP.el('div', { class: 'fp-line ' + l.cls, text: l.text })));
    const s = LP.state.get();
    if (s.mode !== 'solo') {
      const sig = LP.el('div', { class: 'fp-duo-sig mono' });
      const myRole = s.mode === 'A' ? '执笔者' : '记录者';
      const partnerRole = s.mode === 'A' ? '记录者' : '执笔者';
      sig.innerHTML = `—— 由 ${myRole}·${LP.escapeHtml(fm.name || '？')} 与 ${partnerRole}·${LP.escapeHtml(s.partnerName || '＿＿＿＿')} 共同写就`;
      page.appendChild(sig);
    }
    page.appendChild(LP.el('div', { class: 'fp-stamp' }, [
      LP.el('span', { class: 'stamp', text: s.merged ? '合卷完成' : '档案完成' })
    ]));
    stage.appendChild(page);
    stage.appendChild(LP.el('div', { class: 'end-complete' }, [
      LP.el('div', { class: 'mono dim', text: '档案完整度', style: 'font-size:.7rem;letter-spacing:.3em' }),
      LP.el('div', { class: 'pct mono', text: '100%' })
    ]));
    showEndingLines(stage);
  }

  function showEndingLines(stage) {
    const s = LP.state.get();
    const box = LP.el('div', { class: 'end-lines' });
    const lines = LP.story.ENDING.lines.slice();
    if (LP.state.has('discoveredEvidence', 'clue_ferry_time')) {
      lines.splice(4, 0, '他们走的时候，天还没亮。');
    }
    lines.forEach((t, i) => {
      box.appendChild(LP.el('p', { text: t, style: `animation-delay:${i * 0.5}s` }));
    });
    stage.appendChild(box);

    if (s.hiddenClues.length >= 1) {
      LP.state.set({ ending: 'hidden' });
      const h = LP.el('div', { class: 'end-hidden' });
      h.appendChild(LP.el('div', { class: 'mono', text: 'ARCHIVE A-017 · HIDDEN RECORD' }));
      LP.story.ENDING.hidden.slice(1).forEach(t => h.appendChild(LP.el('p', { text: t })));
      stage.appendChild(h);
      LP.audio.unlock();
    } else {
      LP.state.set({ ending: 'normal' });
    }

    const actions = LP.el('div', { class: 'end-actions' });
    // 双人且未合卷：合卷入口（碎片码为首选通道）
    if (s.mode !== 'solo' && !s.merged) {
      actions.appendChild(LP.el('button', {
        class: 'btn-primary', text: '合卷 · 碎片码',
        onclick: openMergeCode
      }));
      actions.appendChild(LP.el('button', {
        class: 'btn-ghost', text: '让 ta 念给我听',
        onclick: openMerge
      }));
    }
    actions.appendChild(LP.el('button', {
      class: s.mode !== 'solo' && !s.merged ? 'btn-ghost' : 'btn-primary',
      text: '打印这一页',
      onclick: () => window.print()
    }));
    actions.appendChild(LP.el('button', {
      class: 'btn-ghost', text: '回到档案',
      onclick: () => { LP.router.go('archive'); LP.archive.refreshAll(); }
    }));
    actions.appendChild(LP.el('button', {
      class: 'btn-ghost', text: '重新开始',
      onclick: () => {
        if (!confirm('清除本机存档并重新整理这份档案？')) return;
        LP.save.wipe();
        location.hash = '';
        location.reload();
      }
    }));
    stage.appendChild(actions);
  }

  /* ---------------- 合卷 ---------------- */
  /* 主渠道：把三问念给对方听，把对方念来的三问记在这里 */
  function openMerge() {
    if (LP.$('.mg-overlay')) return;
    LP.audio.open();
    const overlay = LP.el('div', { class: 'ps-overlay mg-overlay' });
    const panel = LP.el('div', { class: 'ps-panel' });
    panel.appendChild(LP.el('div', { class: 'mono ps-head', text: 'MERGE · 合卷' }));
    panel.appendChild(LP.el('p', {
      class: 'ps-tip serif',
      text: '让搭档把 ta 的三问逐条念给你听。你听到什么，就记什么——不必一字不差。'
    }));

    const qs = LP.story.ENDING[myRoleKey() === 'A' ? 'questionsB' : 'questionsA'];
    const inputs = [];
    qs.forEach((q, i) => {
      inputs.push(LP.el('textarea', {
        placeholder: 'Q' + (i + 1) + ' 你听到的回答……', maxlength: '40', rows: '2'
      }));
      panel.appendChild(LP.el('div', { class: 'end-q' }, [
        LP.el('label', { html: `<span class="qn">Q${i + 1}</span>${LP.escapeHtml(q.q)}` }),
        inputs[i]
      ]));
    });
    const nameInput = LP.el('textarea', { placeholder: 'ta 的署名（念给你听的那个）', maxlength: '8', rows: '1' });
    panel.appendChild(LP.el('div', { class: 'end-q' }, [
      LP.el('label', { html: '<span class="qn">✍</span>署名' }), nameInput
    ]));

    const acts = LP.el('div', { class: 'ps-actions' });
    acts.appendChild(LP.el('button', {
      class: 'btn-primary', text: '合上这一页',
      onclick: () => {
        const vals = inputs.map(t => t.value.trim());
        if (vals.some(v => !v) || !nameInput.value.trim()) {
          LP.audio.error();
          LP.ui.toast('三问答复与署名都要记下 —— 让 ta 再念一遍。', 'red');
          return;
        }
        close();
        applyMerge(toMergeData({ name: nameInput.value.trim(), q1: vals[0], q2: vals[1], q3: vals[2] }));
      }
    }));
    acts.appendChild(LP.el('button', {
      class: 'btn-ghost', text: '先把我这半页念给 ta',
      onclick: showMyReadAloud
    }));
    acts.appendChild(LP.el('button', {
      class: 'btn-ghost', text: '改用碎片码',
      onclick: () => { close(); openMergeCode(); }
    }));
    acts.appendChild(LP.el('button', { class: 'btn-ghost', text: '收起', onclick: close }));
    panel.appendChild(acts);

    overlay.appendChild(panel);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    function close() { LP.audio.click(); overlay.remove(); }
  }

  function myRoleKey() { return LP.state.get().mode; }

  /* 合卷载荷：紧凑数组（短码） */
  function myMergePayload() {
    const fm = LP.state.get().finalMessage || {};
    return [fm.name || '', fm.q1 || '', fm.q2 || '', fm.q3 || ''];
  }
  function toMergeData(d) {
    if (Array.isArray(d)) return { name: d[0] || '', q1: d[1] || '', q2: d[2] || '', q3: d[3] || '' };
    return d || {};
  }

  /* ---------------- 合卷 · 碎片码（首选通道） ---------------- */
  function copyText(text, btn) {
    const done = () => { if (btn) { btn.textContent = '已复制'; LP.audio.click(); } };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => fallback());
        return;
      }
    } catch (e) { /* ignore */ }
    fallback();
    function fallback() {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand && document.execCommand('copy');
        ta.remove();
        done();
      } catch (e) {
        LP.ui.toast('复制失败 —— 手动选中这段码复制吧。', 'gold');
      }
    }
  }

  function openMergeCode() {
    if (LP.$('.mg-overlay')) return;
    LP.audio.open();
    const overlay = LP.el('div', { class: 'ps-overlay mg-overlay' });
    const panel = LP.el('div', { class: 'ps-panel' });
    panel.appendChild(LP.el('div', { class: 'mono ps-head', text: 'MERGE · 碎片码' }));
    panel.appendChild(LP.el('p', {
      class: 'ps-tip serif',
      text: '把这段码发给 ta，再把 ta 的码粘进来。两半页就合上了。'
    }));

    /* 一、我的半页 */
    const code = LP.fragment.make('merge', myMergePayload());
    const mine = LP.el('div', { class: 'mg-block' });
    mine.appendChild(LP.el('div', { class: 'mono mg-block-title', text: '① 我的半页 · 发给 ta' }));
    const out = LP.el('textarea', {
      class: 'mg-code mono', readonly: '', rows: '3', text: code
    });
    out.value = code;
    out.addEventListener('focus', () => out.select());
    mine.appendChild(out);
    const rowA = LP.el('div', { class: 'ps-actions' });
    const copyBtn = LP.el('button', { class: 'btn-primary', text: '复制我的碎片码' });
    copyBtn.addEventListener('click', () => copyText(code, copyBtn));
    rowA.appendChild(copyBtn);
    mine.appendChild(rowA);
    mine.appendChild(LP.el('div', {
      class: 'mono dim', text: `共 ${code.length} 个字符`, style: 'font-size:.6rem;text-align:center;margin-top:.4rem'
    }));
    panel.appendChild(mine);

    /* 二、ta 的半页 */
    const theirs = LP.el('div', { class: 'mg-block' });
    theirs.appendChild(LP.el('div', { class: 'mono mg-block-title', text: '② ta 的半页 · 粘在这里' }));
    const inp = LP.el('textarea', {
      class: 'mg-code mono', rows: '3', placeholder: '粘贴 ta 发给你的碎片码（LP1.…）'
    });
    theirs.appendChild(inp);
    const rowB = LP.el('div', { class: 'ps-actions' });
    rowB.appendChild(LP.el('button', {
      class: 'btn-primary', text: '拼入',
      onclick: () => {
        const r = LP.fragment.parse(inp.value);
        if (!r) { LP.audio.error(); LP.ui.toast('无法识别的碎片码', 'red'); return; }
        if (r.error === 'self') { LP.audio.error(); LP.ui.toast('这是你自己的碎片——它属于对方。', 'red'); return; }
        if (r.type !== 'merge') { LP.audio.error(); LP.ui.toast('这不是合卷碎片。', 'red'); return; }
        close();
        applyMerge(toMergeData(r.data));
      }
    }));
    theirs.appendChild(rowB);
    panel.appendChild(theirs);

    /* 三、不用码的通道 */
    const acts = LP.el('div', { class: 'ps-actions mg-alt' });
    acts.appendChild(LP.el('button', {
      class: 'btn-ghost', text: '不想用码 · 让 ta 念给我听',
      onclick: () => { close(); openMerge(); }
    }));
    acts.appendChild(LP.el('button', { class: 'btn-ghost', text: '收起', onclick: close }));
    panel.appendChild(acts);

    overlay.appendChild(panel);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    function close() { LP.audio.click(); overlay.remove(); }
  }

  /* 念给对方听：把自己的三问逐条展示出来 */
  function showMyReadAloud() {
    const fm = LP.state.get().finalMessage || {};
    const qs = myQuestions();
    LP.audio.complete();
    LP.ui.narrate([
      '把你的三问，逐条念给 ta 听：',
      'Q1 ' + qs[0].q + ' —— ' + (fm.q1 || ''),
      'Q2 ' + qs[1].q + ' —— ' + (fm.q2 || ''),
      'Q3 ' + qs[2].q + ' —— ' + (fm.q3 || ''),
      '署名：' + (fm.name || '')
    ]);
  }

  function applyMerge(data) {
    if (!data || typeof data !== 'object') return;
    LP.state.set({
      partnerMessage: { name: data.name || '？', q1: data.q1 || '', q2: data.q2 || '', q3: data.q3 || '' },
      partnerName: data.name || '？',
      merged: true
    });
    LP.audio.complete();
    LP.anim.flash();
    LP.ui.narrate([
      '两半页，合在了一起。',
      '执笔者与记录者，于各自的时代，写完了同一页。',
      '——档案，完整了。'
    ], () => resume());
  }

  return { start, resume, applyMerge, openMerge, openMergeCode, myMergePayload, toMergeData };
})();
