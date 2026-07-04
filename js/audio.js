// ============================================================
// 音響 ― WebAudio による完全プロシージャル生成
//   外部音源ファイルを使わず、スタジオの環境音と効果音を合成。
//   (宵闇の占い館 audio.js の設計を編集スタジオ向けに移植)
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
    const white = Math.random() * 2 - 1;
    last = last * 0.94 + white * 0.06;
    d[i] = last * 3.2;
  }
  return buf;
}

export function setMuted(v) {
  muted = v;
  if (master) {
    const c = ensureCtx();
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.linearRampToValueAtTime(v ? 0 : 1, c.currentTime + 0.25);
  }
}
export function isMuted() { return muted; }

/** 着地後に流れる、編集スタジオの低い環境音 */
export function startAmbient() {
  const c = ensureCtx();
  stopAmbient();

  // --- 機材の低音ハム(うなりを持つ正弦波群) ---
  const droneGain = c.createGain();
  droneGain.gain.value = 0.0;
  const droneFilter = c.createBiquadFilter();
  droneFilter.type = "lowpass";
  droneFilter.frequency.value = 260;
  droneFilter.connect(droneGain);
  droneGain.connect(master);

  const freqs = [48, 48.7, 96.4, 144.2];
  const gains = [0.045, 0.045, 0.016, 0.006];
  for (let i = 0; i < freqs.length; i++) {
    const o = c.createOscillator();
    o.type = i >= 2 ? "triangle" : "sine";
    o.frequency.value = freqs[i];
    const g = c.createGain();
    g.gain.value = gains[i];
    o.connect(g).connect(droneFilter);
    o.start();
    ambientNodes.push(o, g);
  }
  // ゆっくり満ち引きする LFO
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.06;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 0.22;
  lfo.connect(lfoGain).connect(droneGain.gain);
  lfo.start();
  droneGain.gain.setValueAtTime(0.0001, c.currentTime);
  droneGain.gain.exponentialRampToValueAtTime(0.7, c.currentTime + 5);
  ambientNodes.push(lfo, lfoGain, droneGain, droneFilter);

  // --- 空調のささやき(帯域の動くノイズ) ---
  const air = c.createBufferSource();
  air.buffer = noiseBuffer(4);
  air.loop = true;
  const airBp = c.createBiquadFilter();
  airBp.type = "bandpass";
  airBp.frequency.value = 520;
  airBp.Q.value = 1.4;
  const airGain = c.createGain();
  airGain.gain.value = 0.0;
  const airLfo = c.createOscillator();
  airLfo.frequency.value = 0.045;
  const airLfoGain = c.createGain();
  airLfoGain.gain.value = 0.008;
  airLfo.connect(airLfoGain).connect(airGain.gain);
  airLfo.start();
  air.connect(airBp).connect(airGain).connect(master);
  air.start();
  airGain.gain.setValueAtTime(0.0001, c.currentTime);
  airGain.gain.exponentialRampToValueAtTime(0.014, c.currentTime + 7);
  ambientNodes.push(air, airBp, airGain, airLfo, airLfoGain);
}

export function stopAmbient() {
  for (const n of ambientNodes) {
    try { if (n.stop) n.stop(); n.disconnect(); } catch (e) { /* no-op */ }
  }
  ambientNodes = [];
}

/** UIクリック(小さく乾いた音) */
export function uiClick() {
  const c = ensureCtx();
  const o = c.createOscillator();
  o.type = "square";
  o.frequency.setValueAtTime(1900, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(700, c.currentTime + 0.045);
  const g = c.createGain();
  g.gain.setValueAtTime(0.06, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.07);
  o.connect(g).connect(master);
  o.start(); o.stop(c.currentTime + 0.09);
}

/** レンダリング進行のカチカチ音 */
export function renderTick() {
  const c = ensureCtx();
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(2300 + Math.random() * 500, c.currentTime);
  const g = c.createGain();
  g.gain.setValueAtTime(0.028, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.04);
  o.connect(g).connect(master);
  o.start(); o.stop(c.currentTime + 0.05);
}

/** スクラブ時のごく小さな目盛り音 */
export function scrubTick() {
  const c = ensureCtx();
  const o = c.createOscillator();
  o.type = "triangle";
  o.frequency.setValueAtTime(1500, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(1050, c.currentTime + 0.03);
  const g = c.createGain();
  g.gain.setValueAtTime(0.02, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.045);
  o.connect(g).connect(master);
  o.start(); o.stop(c.currentTime + 0.06);
}

/** ワープ(書き出し)のウーッシュ。duration 秒かけて盛り上がり減衰する */
export function warpWhoosh(duration = 6) {
  const c = ensureCtx();
  const t0 = c.currentTime;

  // 上昇するノイズスイープ
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(Math.ceil(duration + 1));
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 0.9;
  bp.frequency.setValueAtTime(120, t0);
  bp.frequency.exponentialRampToValueAtTime(2600, t0 + duration * 0.55);
  bp.frequency.exponentialRampToValueAtTime(300, t0 + duration);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.34, t0 + duration * 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(bp).connect(g).connect(master);
  src.start(t0); src.stop(t0 + duration + 0.1);

  // 底を支えるサブ・スウェル
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(38, t0);
  o.frequency.exponentialRampToValueAtTime(64, t0 + duration * 0.6);
  o.frequency.exponentialRampToValueAtTime(30, t0 + duration);
  const og = c.createGain();
  og.gain.setValueAtTime(0.0001, t0);
  og.gain.exponentialRampToValueAtTime(0.22, t0 + duration * 0.5);
  og.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  o.connect(og).connect(master);
  o.start(t0); o.stop(t0 + duration + 0.1);
}

/** 着地の和音(柔らかいシンセパッド) */
export function landingChord() {
  const c = ensureCtx();
  const t0 = c.currentTime;
  const freqs = [220, 277.18, 329.63, 440]; // Aメジャー系の明るい響き
  freqs.forEach((f, i) => {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = c.createGain();
    const peak = 0.05 - i * 0.008;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.015), t0 + 0.4 + i * 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.4);
    o.connect(g).connect(master);
    o.start(t0); o.stop(t0 + 3.6);
  });
}

/** ゲート通過のチャイム */
export function gateChime() {
  const c = ensureCtx();
  const t0 = c.currentTime;
  const freqs = [1318.5, 1975.5];
  freqs.forEach((f, i) => {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0 + i * 0.06);
    g.gain.exponentialRampToValueAtTime(0.05 - i * 0.018, t0 + 0.03 + i * 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9 + i * 0.2);
    o.connect(g).connect(master);
    o.start(t0 + i * 0.06); o.stop(t0 + 1.3);
  });
}

/** 書き出し完了のフラッシュ音 */
export function exportHit() {
  const c = ensureCtx();
  const t0 = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(1);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(8000, t0);
  lp.frequency.exponentialRampToValueAtTime(200, t0 + 0.7);
  const g = c.createGain();
  g.gain.setValueAtTime(0.28, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.8);
  src.connect(lp).connect(g).connect(master);
  src.start(t0); src.stop(t0 + 0.9);

  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(880, t0);
  o.frequency.exponentialRampToValueAtTime(440, t0 + 0.5);
  const og = c.createGain();
  og.gain.setValueAtTime(0.09, t0);
  og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
  o.connect(og).connect(master);
  o.start(t0); o.stop(t0 + 0.7);
}
