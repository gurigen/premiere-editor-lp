// ============================================================
// 会話ウィンドウ ― タイプライター演出とクリック送り
// ============================================================

const box = () => document.getElementById("dialogue");
const textEl = () => document.getElementById("dialogue-text");
const choicesEl = () => document.getElementById("choices");
const hintEl = () => document.getElementById("hint");

let typing = false;
let skipRequested = false;
let advanceResolver = null;

// 喋り始め/終わりのフック(占い師のモーションや音と連動)
export const hooks = {
  onSpeakStart: null,
  onSpeakTick: null, // 数文字ごと
  onSpeakEnd: null,
};

export function initDialogue() {
  const el = box();
  el.addEventListener("click", advance);
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "Enter") {
      if (!box().classList.contains("hidden")) {
        e.preventDefault();
        advance();
      }
    }
  });
}

function advance() {
  if (typing) {
    skipRequested = true;
  } else if (advanceResolver) {
    const r = advanceResolver;
    advanceResolver = null;
    box().classList.remove("awaiting");
    r();
  }
}

/** セリフを一つ表示し、クリック送りを待つ */
export function say(text, opts = {}) {
  const { charDelay = 42, autoAdvanceMs = 0 } = opts;
  return new Promise(async (resolve) => {
    const el = box();
    el.classList.remove("hidden", "awaiting");
    const t = textEl();
    t.textContent = "";
    typing = true;
    skipRequested = false;
    if (hooks.onSpeakStart) hooks.onSpeakStart(text);

    const chars = Array.from(text);
    for (let i = 0; i < chars.length; i++) {
      if (skipRequested) {
        t.textContent = text;
        break;
      }
      t.textContent += chars[i];
      if (hooks.onSpeakTick && i % 3 === 0) hooks.onSpeakTick();
      // 句読点で少し溜める
      const ch = chars[i];
      const delay = "、。……!?".includes(ch) ? charDelay * 4 : charDelay;
      await new Promise((r) => setTimeout(r, delay));
    }

    typing = false;
    skipRequested = false;
    if (hooks.onSpeakEnd) hooks.onSpeakEnd();

    if (autoAdvanceMs > 0) {
      setTimeout(() => {
        box().classList.remove("awaiting");
        resolve();
      }, autoAdvanceMs);
    } else {
      el.classList.add("awaiting");
      advanceResolver = resolve;
    }
  });
}

/** 連続したセリフをまとめて再生 */
export async function sayAll(lines, opts = {}) {
  for (const line of lines) await say(line, opts);
}

export function hideDialogue() {
  box().classList.add("hidden");
  box().classList.remove("awaiting");
}

/** 選択肢を表示して選ばれたキーを返す */
export function choose(options) {
  return new Promise((resolve) => {
    const wrap = choicesEl();
    wrap.innerHTML = "";
    for (const { key, label } of options) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice-btn";
      btn.textContent = label;
      btn.addEventListener("click", () => {
        wrap.classList.add("hidden");
        wrap.innerHTML = "";
        resolve(key);
      });
      wrap.appendChild(btn);
    }
    wrap.classList.remove("hidden");
  });
}

export function showHint(text) {
  const el = hintEl();
  el.textContent = text;
  el.classList.remove("hidden");
}

export function hideHint() {
  hintEl().classList.add("hidden");
}
