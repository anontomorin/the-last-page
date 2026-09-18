/* ============================================================
   结局系统 —— 第六幕《写给未来》最终书写 / 隐藏结局 / 打印
   ============================================================ */
window.LP = window.LP || {};
LP.ending = (function () {

  function start() {
    document.body.dataset.act = 6;
    document.body.classList.add('theme-bright');
    LP.router.go('ending');
    const stage = LP.$('#ending-stage');
    stage.innerHTML = '';

    stage.appendChild(LP.el('div', { class: 'end-q-head' }, [
      LP.el('div', { class: 'mono', text: 'ARCHIVE A-017 · FINAL PAGE' }),
      LP.el('h2', { text: '第六幕 · 写给未来' }),
      LP.el('p', { text: '第32页的最后一行，林远留空了。\n他说：那句话不该由他来说。\n现在，这一页交给你。' })
    ]));

    const form = LP.el('div', { class: 'end-form' });
    const inputs = [];
    LP.story.ENDING.questions.forEach((q, i) => {
      const ta = LP.el('textarea', { placeholder: '写下你的回答……', maxlength: '120' });
      inputs.push(ta);
      form.appendChild(LP.el('div', { class: 'end-q' }, [
        LP.el('label', { html: `<span class="qn">Q${i + 1}</span>${LP.escapeHtml(q.q)}` }),
        ta
      ]));
    });
    stage.appendChild(form);

    const submit = LP.el('div', { class: 'end-submit' });
    const btn = LP.el('button', { class: 'btn-primary', text: '写下最后一页' });
    btn.addEventListener('click', () => {
      const answers = inputs.map(t => t.value.trim());
      if (answers.some(a => !a)) {
        LP.audio.error();
        LP.ui.toast('三句话都要写下——这一页需要完整。', 'red');
        return;
      }
      LP.audio.complete();
      LP.state.set({ finalMessage: { q1: answers[0], q2: answers[1], q3: answers[2] } });
      printFinalPage(stage, answers);
    });
    submit.appendChild(btn);
    stage.appendChild(submit);
  }

  /* 打印动画：逐行把答案「印」到最终页上 */
  function printFinalPage(stage, answers) {
    stage.innerHTML = '';

    const page = LP.el('div', { id: 'print-page' });
    page.appendChild(LP.el('div', { class: 'fp-head' }, [
      LP.el('span', { text: 'ARCHIVE A-017' }),
      LP.el('span', { text: 'PAGE 032 · 补写页' })
    ]));
    stage.appendChild(page);

    const lines = [
      { text: '如果你正在读这一页，说明很多年已经过去了。', cls: '' },
      { text: '……', cls: '' },
      { text: '问：如果过去的人能够看到今天，你最想告诉他们什么？', cls: '' },
      { text: '答：' + answers[0], cls: 'user' },
      { text: '问：你希望未来的人生活在怎样的世界？', cls: '' },
      { text: '答：' + answers[1], cls: 'user' },
      { text: '问：如果只能留下这一句话，你会写什么？', cls: '' },
      { text: '答：' + answers[2], cls: 'user' }
    ];

    let i = 0;
    (function next() {
      if (i >= lines.length) return afterPrint(stage, page);
      const row = LP.el('div', { class: 'fp-line ' + lines[i].cls });
      page.appendChild(row);
      LP.anim.typewriter(row, lines[i].text, lines[i].cls ? 34 : 22, () => {
        i++;
        setTimeout(next, 260);
      });
    })();
  }

  function afterPrint(stage, page) {
    // 印章
    page.appendChild(LP.el('div', { class: 'fp-stamp' }, [
      LP.el('span', { class: 'stamp', text: '档案完成' })
    ]));
    LP.audio.complete();

    // 完整度滚动 96.7 → 99.2 → 99.9 → 100
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

  /* 从工作台「返回结束页」—— 依据存档即时重建最终页（跳过打字动画） */
  function resume() {
    const fm = LP.state.get().finalMessage;
    LP.router.go('ending');
    const stage = LP.$('#ending-stage');
    stage.innerHTML = '';
    if (!fm) { start(); return; } // 未完成三问则回到作答页

    const answers = [fm.q1, fm.q2, fm.q3];
    const page = LP.el('div', { id: 'print-page' });
    page.appendChild(LP.el('div', { class: 'fp-head' }, [
      LP.el('span', { text: 'ARCHIVE A-017' }),
      LP.el('span', { text: 'PAGE 032 · 补写页' })
    ]));
    const lines = [
      { text: '如果你正在读这一页，说明很多年已经过去了。', cls: '' },
      { text: '……', cls: '' },
      { text: '问：如果过去的人能够看到今天，你最想告诉他们什么？', cls: '' },
      { text: '答：' + answers[0], cls: 'user' },
      { text: '问：你希望未来的人生活在怎样的世界？', cls: '' },
      { text: '答：' + answers[1], cls: 'user' },
      { text: '问：如果只能留下这一句话，你会写什么？', cls: '' },
      { text: '答：' + answers[2], cls: 'user' }
    ];
    lines.forEach(l => page.appendChild(LP.el('div', { class: 'fp-line ' + l.cls, text: l.text })));
    page.appendChild(LP.el('div', { class: 'fp-stamp' }, [
      LP.el('span', { class: 'stamp', text: '档案完成' })
    ]));
    stage.appendChild(page);

    stage.appendChild(LP.el('div', { class: 'end-complete' }, [
      LP.el('div', { class: 'mono dim', text: '档案完整度', style: 'font-size:.7rem;letter-spacing:.3em' }),
      LP.el('div', { class: 'pct mono', text: '100%' })
    ]));
    showEndingLines(stage);
  }

  function showEndingLines(stage) {
    const box = LP.el('div', { class: 'end-lines' });
    LP.story.ENDING.lines.forEach((t, i) => {
      box.appendChild(LP.el('p', { text: t, style: `animation-delay:${i * 0.5}s` }));
    });
    stage.appendChild(box);

    // 隐藏结局：发现过 ARG 隐藏线索
    if (LP.state.get().hiddenClues.length >= 1) {
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
    actions.appendChild(LP.el('button', {
      class: 'btn-primary', text: '打印这一页',
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

  return { start, resume };
})();
