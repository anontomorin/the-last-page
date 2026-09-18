/* Web Audio 程序化音效 —— 不依赖任何音频文件 */
window.LP = window.LP || {};
LP.audio = (function () {
  let ctx = null;
  let enabled = true;

  function ac() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { enabled = false; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, when, slideTo) {
    const c = ac(); if (!c || !enabled) return;
    const t0 = c.currentTime + (when || 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, when, freq) {
    const c = ac(); if (!c || !enabled) return;
    const t0 = c.currentTime + (when || 0);
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200;
    const g = c.createGain(); g.gain.value = vol || 0.08;
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(t0);
  }

  return {
    click()   { tone(1600, 0.05, 'square', 0.03); },
    open()    { noise(0.25, 0.10, 0, 900); tone(520, 0.18, 'sine', 0.05, 0.02, 780); },
    paper()   { noise(0.35, 0.09, 0, 1600); },
    unlock()  { tone(440, 0.12, 'sine', 0.07); tone(660, 0.14, 'sine', 0.07, 0.1); tone(880, 0.22, 'sine', 0.08, 0.2); },
    clock()   { tone(196, 0.9, 'sine', 0.16, 0, 180); tone(392, 0.5, 'sine', 0.05, 0, 370); },
    error()   { tone(220, 0.18, 'sawtooth', 0.05); tone(180, 0.25, 'sawtooth', 0.05, 0.12); },
    write()   { noise(0.08, 0.05, 0, 2400); },
    complete(){ [523,659,784,1046].forEach((f,i)=>tone(f,0.5,'sine',0.08,i*0.16)); },
    toggle(v) { enabled = v; }
  };
})();
