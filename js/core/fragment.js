/* ============================================================
   碎片码系统 —— 双人拼卷的离线信息交换
   ------------------------------------------------------------
   码格式：LP1.<卷>.<类型缩写>.<载荷>
     卷   A / B
     类型 m 合卷  c 折痕  d 日记廿一  b 七声钟  r 第七行  w 门缝信  v 三月十七天气
     载荷 首位标记 + base64url
          标记 z = LZSS 压缩过的 UTF-16 字节流
          标记 r = 未压缩的 UTF-16 字节流
   短码优先：压缩后更短就用压缩的，否则用原文的。
   ============================================================ */
window.LP = window.LP || {};
LP.fragment = (function () {

  /* ---------- 字节 ↔ base64url ---------- */
  function b64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64(str) {
    const s = str.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(s + '==='.slice((s.length + 3) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /* 字符串 ↔ UTF-16BE 字节（中文 2 字节，比 UTF-8 省 1/3） */
  function toBytes(str) {
    const out = new Uint8Array(str.length * 2);
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      out[i * 2] = (c >> 8) & 0xff;
      out[i * 2 + 1] = c & 0xff;
    }
    return out;
  }
  function fromBytes(bytes) {
    let s = '';
    for (let i = 0; i + 1 < bytes.length; i += 2) s += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    return s;
  }

  /* ---------- 轻量 LZSS ---------- */
  const WIN = 4095, MIN_MATCH = 3, MAX_MATCH = 18;

  function lzPack(src) {
    const out = [];
    let flagPos = 0, bitPos = 0;
    out.push(0);
    let i = 0;
    while (i < src.length) {
      let bestLen = 0, bestOff = 0;
      const start = Math.max(0, i - WIN);
      const maxLen = Math.min(MAX_MATCH, src.length - i);
      if (maxLen >= MIN_MATCH) {
        for (let j = i - 1; j >= start; j--) {
          let l = 0;
          while (l < maxLen && src[j + l] === src[i + l]) l++;
          if (l > bestLen) { bestLen = l; bestOff = i - j; if (bestLen === maxLen) break; }
        }
      }
      if (bestLen >= MIN_MATCH) {
        out.push(((bestLen - MIN_MATCH) << 4) | (bestOff >> 8));
        out.push(bestOff & 0xff);
        i += bestLen;
      } else {
        out.push(src[i]);
        out[flagPos] |= (1 << bitPos);
        i++;
      }
      bitPos++;
      if (bitPos === 8) { bitPos = 0; flagPos = out.length; out.push(0); }
    }
    return Uint8Array.from(out);
  }

  function lzUnpack(src) {
    const out = [];
    let p = 0;
    while (p < src.length) {
      const flag = src[p++];
      for (let b = 0; b < 8 && p < src.length; b++) {
        if (flag & (1 << b)) {
          out.push(src[p++]);
        } else {
          if (p + 1 >= src.length) break;
          const hi = src[p++], lo = src[p++];
          const len = (hi >> 4) + MIN_MATCH;
          const off = ((hi & 0x0f) << 8) | lo;
          const from = out.length - off;
          for (let k = 0; k < len; k++) out.push(from + k >= 0 ? out[from + k] : 0);
        }
      }
    }
    return Uint8Array.from(out);
  }

  /* ---------- 载荷编解码（取更短的一种） ---------- */
  function encodePayload(str) {
    const raw = toBytes(str);
    const packed = lzPack(raw);
    return packed.length < raw.length ? 'z' + b64(packed) : 'r' + b64(raw);
  }
  function decodePayload(body) {
    const mark = body[0];
    const bytes = unb64(body.slice(1));
    return fromBytes(mark === 'z' ? lzUnpack(bytes) : bytes);
  }

  /* ---------- 类型缩写 ---------- */
  const T2C = {
    merge: 'm', photo_317: 'c', diary21: 'd', bell_done: 'b',
    row7_name: 'r', weather_0318: 'w', weather_0317: 'v'
  };
  const C2T = {};
  Object.keys(T2C).forEach(k => { C2T[T2C[k]] = k; });

  /* 生成碎片码：合卷用紧凑数组，其余用对象 */
  function make(type, payloadObj) {
    const mode = LP.state.get().mode;
    const text = Array.isArray(payloadObj)
      ? JSON.stringify(payloadObj)
      : JSON.stringify(payloadObj);
    return `LP1.${mode}.${T2C[type] || 'x'}.${encodePayload(text)}`;
  }

  /* 解析碎片码；非法 / 来自自己卷的码返回 null 或 {error:'self'} */
  function parse(code) {
    if (!code || typeof code !== 'string') return null;
    const m = code.trim().replace(/\s+/g, '').match(/^LP1\.([ABab])\.([a-z])\.([A-Za-z0-9\-_]+)$/);
    if (!m) return null;
    const from = m[1].toUpperCase();
    const mine = LP.state.get().mode;
    if (from === mine) return { error: 'self', from, type: C2T[m[2]] || m[2] };
    try {
      return { from, type: C2T[m[2]] || m[2], data: JSON.parse(decodePayload(m[3])) };
    } catch (e) { return null; }
  }

  /* 类型标签（用于交换面板展示） */
  const TYPE_LABEL = {
    photo_317: '折痕里的数字',
    bell_done: '七声钟响',
    row7_name: '公告栏的名字',
    weather_0317: '3月17日的天气',
    weather_0318: '门缝里的那封信',
    merge: '合卷 · 结局补写'
  };

  return { make, parse, TYPE_LABEL, encodePayload, decodePayload };
})();
