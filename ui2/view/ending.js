/* ============================================================
   ui2 · 屏幕：结局（第六幕）
   ------------------------------------------------------------
   拆为两个 ui2 视图：
     endingForm  ← endingSystem.start()        三问表单（含主视觉与卷别说明）
     endingLines ← endingSystem.showEndingLines()  结语 / 隐藏结局 / 操作按钮

   边界：viewModel 只读 state + 注入的结局文本；render 只产 DOM。
   「最终页的逐行书写演出」「合卷面板」「打印」仍是命令式流程与
   动态覆盖层，保留在 endingSystem（与证据板关系对话框、
   通话面板同一处理方式），不搬进视图层。
   ============================================================ */
window.LP = window.LP || {};
(function () {

  /* ---------- ① 三问表单 ---------- */
  function formVM(s, d, ui) {
    const mode = s.mode;
    const duo = mode !== 'solo';
    const intro = duo
      ? '第32页的最后一行，林远留空了。\n这一页需要两只手才能写完——\n你的三问在这里，你搭档的三问在 ta 那里。\n写完后，合卷。（每问一句话就好，40 字以内，碎片码会短很多。）'
      : '第32页的最后一行，林远留空了。\n他说：那句话不该由他来说。\n现在，这一页交给你。';
    return {
      duo,
      headNote: 'ARCHIVE A-017 · FINAL PAGE' + (duo ? ' · DUO' : ''),
      title: '第六幕 · 写给未来',
      intro,
      roleLine: mode === 'A' ? '执笔者卷 · 你的三问'
        : mode === 'B' ? '记录者卷 · 你的三问' : null,
      limit: duo ? '40' : '120',
      questions: (ui.questions || []).map(q => q.q),
      needsName: duo,
      submitText: duo ? '写下我这半页' : '写下最后一页'
    };
  }

  function formRender(vm, hosts, ctx) {
    const el = LP.el;
    const stage = hosts.root;
    stage.innerHTML = '';

    /* 结局氛围主视觉（生成：春日清晨的窗台与远处的老镇） */
    stage.appendChild(el('img', {
      class: 'end-hero', src: 'assets/images/ending_spring_morning.webp',
      alt: '春日清晨的窗台，窗外是旧镇与远处的钟楼'
    }));

    stage.appendChild(el('div', { class: 'end-q-head' }, [
      el('div', { class: 'mono', text: vm.headNote }),
      el('h2', { text: vm.title }),
      el('p', { text: vm.intro }),
      vm.roleLine
        ? el('div', { class: 'mono', text: vm.roleLine, style: 'font-size:.65rem;color:var(--gold);letter-spacing:.25em;margin-top:.6rem' })
        : null
    ]));

    const form = el('div', { class: 'end-form' });
    const inputs = [];
    vm.questions.forEach((q, i) => {
      const ta = el('textarea', { placeholder: '写下你的回答……', maxlength: vm.limit });
      inputs.push(ta);
      form.appendChild(el('div', { class: 'end-q' }, [
        el('label', { html: `<span class="qn">Q${i + 1}</span>${LP.escapeHtml(q)}` }),
        ta
      ]));
    });
    let nameInput = null;
    if (vm.needsName) {
      nameInput = el('textarea', { placeholder: '你的署名（将出现在合卷页上）', maxlength: '8', rows: '1' });
      form.appendChild(el('div', { class: 'end-q' }, [
        el('label', { html: '<span class="qn">✍</span>署名' }),
        nameInput
      ]));
    }
    stage.appendChild(form);

    const submit = el('div', { class: 'end-submit' });
    submit.appendChild(el('button', {
      class: 'btn-primary', text: vm.submitText,
      onclick: () => ctx.onSubmit(
        inputs.map(t => t.value.trim()),
        nameInput ? nameInput.value.trim() : ''
      )
    }));
    stage.appendChild(submit);
  }

  /* ---------- ② 结语 / 隐藏结局 / 操作 ---------- */
  function linesVM(s, d, ui) {
    const E = ui.ending;
    const hidden = (s.hiddenClues || []).length >= 1;
    const lines = E.lines.slice();
    if (Array.isArray(s.discoveredEvidence) && s.discoveredEvidence.indexOf('clue_ferry_time') >= 0) {
      lines.splice(4, 0, '他们走的时候，天还没亮。');
    }
    return {
      hidden,
      lines,
      hiddenLines: E.hidden.slice(1),
      duo: s.mode !== 'solo',
      merged: !!s.merged,
      showMerge: s.mode !== 'solo' && !s.merged
    };
  }

  function linesRender(vm, hosts, ctx) {
    const el = LP.el;
    const stage = hosts.root;

    const box = el('div', { class: 'end-lines' });
    vm.lines.forEach((t, i) => {
      box.appendChild(el('p', { text: t, style: `animation-delay:${i * 0.5}s` }));
    });
    stage.appendChild(box);

    if (vm.hidden) {
      const h = el('div', { class: 'end-hidden' });
      h.appendChild(el('div', { class: 'mono', text: 'ARCHIVE A-017 · HIDDEN RECORD' }));
      vm.hiddenLines.forEach(t => h.appendChild(el('p', { text: t })));
      stage.appendChild(h);
    }

    const actions = el('div', { class: 'end-actions' });
    /* 双人且未合卷：合卷入口（碎片码为首选通道） */
    if (vm.showMerge) {
      actions.appendChild(el('button', { class: 'btn-primary', text: '合卷 · 碎片码', onclick: () => ctx.onMergeCode() }));
      actions.appendChild(el('button', { class: 'btn-ghost', text: '让 ta 念给我听', onclick: () => ctx.onMerge() }));
    }
    actions.appendChild(el('button', {
      class: (vm.showMerge ? 'btn-ghost' : 'btn-primary'),
      text: '打印这一页',
      onclick: () => ctx.onPrint()
    }));
    actions.appendChild(el('button', { class: 'btn-ghost', text: '回到档案', onclick: () => ctx.onBack() }));
    actions.appendChild(el('button', { class: 'btn-ghost', text: '重新开始', onclick: () => ctx.onRestart() }));
    stage.appendChild(actions);
  }

  LP.ui2.register('endingForm', formVM, formRender);
  LP.ui2.register('endingLines', linesVM, linesRender);
})();
