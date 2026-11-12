/* ===== Âm thanh tổng hợp bằng WebAudio (không cần file mp3) ===== */
(function () {
  'use strict';
  const G = window.G;
  const A = (G.audio = {
    ctx: null, master: null, sfx: null, mus: null, noiseBuf: null, voices: 0, last: {}, musicOn: false, timer: 0, step: 0, nextT: 0,
  });

  A.unlocked = false; A.live = []; A.onState = null; A.rebuilds = 0;
  let lastCT = 0, lastReal = 0, stall = 0, lastOk = null, keep = null;

  A.init = function () {
    if (A.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    let c; try { c = new AC({ latencyHint: 'interactive' }); } catch (e) { try { c = new AC(); } catch (e2) { return; } }
    A.ctx = c; A.live.length = 0; A.voices = 0; A.musicOn = false; A.last = {};
    A.master = c.createGain(); A.sfx = c.createGain(); A.mus = c.createGain();
    const comp = c.createDynamicsCompressor();
    A.sfx.connect(A.master); A.mus.connect(A.master); A.master.connect(comp); comp.connect(c.destination);
    const len = c.sampleRate; A.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = A.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.applyVol();
    c.onstatechange = () => { notify(); if (c.state !== 'running') kick(); };
    lastCT = 0; lastReal = performance.now(); stall = 0;
    if (G.settings.music) A.startMusic();
  };

  // iPhone: công tắc im lặng làm tắt WebAudio → phát 1 thẻ <audio> câm để chuyển sang kênh "playback"
  function unlockIOS() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { }
    if (keep) { if (keep.paused) keep.play().catch(() => { }); return; }
    try {
      const n = 800, b = new Uint8Array(44 + n * 2), v = new DataView(b.buffer), w = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
      let bin = ''; for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
      keep = document.createElement('audio'); keep.src = 'data:audio/wav;base64,' + btoa(bin); keep.loop = true; keep.setAttribute('playsinline', ''); keep.volume = 0.01;
      keep.play().catch(() => { });
    } catch (e) { }
  }

  function notify() { const r = !!(A.ctx && A.ctx.state === 'running'); if (r !== lastOk) { lastOk = r; if (A.onState) A.onState(r); } }
  function kick() { try { const p = A.ctx && A.ctx.resume(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }

  A.resume = function () {
    A.init(); unlockIOS();
    if (A.ctx && A.ctx.state !== 'running') kick();
    if (A.ctx && A.ctx.state === 'running') A.unlocked = true;
    notify();
  };
  // tạo lại toàn bộ bộ âm thanh (khi context đóng/treo cứng)
  A.rebuild = function () {
    A.rebuilds++; A.stopMusic();
    const old = A.ctx; A.ctx = null; try { old && old.close && old.close().catch(() => { }); } catch (e) { }
    A.init(); kick(); notify();
  };
  A.applyVol = function () {
    if (!A.ctx) return;
    const s = G.settings;
    A.master.gain.value = s.vol; A.sfx.gain.value = s.sfxVol; A.mus.gain.value = s.musicVol * 0.5 * (A.duckLvl || 1);
  };

  // Giám sát mỗi giây: tự bật lại khi bị treo, phát hiện đồng hồ âm thanh đứng yên → tạo lại context
  setInterval(function () {
    const c = A.ctx; if (!c) return;
    if (c.state === 'closed') { A.rebuild(); return; }
    if (c.state !== 'running') { if (!document.hidden) kick(); notify(); stall = 0; lastCT = c.currentTime; lastReal = performance.now(); return; }
    const now = performance.now();
    if (c.currentTime - lastCT < 0.01 && now - lastReal > 1500) { if (++stall >= 3) { stall = 0; A.rebuild(); return; } kick(); }
    else stall = 0;
    lastCT = c.currentTime; lastReal = now;
    // dọn bộ đếm giọng đã kết thúc (phòng khi onended không bắn)
    const ct = c.currentTime; while (A.live.length && A.live[0] <= ct) A.live.shift(); A.voices = A.live.length;
    notify();
  }, 1000);
  const wake = () => { if (A.ctx && !document.hidden) { kick(); if (G.settings.music && !A.musicOn) A.startMusic(); } };
  document.addEventListener('visibilitychange', wake); window.addEventListener('focus', wake); window.addEventListener('pageshow', wake);

  function ok(name, gap) {
    if (!A.ctx || A.ctx.state !== 'running') return false;
    const t = performance.now();
    if (t - (A.last[name] || 0) < gap) return false;
    const ct = A.ctx.currentTime; while (A.live.length && A.live[0] <= ct) A.live.shift();
    if (A.live.length > 26) return false;
    A.last[name] = t; return true;
  }
  function tone(f, d, type, v, f2, delay, dest) {
    const c = A.ctx, t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v || 0.2, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(dest || A.sfx); o.start(t); o.stop(t + d + 0.02);
    A.live.push(t + d + 0.03); A.live.sort((a, b) => a - b);
  }
  function noise(d, v, f, type, f2, delay) {
    const c = A.ctx, t = c.currentTime + (delay || 0);
    const s = c.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true;
    const flt = c.createBiquadFilter(); flt.type = type || 'lowpass'; flt.frequency.setValueAtTime(f, t);
    if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + d);
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(flt); flt.connect(g); g.connect(A.sfx); s.start(t, Math.random()); s.stop(t + d + 0.02);
    A.live.push(t + d + 0.03); A.live.sort((a, b) => a - b);
  }

  const S = {
    spawn() { if (ok('spawn', 45)) tone(520, 0.09, 'sine', 0.1, 840); },
    sword() { if (ok('sword', 70)) noise(0.06, 0.12, 3500, 'highpass'); },
    arrow() { if (ok('arrow', 60)) tone(1000, 0.07, 'triangle', 0.07, 450); },
    bullet() { if (ok('bullet', 50)) { noise(0.04, 0.1, 2200, 'bandpass'); } },
    shell() { if (ok('shell', 90)) { noise(0.18, 0.25, 900, 'lowpass', 200); tone(120, 0.15, 'square', 0.1, 50); } },
    hit() { if (ok('hit', 55)) tone(180, 0.05, 'square', 0.05, 90); },
    die() { if (ok('die', 60)) tone(330, 0.12, 'sawtooth', 0.05, 80); },
    boom(sz) { if (ok('boom', 90)) { sz = sz || 1; noise(0.35 + 0.3 * sz, 0.4, 1400, 'lowpass', 90); tone(90, 0.3 + 0.2 * sz, 'sine', 0.35, 30); } },
    laser() { if (ok('laser', 120)) tone(260, 0.16, 'sawtooth', 0.05, 900); },
    laserOn() { if (ok('laserOn', 200)) { tone(200, 0.5, 'sawtooth', 0.14, 1400); noise(0.4, 0.1, 600, 'highpass'); } },
    place() { if (ok('place', 100)) { tone(180, 0.18, 'square', 0.14, 120); noise(0.15, 0.15, 500, 'lowpass'); } },
    dragon() { if (ok('dragon', 300)) { noise(1.2, 0.18, 500, 'bandpass', 150); tone(110, 1.0, 'sawtooth', 0.12, 70); } },
    nukeWarn() { if (ok('nukeWarn', 200)) { for (let i = 0; i < 4; i++) tone(880, 0.1, 'square', 0.1, 0, i * 0.35); } },
    join() { if (ok('join', 120)) { tone(523, 0.1, 'triangle', 0.14); tone(659, 0.1, 'triangle', 0.14, 0, 0.08); tone(784, 0.14, 'triangle', 0.14, 0, 0.16); } },
    big() { if (ok('big', 200)) { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'square', 0.09, 0, i * 0.07)); } },
    crate() { if (ok('crate', 120)) { tone(700, 0.08, 'sine', 0.15, 1400); tone(1400, 0.15, 'sine', 0.12, 2000, 0.07); } },
    tick() { if (ok('tick', 80)) tone(880, 0.1, 'square', 0.1); },
    go() { if (ok('go', 80)) { tone(660, 0.35, 'square', 0.14); tone(1320, 0.35, 'square', 0.1, 0, 0.0); } },
    click() { if (ok('click', 40)) tone(700, 0.04, 'square', 0.06); },
    capture() { if (ok('capture', 100)) tone(440, 0.05, 'sine', 0.03, 600); },
    top10(rank) {
      if (!ok('top10', 400)) return;
      const base = rank === 1 ? 392 : 330;
      [0, 4, 7, 12, 16, 19].forEach((n, i) => tone(base * Math.pow(2, n / 12), 0.35, 'sawtooth', 0.07, 0, i * 0.09));
      noise(0.8, 0.15, 800, 'highpass', 4000);
      if (rank <= 3) tone(base * 2, 1, 'triangle', 0.12, base * 4, 0.5);
    },
    swoosh() { if (ok('swoosh', 150)) { noise(0.55, 0.2, 300, 'bandpass', 5000); tone(300, 0.5, 'sine', 0.06, 1400); } },
    impact() { if (ok('impact', 120)) { tone(90, 0.7, 'sine', 0.55, 28); noise(0.45, 0.4, 2400, 'lowpass', 90); tone(180, 0.25, 'square', 0.12, 60); } },
    hook() {   // riser 5.2s → cú đập bass → hợp âm
      if (!A.ctx || A.ctx.state !== 'running') return;
      noise(5.2, 0.28, 250, 'highpass', 8000); tone(98, 5.2, 'sawtooth', 0.1, 784); tone(147, 5.2, 'triangle', 0.1, 1175);
      for (let i = 0; i < 10; i++) tone(70, 0.12, 'sine', 0.2, 50, 3.2 + i * 0.2);
      tone(60, 1.6, 'sine', 0.7, 24, 5.4); noise(1.4, 0.55, 3500, 'lowpass', 70, 5.4);
      [0, 7, 12, 16].forEach(n => tone(196 * Math.pow(2, n / 12), 1.8, 'sawtooth', 0.09, 0, 5.4));
    },
    topfx(rank) {
      if (!A.ctx || A.ctx.state !== 'running') return; rank = rank || 10;
      const base = rank === 1 ? 262 : rank === 2 ? 330 : rank === 3 ? 294 : 220 + rank * 12, sc = rank <= 3 ? [0, 4, 7, 12, 16, 19, 24] : [0, 3, 7, 10, 12];
      sc.forEach((n, i) => { tone(base * Math.pow(2, n / 12), 0.5, rank === 1 ? 'square' : 'sawtooth', 0.07, 0, i * 0.11); tone(base * Math.pow(2, n / 12) / 2, 0.5, 'triangle', 0.1, 0, i * 0.11); });
      tone(55, 1.2, 'sine', 0.6, 25, 0.1); noise(1.2, 0.35, 900, 'highpass', 7000, 0.2);
      if (rank <= 3) { tone(base * 4, 1.4, 'triangle', 0.12, base * 8, 0.8); noise(0.8, 0.2, 3000, 'highpass', 8000, 0.8); }
    },
    tele() {
      if (!A.ctx || A.ctx.state !== 'running') return;
      tone(180, 1.1, 'sawtooth', 0.09, 1600); noise(1.0, 0.2, 400, 'bandpass', 6000); tone(1200, 0.12, 'sine', 0.12, 0, 1.15); tone(1800, 0.12, 'sine', 0.1, 0, 1.3);
      tone(65, 0.9, 'sine', 0.5, 30, 1.2); noise(0.6, 0.3, 1800, 'lowpass', 120, 1.2);
    },
    gift3d(tier) {
      if (!A.ctx || A.ctx.state !== 'running') return; tier = tier || 1;
      tone(220, 0.9, 'sawtooth', 0.08, 1100); noise(0.8, 0.18, 500, 'bandpass', 5000);
      tone(70, 0.9, 'sine', 0.55, 26, 0.8); noise(0.7, 0.32, 2800, 'lowpass', 90, 0.8);
      [0, 7, 12, tier > 2 ? 19 : 16].forEach((n, i) => tone(330 * Math.pow(2, n / 12), 0.5, 'square', 0.08, 0, 0.85 + i * 0.08));
    },
    baseBoom() { if (!A.ctx || A.ctx.state !== 'running') return; tone(55, 1.6, 'sine', 0.7, 22); noise(1.8, 0.5, 2200, 'lowpass', 60); tone(300, 1.2, 'sawtooth', 0.08, 40); },
    win() {
      if (!A.ctx || A.ctx.state !== 'running') return;
      [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => { tone(f, 0.3, 'square', 0.1, 0, i * 0.14); tone(f / 2, 0.3, 'triangle', 0.12, 0, i * 0.14); });
      noise(1.5, 0.15, 1000, 'highpass', 6000, 0.6);
    },
  };
  A.play = function (n, a) { try { if (S[n]) S[n](a); } catch (e) { } };

  /* ---- nhạc nền đơn giản: bass + arpeggio + trống ---- */
  const CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // Am F C G
  const mf = n => 440 * Math.pow(2, (n - 69) / 12);
  function sched() {
    if (!A.ctx || !A.musicOn) return;
    const bpm = 132, st = 60 / bpm / 2;
    if (A.ctx.state !== 'running') return;
    if (A.nextT < A.ctx.currentTime - 0.3) A.nextT = A.ctx.currentTime + 0.05;   // trễ quá lâu → bỏ qua, đồng bộ lại
    while (A.nextT < A.ctx.currentTime + 0.25) {
      const s = A.step, ch = CH[(s >> 4) & 3], t = A.nextT - A.ctx.currentTime;
      const arp = ch[(s % 3)] + (s % 8 > 3 ? 12 : 0);
      tone(mf(arp + 12), st * 0.9, 'triangle', 0.18, 0, Math.max(0, t), A.mus);
      if (s % 4 === 0) tone(mf(ch[0] - 12), st * 3.5, 'sawtooth', 0.22, 0, Math.max(0, t), A.mus);
      if (s % 4 === 0) { tone(120, 0.12, 'sine', 0.5, 40, Math.max(0, t), A.mus); }
      if (s % 2 === 1) { const c = A.ctx, tt = c.currentTime + Math.max(0, t); const sr = c.createBufferSource(); sr.buffer = A.noiseBuf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const g = c.createGain(); g.gain.setValueAtTime(0.12, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.04); sr.connect(f); f.connect(g); g.connect(A.mus); sr.start(tt, Math.random()); sr.stop(tt + 0.05); }
      A.nextT += st; A.step++;
    }
  }
  /* ---- Nhạc nền từ file (nhac_game.mp3) + đoạn cao trào (stinger) ----
     Phân tích file: ~142 nhịp/phút; dựng dần ở 8s → drop 13.9s; hạ nhịp 41.6s → dựng lại 48s → drop 55.1s; lên cao trào 82s; kết 108.9s.
     Mỗi hiệu ứng (hook, top, tele zoom…) "nhảy" tới đúng đoạn có drop rồi nhạc nền chạy tiếp từ chỗ đang dở. */
  A.buf = null; A.musicState = 'idle'; A.trk = null; A.sting = null; A.stingId = 0; A.duckLvl = 1; A.pausedPos = 0;
  const LOOP_A = 0, LOOP_B = 108.9;
  A.SEG = {                       // [bắt đầu (s), độ dài (s)]
    hook: [8.55, 8.6],            // dựng ~5.4s rồi drop
    top1: [51.4, 8.6], top2: [79.2, 6.6], top3: [19.2, 6.0],
    top4: [27.0, 4.6], top5: [31.0, 4.6], top6: [35.4, 4.6], top7: [60.0, 4.6], top8: [64.2, 4.6], top9: [68.4, 4.6], top10: [96.0, 4.6],
    tele: [44.6, 7.2],            // dựng tới cú bật ở 47.9s
    gift: [13.5, 3.8], gift2: [54.7, 4.4], gift3: [81.2, 5.0],
    base: [40.6, 4.0],            // nhạc "sụp" ở 41.6s
  };
  A.loadMusic = function () {
    if (A.musicState !== 'idle') return; A.musicState = 'loading';
    const dec = ab => new Promise((res, rej) => {
      const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OC) { rej(); return; }
      const oc = new OC(2, 44100, 44100), p = oc.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej);
    });
    const get = window.GL_MUSIC_B64
      ? Promise.resolve().then(() => { const bin = atob(window.GL_MUSIC_B64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; })
      : fetch('nhac_game.mp3').then(r => { if (!r.ok) throw new Error('404'); return r.arrayBuffer(); })
        .catch(() => fetch('nh%E1%BA%A1c_game.mp3').then(r => { if (!r.ok) throw new Error('404'); return r.arrayBuffer(); }));
    get.then(dec).then(b => { A.buf = b; A.musicState = 'ready'; if (A.onMusic) A.onMusic(); A.musicMode(); })
      .catch(() => { A.musicState = 'none'; if (A.onMusic) A.onMusic(); });
  };
  const ctxOK = () => !!(A.ctx && A.ctx.state === 'running');
  function trkStop(fade) {
    const k = A.trk; if (!k) return; A.trk = null; fade = fade || 0.15;
    try { const t = A.ctx.currentTime; k.g.gain.cancelScheduledValues(t); k.g.gain.setValueAtTime(Math.max(0.0001, k.g.gain.value), t); k.g.gain.linearRampToValueAtTime(0.0001, t + fade); k.s.stop(t + fade + 0.05); } catch (e) { }
  }
  function trkStart(offset, fade) {
    if (!ctxOK() || !A.buf) return; trkStop(0.05);
    const c = A.ctx, s = c.createBufferSource(), g = c.createGain(), t = c.currentTime;
    s.buffer = A.buf; s.loop = true; s.loopStart = LOOP_A; s.loopEnd = Math.min(LOOP_B, A.buf.duration);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + (fade || 0.3));
    s.connect(g); g.connect(A.mus); s.start(t, Math.max(0, offset || 0) % s.loopEnd);
    A.trk = { s, g, t0: t, off: offset || 0 };
  }
  A.trkPos = function () {
    const k = A.trk; if (!k || !A.ctx) return A.pausedPos || 0;
    let p = k.off + (A.ctx.currentTime - k.t0); const e = Math.min(LOOP_B, A.buf ? A.buf.duration : LOOP_B);
    if (p > e) p = LOOP_A + ((p - LOOP_A) % (e - LOOP_A)); return p;
  };
  A.useFile = () => G.settings.musicFile !== false && !!A.buf;
  function applyDuck(rt) {
    if (!A.ctx || !A.mus) return; const g = A.mus.gain, t = A.ctx.currentTime;
    try { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(Math.max(0.0001, G.settings.musicVol * 0.5 * A.duckLvl), t + rt); } catch (e) { }
  }
  A.duck = function (lvl) { if (A.duckLvl === lvl) return; A.duckLvl = lvl; applyDuck(0.15); };       // MC đang nói → hạ nhạc
  A.unduck = function () { if (A.duckLvl === 1) return; A.duckLvl = 1; applyDuck(0.6); };
  function stopSting(fade) {
    const s = A.sting; if (!s) return; A.sting = null;
    try { const t = A.ctx.currentTime; s.g.gain.cancelScheduledValues(t); s.g.gain.setValueAtTime(Math.max(0.0001, s.g.gain.value), t); s.g.gain.linearRampToValueAtTime(0.0001, t + (fade || 0.15)); s.s.stop(t + (fade || 0.15) + 0.05); } catch (e) { }
  }
  // Phát đoạn cao trào theo tên. Trả về độ dài (giây) — 0 nếu không phát được.
  A.stinger = function (name, o) {
    o = o || {}; if (!ctxOK()) return 0;
    const seg = A.SEG[name];
    if (!A.useFile() || !seg) {       // không có file nhạc → âm tổng hợp
      const m = /^top(\d+)$/.exec(name), map = { hook: 'hook', tele: 'tele', base: 'baseBoom', gift: 'gift3d', gift2: 'gift3d', gift3: 'gift3d' };
      if (m) A.play('topfx', +m[1]); else if (map[name]) A.play(map[name], o.tier);
      return name === 'hook' ? 7.5 : name === 'tele' ? 2.6 : 2.5;
    }
    const c = A.ctx, t = c.currentTime, dur = seg[1], withMusic = G.settings.music;
    if (!A.sting && A.trk) A.pausedPos = A.trkPos(); else if (A.sting) stopSting(0.06);
    if (withMusic) trkStop(0.1);
    const s = c.createBufferSource(), g = c.createGain(), lvl = o.gain || 1.25;
    s.buffer = A.buf; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(lvl, t + 0.04);
    g.gain.setValueAtTime(lvl, t + dur - 0.55); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(g); g.connect(withMusic ? A.mus : A.sfx); s.start(t, seg[0], dur + 0.05);
    const id = ++A.stingId; A.sting = { s, g, id };
    setTimeout(() => { if (A.sting && A.sting.id === id) { A.sting = null; if (A.musicOn && ctxOK() && A.useFile()) trkStart(A.pausedPos, 0.6); } }, dur * 1000 + 60);
    return dur;
  };
  A.musicMode = function () {          // đổi giữa nhạc file / nhạc tổng hợp
    if (!A.ctx) return; A.stopMusic(); if (G.settings.music) A.startMusic();
  };
  A.startMusic = function () {
    if (!A.ctx || A.musicOn) return;
    A.musicOn = true;
    if (A.useFile()) { trkStart(A.pausedPos || 0, 0.8); return; }
    A.nextT = A.ctx.currentTime + 0.1; clearInterval(A.timer); A.timer = setInterval(sched, 60);
  };
  A.stopMusic = function () { A.musicOn = false; clearInterval(A.timer); stopSting(0.1); trkStop(0.3); };
  A.loadMusic();
})();
