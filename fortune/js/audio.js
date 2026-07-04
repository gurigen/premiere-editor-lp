// ============================================================
// 音響 ― WebAudio による完全プロシージャル生成
//   外部音源ファイルを一切使わず、環境音と効果音を合成する。
// ============================================================

let ctx = null;
let master = null;
let muted = false;
let ambientNodes = [];

function ensureCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function noiseBuffer(seconds = 2) {
  const c = ensureCtx();
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    // ややピンクノイズ寄りに均す
    const white = Math.random() * 2 - 1;
    last = last * 0.94 + white * 0.06;
    d[i] = last * 3.2;
  }
  return buf;
}

/** 入室時に開始する、低く重い環境音 */
export function startAmbient() {
  const c = ensureCtx();
  stopAmbient();

  // --- 低音ドローン(うなりを持つ2つの正弦波) ---
  const droneGain = c.createGain();
  droneGain.gain.value = 0.0;
  const droneFilter = c.createBiquadFilter();
  droneFilter.type = "lowpass";
  droneFilter.frequency.value = 220;
  droneFilter.connect(droneGain);
  droneGain.connect(master);

  const freqs = [54, 54.6, 108.3];
  const gains = [0.05, 0.05, 0.014];
  for (let i = 0; i < freqs.length; i++) {
    const o = c.createOscillator();
    o.type = i === 2 ? "triangle" : "sine";
    o.frequency.value = freqs[i];
    const g = c.createGain();
    g.gain.value = gains[i];
    o.connect(g).connect(droneFilter);
    o.start();
    ambientNodes.push(o, g);
  }
  // ゆっくり満ち引きする LFO
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.05;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 0.25;
  lfo.connect(lfoGain).connect(droneGain.gain);
  lfo.start();
  droneGain.gain.setValueAtTime(0.0001, c.currentTime);
  droneGain.gain.exponentialRampToValueAtTime(0.85, c.currentTime + 6);
  ambientNodes.push(lfo, lfoGain, droneGain, droneFilter);

  // --- 風のささやき(帯域の動くノイズ) ---
  const wind = c.createBufferSource();
  wind.buffer = noiseBuffer(4);
  wind.loop = true;
  const windBp = c.createBiquadFilter();
  windBp.type = "bandpass";
  windBp.frequency.value = 480;
  windBp.Q.value = 1.6;
  const windGain = c.createGain();
  windGain.gain.value = 0.0;
  const windLfo = c.createOscillator();
  windLfo.frequency.value = 0.09;
  const windLfoGain = c.createGain();
  windLfoGain.gain.value = 260;
  windLfo.connect(windLfoGain).connect(windBp.frequency);
  wind.connect(windBp).connect(windGain).connect(master);
  wind.start();
  windLfo.start();
  windGain.gain.setValueAtTime(0.0001, c.currentTime);
  windGain.gain.exponentialRampToValueAtTime(0.028, c.currentTime + 8);
  ambientNodes.push(wind, windBp, windGain, windLfo, windLfoGain);
}

export function stopAmbient() {
  for (const n of ambientNodes) {
    try { if (n.stop) n.stop(); } catch (e) { /* 既に停止 */ }
    try { n.disconnect(); } catch (e) { /* 未接続 */ }
  }
  ambientNodes = [];
}

/** カードが滑る音 */
export function sfxCardSlide() {
  if (!ctx) return;
  const c = ctx;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(0.3);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.setValueAtTime(1400, c.currentTime);
  f.frequency.exponentialRampToValueAtTime(500, c.currentTime + 0.16);
  f.Q.value = 0.9;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.12, c.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.18);
  src.connect(f).connect(g).connect(master);
  src.start();
  src.stop(c.currentTime + 0.22);
}

/** カードをめくる音 */
export function sfxCardFlip() {
  if (!ctx) return;
  const c = ctx;
  const t0 = c.currentTime;
  for (const [dt, freq, vol] of [[0, 2600, 0.09], [0.07, 1500, 0.13]]) {
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(0.12);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = 2.2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0 + dt);
    g.gain.exponentialRampToValueAtTime(vol, t0 + dt + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.09);
    src.connect(f).connect(g).connect(master);
    src.start(t0 + dt);
    src.stop(t0 + dt + 0.12);
  }
}

/** 神秘的な鐘の音(カード公開・鑑定完了) */
export function sfxChime(base = 660, vol = 0.06) {
  if (!ctx) return;
  const c = ctx;
  const t0 = c.currentTime;
  const partials = [
    [1.0, 1.0], [2.76, 0.42], [5.4, 0.18], [8.9, 0.07],
  ];
  for (const [ratio, amp] of partials) {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = base * ratio;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol * amp, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.6 / ratio);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + 2.8);
  }
}

/** シャッフル中の渦のような音 */
export function sfxSwirl(duration = 1.8) {
  if (!ctx) return;
  const c = ctx;
  const t0 = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(duration + 0.4);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 3.5;
  f.frequency.setValueAtTime(300, t0);
  f.frequency.exponentialRampToValueAtTime(2400, t0 + duration * 0.7);
  f.frequency.exponentialRampToValueAtTime(600, t0 + duration);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.085, t0 + duration * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + duration + 0.1);
}

/** 影の占い師の「声」― 低いささやきの吐息 */
export function sfxWhisper() {
  if (!ctx) return;
  const c = ctx;
  const t0 = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(0.4);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 220 + Math.random() * 160;
  f.Q.value = 5;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.022, t0 + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + 0.35);
}

export function toggleMute() {
  muted = !muted;
  if (master) {
    master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
  }
  return muted;
}

export function isMuted() { return muted; }

export function initAudio() { ensureCtx(); }
