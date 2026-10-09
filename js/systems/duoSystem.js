/* ============================================================
   双人拼卷 · 通话面板
   ------------------------------------------------------------
   语音通话是主渠道。本面板只做两件事：
     · 念给 ta 听 —— 给出可以直接念出口的自然语言台词（不含任何码）
     · 记下 ta 说的 —— 把你听到的话写下来，系统只负责确认你听懂了
   碎片码退到最底部，折叠为「无法通话时的兜底」。
   ============================================================ */
window.LP = window.LP || {};
LP.duo = (function () {

  /* ---------------- 听写校验 ----------------
     三层判定（v4，收紧了「只要沾边就算过」的宽松匹配）：
       1) short   —— 短答（一个数、一个名字、一个方向）：
                    归一化后必须「等于」某个标准答案或同义答案。
       2) natural —— 自然语言描述：必须命中 accept 里至少 minHits 个
                    「完整词」，短到只剩一个字的关键词不算命中。
       3) 描述型带必须项 —— acceptGroups：每组都必须命中一个才算过。
     另外统一拦截「常见误答」reject：即便沾到关键词，也判为未听懂。
  ------------------------------------------------------------ */
  function norm(s) {
    return String(s == null ? '' : s)
      .replace(/\s+/g, '')
      .replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      .replace(/[　]/g, '')
      .replace(/[，。、．,.\-—_/·「」『』（）()【】""''：:；;？?！!]/g, '')
      .toLowerCase();
  }

  /* 归一化后是否「就是」这个词（短答用）：
     · 完全相等 → 命中
     · 答案被夹在一句不长的描述里（如「像是三，又像一和七挨在一起」）→ 命中
     · 但整句不能长得离谱，否则会误伤（如把一段无关的话里出现「三」当成答案） */
  function isExact(n, k) {
    const nk = norm(k);
    if (!nk) return false;
    if (n === nk) return true;
    if (n.indexOf(nk) < 0) return false;
    // 允许在答案前后各带一点描述；对短答案给更宽的窗口，对长答案给固定余量
    const slack = nk.length <= 2 ? 24 : nk.length <= 4 ? 20 : 14;
    return n.length <= nk.length + slack;
  }

  /* 命中一个「完整词」：要求该关键词本身有足够信息量（≥2 字符，纯数字除外） */
  function hasWord(n, k) {
    const nk = norm(k);
    if (!nk) return false;
    // 单字中文关键词信息量太低，不接受为自然语言命中（短答另有 isExact 处理）
    if (nk.length < 2 && !/^[0-9]+$/.test(nk)) return false;
    return n.indexOf(nk) >= 0;
  }

  /* 分组命中：每组本身已限定「必须给到这个信息」，单字关键词也可算（如「晴」「雨」） */
  function groupHit(n, k) {
    const nk = norm(k);
    return !!nk && n.indexOf(nk) >= 0;
  }

  function checkAnswer(item, input) {
    const n = norm(input);
    if (!n) return false;
    const L = item.listen;

    /* 1) 短答：归一化相等 / 近似相等（先算命中） */
    let ok = false;
    if (L.kind === 'short' && L.accept && L.accept.length) {
      ok = L.accept.some(k => isExact(n, k));
    } else if (L.acceptGroups && L.acceptGroups.length) {
      /* 3) 描述型带必须项：每组都要命中（组内单字也认，因为分组已限定信息） */
      ok = L.acceptGroups.every(group => group.some(k => groupHit(n, k)));
    } else {
      /* 2) 自然语言：按完整词计数 */
      const hits = (L.accept || []).filter(k => hasWord(n, k)).length;
      ok = hits >= (L.minHits || 1);
    }
    if (!ok) return false;

    /* 4) 「配对误答」：日期出现时，天气被配成了别的日期 */
    if (L.rejectPair) {
      const bad = L.rejectPair.some(([anchors, wrongs]) =>
        anchors.some(a => groupHit(n, a)) && wrongs.some(w => groupHit(n, w)));
      if (bad) return false;
    }

    /* 命中后仍要排除「误答词」。
       短答：reject 按「整体相等」判定 —— 只有整句就是那个错答案才算错，
             避免「3-17」因为含子串「3」「7」而被误杀；
       长答/分组：reject 按「包含」判定 —— 长句里出现明确相反的说法即为误答。 */
    if (L.reject && L.reject.length) {
      const isShort = L.kind === 'short';
      const hit = L.reject.some(k => {
        const nk = norm(k);
        if (!nk) return false;
        return isShort ? (n === nk || (n.length <= nk.length + 4 && n.indexOf(nk) >= 0))
                       : n.indexOf(nk) >= 0;
      });
      if (hit) return false;
    }
    return true;
  }

  /* 朗读（可选；浏览器不支持时静默） */
  function speak(text) {
    try {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return false;
      window.speechSynthesis.cancel();
      const u = new window.SpeechSynthesisUtterance(String(text).replace(/[「」『』（）]/g, ''));
      u.lang = 'zh-CN'; u.rate = 0.9;
      window.speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }

  /* ---------------- 本幕卡点：谁在等谁 ----------------
     两卷都被设计成无法独自读完 —— 这里把「此刻卡在等哪一句」明说出来 */
  function gateText(s) {
    const undone = LP.duoScript.listenable(s)
      .filter(t => t.act <= s.act && !s.completedPuzzles.includes(t.listen.done));
    const cur = undone.filter(t => t.act === s.act);
    const wait = cur.length ? cur[0] : undone[0];
    const ready = LP.duoScript.sayable(s)[0];

    const parts = [];
    if (wait) parts.push('◈ 你卡在等 ta 念：<b>' + wait.title + '</b>');
    if (ready) parts.push('◈ ta 在等你念：<b>' + ready.title + '</b>');
    if (!parts.length) return '';
    return parts.join('<br>') +
      '<br><span class="dim">少了对方那半句，这一幕就过不去 —— 两卷都读不完自己那一半。</span>';
  }

  /* ---------------- 面板 ---------------- */
  function openPanel() {
    if (LP.$('.duo-overlay')) return;
    LP.audio.open();
    const s = LP.state.get();

    const overlay = LP.el('div', { class: 'duo-overlay' });
    const panel = LP.el('div', { class: 'duo-panel' });
    panel.appendChild(LP.el('div', { class: 'mono duo-head', text: 'VOICE LINK · 通话' }));
    panel.appendChild(LP.el('p', {
      class: 'serif duo-tip',
      text: '你们应该正在通着话。你手里有的，念给 ta；ta 说了什么，你用自己的话记在这里 —— 不必一字不差，记到你听懂为止。'
    }));

    /* ---- 本幕卡点：谁在等谁 ---- */
    const gate = gateText(s);
    if (gate) {
      panel.appendChild(LP.el('div', { class: 'duo-gate', html: gate }));
    }

    /* ---- 一、念给 ta 听 ---- */
    const sayBox = LP.el('div', { class: 'duo-section' });
    sayBox.appendChild(LP.el('div', { class: 'mono duo-sec-title', text: '念给 ta 听（你手里的东西）' }));
    const sayList = LP.el('div', { class: 'duo-list', 'data-role': 'say' });
    sayBox.appendChild(sayList);
    panel.appendChild(sayBox);

    /* ---- 二、记下 ta 说的 ---- */
    const hearBox = LP.el('div', { class: 'duo-section' });
    hearBox.appendChild(LP.el('div', { class: 'mono duo-sec-title', text: '记下 ta 说的（你听到的东西）' }));
    const hearList = LP.el('div', { class: 'duo-list', 'data-role': 'hear' });
    hearBox.appendChild(hearList);
    panel.appendChild(hearBox);

    /* ---- 三、兜底碎片码（折叠） ---- */
    const fb = LP.el('details', { class: 'duo-fallback' });
    fb.appendChild(LP.el('summary', {
      class: 'mono', text: '无法通话时的兜底 · 碎片码（不建议）'
    }));
    panel.appendChild(fb);

    panel.appendChild(LP.el('button', {
      class: 'btn-ghost', text: '挂断', style: 'width:100%;margin-top:.6rem', onclick: close
    }));

    overlay.appendChild(panel);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);

    function close() { LP.audio.click(); overlay.remove(); }
    function redraw() { renderSay(sayList, redraw); renderHear(hearList, redraw); renderFallback(fb); }

    redraw();
    return overlay;
  }

  /* ---------------- 念出区 ---------------- */
  function renderSay(box, redraw) {
    const s = LP.state.get();
    box.innerHTML = '';
    const list = LP.duoScript.sayable(s);
    if (!list.length) {
      box.appendChild(LP.el('div', {
        class: 'dim', text: '你手里暂时没有需要念出去的东西 —— 继续整理档案。',
        style: 'font-size:.75rem;padding:.4rem 0;line-height:1.8'
      }));
      return;
    }
    list.forEach(t => {
      const row = LP.el('div', { class: 'duo-topic', 'data-topic': t.id });
      const head = LP.el('div', { class: 'duo-topic-head' });
      head.appendChild(LP.el('span', { class: 'duo-frag-label', text: t.title }));
      head.appendChild(LP.el('button', {
        class: 'btn-ghost small', text: '展开',
        onclick: function () {
          const body = row.querySelector('.duo-topic-body');
          const open = !body.hidden;
          body.hidden = open;
          this.textContent = open ? '展开' : '收起';
          if (!open) { LP.audio.paper(); speak(t.lines.join(' ')); }
        }
      }));
      row.appendChild(head);

      const body = LP.el('div', { class: 'duo-topic-body', hidden: '' });
      t.lines.forEach(l => body.appendChild(LP.el('p', { class: 'duo-line serif', text: l })));
      const acts = LP.el('div', { class: 'duo-line-acts' });
      if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
        acts.appendChild(LP.el('button', {
          class: 'btn-ghost small', text: '再念一遍',
          onclick: () => speak(t.lines.join(' '))
        }));
      }
      acts.appendChild(LP.el('button', {
        class: 'btn-ghost small', text: '复制台词',
        onclick: function () {
          const txt = t.lines.join('\n');
          (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
            .then(() => { this.textContent = '已复制'; LP.audio.click(); })
            .catch(() => { LP.ui.toast('复制失败 —— 直接念给 ta 听就好。', 'gold'); });
        }
      }));
      body.appendChild(acts);
      row.appendChild(body);
      box.appendChild(row);
    });
  }

  /* ---------------- 听写区 ---------------- */
  function renderHear(box, redraw) {
    const s = LP.state.get();
    box.innerHTML = '';
    const list = LP.duoScript.listenable(s);
    if (!list.length) {
      box.appendChild(LP.el('div', {
        class: 'dim', text: '现在还没有需要记下的东西。',
        style: 'font-size:.75rem;padding:.4rem 0'
      }));
      return;
    }
    list.forEach(t => {
      const done = s.completedPuzzles.includes(t.listen.done);
      const row = LP.el('div', { class: 'duo-topic' + (done ? ' done' : ''), 'data-topic': t.id });
      const head = LP.el('div', { class: 'duo-topic-head' }, [
        LP.el('span', { class: 'duo-frag-label', text: t.title + (done ? '　✓ 已记下' : '') }),
        done ? null : LP.el('span', { class: 'btn-ghost small', text: 'ta 在说了', onclick: function () {
          const body = row.querySelector('.duo-topic-body');
          const open = !body.hidden;
          body.hidden = open;
          this.textContent = open ? 'ta 在说了' : '收起';
          if (!open) LP.audio.paper();
        } })
      ]);
      row.appendChild(head);

      if (done) { box.appendChild(row); return; }

      const body = LP.el('div', { class: 'duo-topic-body', hidden: '' });
      body.appendChild(LP.el('p', { class: 'duo-prompt serif', text: t.listen.prompt }));
      const inp = LP.el('input', {
        class: 'duo-hear-input', type: 'text',
        placeholder: '照你听到的写 —— 不必一字不差', maxlength: '60'
      });
      body.appendChild(inp);
      const msg = LP.el('div', { class: 'duo-msg', hidden: '' });
      body.appendChild(msg);
      const acts = LP.el('div', { class: 'duo-line-acts' });
      acts.appendChild(LP.el('button', {
        class: 'btn-primary small', text: '记下',
        onclick: () => submit(t, inp, msg, redraw)
      }));
      // 两级提示：先只指方向，再点一次才给到接近答案的那一步
      const hintBtn = LP.el('button', {
        class: 'btn-ghost small', text: '没听清，让 ta 再说一遍',
        onclick: function () {
          LP.audio.paper();
          const step2 = hintBtn.dataset.step === '2';
          msg.hidden = false;
          msg.className = 'duo-msg hint';
          if (!step2) {
            msg.textContent = t.listen.hint || '让 ta 把那句话再念一遍，慢一点。';
            hintBtn.dataset.step = '2';
            hintBtn.textContent = '还是没听清';
          } else {
            msg.textContent = t.listen.hint2 || t.listen.hint || '让 ta 换一种说法再讲一次。';
            hintBtn.textContent = '再让 ta 说一遍';
          }
        }
      });
      acts.appendChild(hintBtn);
      body.appendChild(acts);
      row.appendChild(body);
      box.appendChild(row);
    });
  }

  function submit(t, inp, msg, redraw) {
    const v = (inp.value || '').trim();
    if (!v) { LP.audio.error(); msg.hidden = false; msg.className = 'duo-msg bad'; msg.textContent = '先写下你听到的内容。'; return; }
    if (!checkAnswer(t, v)) {
      LP.audio.error();
      LP.anim.shake(inp);
      msg.hidden = false; msg.className = 'duo-msg bad';
      msg.textContent = '和 ta 说的好像不一样 —— 让 ta 再念一遍（点下面的按钮可以看提示）。';
      return;
    }
    LP.audio.complete();
    LP.anim.flash();
    LP.state.addTo('completedPuzzles', t.listen.done);
    if (t.listen.apply) t.listen.apply();
    LP.inv.checkDeductions();
    LP.archive.refreshAll();
    redraw();
    if (t.listen.ok) LP.ui.toast(t.listen.ok, 'gold');
    if (t.listen.okLine) LP.ui.narrate([t.listen.okLine]);
  }

  /* ---------------- 兜底：碎片码 ---------------- */
  function renderFallback(box) {
    const s = LP.state.get();
    box.innerHTML = '';
    box.appendChild(LP.el('summary', { class: 'mono', text: '无法通话时的兜底 · 碎片码（不建议）' }));
    box.appendChild(LP.el('p', {
      class: 'dim', text: '只在你们真的没法说话时用。通关所需的一切，都可以靠上面「念 / 记」完成。',
      style: 'font-size:.7rem;line-height:1.8;margin:.4rem 0'
    }));

    /* 可生成的码（合卷 + 兼容旧存档的线索码） */
    const gen = LP.el('div', { class: 'duo-section' });
    gen.appendChild(LP.el('div', { class: 'mono duo-sec-title', text: '生成碎片（交给对方）' }));
    const avail = legacyFragments(s);
    const out = LP.el('textarea', { class: 'duo-code mono', readonly: '', placeholder: '碎片码将显示在这里', rows: '2' });
    if (!avail.length && !s.finalMessage) {
      gen.appendChild(LP.el('div', { class: 'dim', text: '暂无可生成的碎片。', style: 'font-size:.72rem;padding:.3rem 0' }));
    }
    avail.forEach(f => {
      const r = LP.el('div', { class: 'duo-frag-row' });
      r.appendChild(LP.el('span', { class: 'duo-frag-label', text: f.label }));
      r.appendChild(LP.el('button', {
        class: 'btn-ghost small', text: '生成',
        onclick: () => { out.value = LP.fragment.make(f.type, f.payload); LP.audio.complete(); }
      }));
      gen.appendChild(r);
    });
    if (s.finalMessage) {
      const r = LP.el('div', { class: 'duo-frag-row' });
      r.appendChild(LP.el('span', { class: 'duo-frag-label', text: '合卷 · 我的半页' }));
      r.appendChild(LP.el('button', {
        class: 'btn-ghost small', text: '生成',
        onclick: () => { out.value = LP.fragment.make('merge', LP.ending.myMergePayload()); LP.audio.complete(); }
      }));
      gen.appendChild(r);
    }
    gen.appendChild(out);
    gen.appendChild(LP.el('button', {
      class: 'btn-ghost small', text: '复制',
      onclick: function () {
        if (!out.value) return;
        (navigator.clipboard ? navigator.clipboard.writeText(out.value) : Promise.reject())
          .then(() => { this.textContent = '已复制'; })
          .catch(() => { out.select(); document.execCommand && document.execCommand('copy'); this.textContent = '已复制'; });
      }
    }));
    box.appendChild(gen);

    const inBox = LP.el('div', { class: 'duo-section' });
    inBox.appendChild(LP.el('div', { class: 'mono duo-sec-title', text: '拼入碎片（来自对方）' }));
    const inpEl = LP.el('textarea', { class: 'duo-code mono', placeholder: '粘贴对方给你的碎片码（LP1.…）', rows: '2' });
    inBox.appendChild(inpEl);
    inBox.appendChild(LP.el('button', {
      class: 'btn-primary', text: '拼入', style: 'width:100%;margin-top:.5rem',
      onclick: () => applyFragment(inpEl.value, inpEl)
    }));
    box.appendChild(inBox);
  }

  /* 旧版线索码：仅为兼容保留，已不再是通关必需 */
  function legacyFragments(s) {
    const list = [];
    if (s.mode === 'B') {
      if (s.discoveredEvidence.includes('clue_317'))
        list.push({ type: 'photo_317', label: '折痕里的符号（3-17）', payload: { v: '3-17' } });
      if (s.completedPuzzles.includes('bell7'))
        list.push({ type: 'bell_done', label: '七声钟响（钟楼）', payload: { v: 7 } });
      if (s.completedPuzzles.includes('board_row7'))
        list.push({ type: 'row7_name', label: '公告栏第七行的名字', payload: { v: '周宁' } });
      if (s.completedPuzzles.includes('clocktower_door'))
        list.push({ type: 'weather_0318', label: '门缝信件的内容', payload: { v: 'rain' } });
    }
    if (s.mode === 'A') {
      if (s.discoveredDocuments.includes('diary_21'))
        list.push({ type: 'diary21', label: '日记·其二十一（3月17日钟楼）', payload: { v: '0317' } });
      if (s.discoveredDocuments.includes('diary_24'))
        list.push({ type: 'weather_0317', label: '日记里的「天气很好」', payload: { v: 'sun' } });
    }
    return list;
  }

  /* 应用碎片码（兜底通道；效果与听写等价） */
  function applyFragment(code, inpEl) {
    const r = LP.fragment.parse(code);
    if (!r) { LP.audio.error(); LP.ui.toast('无法识别的碎片码', 'red'); return; }
    if (r.error === 'self') { LP.audio.error(); LP.ui.toast('这是你自己生成的碎片——它属于对方。', 'red'); return; }

    const s = LP.state.get();
    let ok = false;

    switch (r.type) {
      case 'photo_317':
        if (s.mode !== 'A') break;
        LP.state.addTo('completedPuzzles', 'duo_crease');
        LP.ui.narrate(['碎片在你的掌心展开。', '「像是三，又像是一和七挨在一起。」', '你翻开日记·其二十一——三月十七日，钟楼。', '对上了。']);
        ok = true; break;
      case 'diary21':
        if (s.mode !== 'B') break;
        LP.state.addTo('completedPuzzles', 'duo_diary21');
        LP.state.addTo('discoveredDocuments', 'diary_21');
        ok = true; break;
      case 'bell_done':
        if (s.mode !== 'A') break;
        LP.state.addTo('completedPuzzles', 'bell7');
        LP.inv.discoverClue('clue_717');
        ok = true; break;
      case 'row7_name':
        if (s.mode !== 'A') break;
        LP.inv.discoverClue('clue_zhou_name');
        ok = true; break;
      case 'weather_0318':
        if (s.mode !== 'A') break;
        LP.state.addTo('unlockedDocs', 'letter_02');
        LP.state.addTo('completedPuzzles', 'duo_letter02_tail');
        LP.bus.emit('refresh');
        ok = true; break;
      case 'weather_0317':
        if (s.mode !== 'B') break;
        LP.state.addTo('discoveredDocuments', 'diary_24');
        ok = true; break;
      case 'merge':
        if (LP.ending && LP.ending.applyMerge) {
          LP.ending.applyMerge(LP.ending.toMergeData(r.data));
          ok = true;
        }
        break;
    }

    if (ok) {
      LP.audio.complete();
      LP.anim.flash();
      if (inpEl) inpEl.value = '';
      LP.inv.checkDeductions();
      LP.archive.refreshAll();
      const overlay = LP.$('.duo-overlay');
      overlay && overlay.remove();
    } else {
      LP.audio.error();
      LP.ui.toast('这个碎片现在用不上——也许还没到对应的情节。', 'red');
    }
  }

  function init() {
    const btn = LP.$('#btn-duo');
    btn && btn.addEventListener('click', () => { LP.audio.click(); openPanel(); });
  }

  return { openPanel, applyFragment, init, checkAnswer, speak, norm };
})();
