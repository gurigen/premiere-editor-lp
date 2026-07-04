// ============================================================
// 軽量トゥイーン・ユーティリティ
//   time ベースで update(now) を呼ぶだけの依存ゼロ実装。
// ============================================================

export const Ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => t * (2 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  inCubic: (t) => t * t * t,
  outCubic: (t) => --t * t * t + 1,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  outQuart: (t) => 1 - --t * t * t * t,
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

let tweens = [];

/**
 * 値オブジェクトの数値プロパティを補間する。
 * tween(obj, { x: 1, y: 2 }, 800, Ease.outCubic, { delay, onUpdate, onComplete })
 * 戻り値は Promise(完了時 resolve)。
 */
export function tween(target, to, duration, ease = Ease.inOutCubic, opts = {}) {
  return new Promise((resolve) => {
    const entry = {
      target,
      keys: Object.keys(to),
      from: {},
      to,
      duration: Math.max(1, duration),
      ease,
      delay: opts.delay || 0,
      onUpdate: opts.onUpdate || null,
      started: false,
      startTime: 0,
      resolve,
      onComplete: opts.onComplete || null,
      cancelled: false,
    };
    tweens.push(entry);
  });
}

/** 対象オブジェクトに紐づくトゥイーンを打ち切る(値はその場に留まる)。 */
export function killTweens(target) {
  for (const tw of tweens) {
    if (tw.target === target) tw.cancelled = true;
  }
}

export function killAllTweens() {
  for (const tw of tweens) tw.cancelled = true;
}

/** 毎フレーム呼び出す。now は performance.now() ミリ秒。 */
export function updateTweens(now) {
  if (tweens.length === 0) return;
  const survivors = [];
  for (const tw of tweens) {
    if (tw.cancelled) { tw.resolve(); continue; }
    if (!tw.started) {
      tw.started = true;
      tw.startTime = now + tw.delay;
      for (const k of tw.keys) tw.from[k] = tw.target[k];
    }
    if (now < tw.startTime) { survivors.push(tw); continue; }
    const t = Math.min(1, (now - tw.startTime) / tw.duration);
    const e = tw.ease(t);
    for (const k of tw.keys) {
      tw.target[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
    }
    if (tw.onUpdate) tw.onUpdate(e, t);
    if (t >= 1) {
      if (tw.onComplete) tw.onComplete();
      tw.resolve();
    } else {
      survivors.push(tw);
    }
  }
  tweens = survivors;
}

/** ms 待つ Promise(トゥイーン時計と同じ rAF 駆動)。 */
export function wait(ms) {
  return tween({ v: 0 }, { v: 1 }, ms, Ease.linear);
}
