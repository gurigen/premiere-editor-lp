// ============================================================
// PREMIERE EDITOR ― Timeline Universe / 演出制御
//   起動 → 書き出しワープ → タイムライン着地 → スクロール走行
//   をワンテイクで繋ぐオーケストレーション。
// ============================================================

import * as THREE from "three";
import { tween, wait, Ease, updateTweens, killAllTweens } from "./tween.js";
import { createWorld } from "./world.js";
import { createWarp } from "./warp.js";
import * as SFX from "./audio.js";

// ---------- 環境判定 ----------

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 820;
const DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);

// ---------- DOM ----------

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const canvas = $("#stage");
const boot = $("#boot");
const bootBtn = $("#boot-btn");
const renderUi = $("#render-ui");
const renderPct = $("#render-pct");
const renderFill = $("#render-fill");
const warpSkip = $("#warp-skip");
const flash = $("#flash");
const fader = $("#fader");
const hud = $("#hud");
const hudTc = $("#hud-tc");
const hudScene = $("#hud-scene");
const scrubFill = $("#scrub-fill");
const scrubCues = $("#scrub-cues");
const muteBtn = $("#mute-btn");

const sceneEls = $$(".scene");

// ---------- WebGL 初期化 ----------

let renderer = null;
let world = null;
let warp = null;

try {
  renderer = new THREE.WebGLRenderer({
    canvas, antialias: !isMobile, alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight);
  world = createWorld(renderer, { mobile: isMobile, reduced });
  warp = createWarp(renderer);
  world.resize(window.innerWidth, window.innerHeight);
} catch (e) {
  document.body.classList.add("no-webgl");
  renderer = null;
}

// ---------- スクロール ↔ 世界のマッピング ----------

const state = {
  started: false,
  landed: false,
  warpActive: false,
  warpT: 0,
  maxScroll: 1,
  scale: 0.02,        // 1px → 世界単位
  muted: localStorage.getItem("pe_muted") === "1",
  lastTickZone: 0,
  lastTickAt: 0,
  prevCamZ: 0,
  gateZs: [],
  gatesHit: [],
};

/** 各シーンのアンカー(シーン中央が画面中央に来るスクロール量) */
function sectionAnchor(el) {
  const vh = window.innerHeight;
  const top = el.offsetTop;
  const h = el.offsetHeight;
  return Math.max(0, top + h / 2 - vh / 2);
}

function relayout() {
  const doc = document.documentElement;
  state.maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 1);

  // 全長が長すぎる時はスケールを絞る(世界の霧の中に収める)
  state.scale = Math.min(0.02, 500 / state.maxScroll);

  const sections = [];
  for (const el of sceneEls) {
    const anchor = sectionAnchor(el);
    const [code, title] = (el.dataset.clip || "SCENE|—").split("|");
    sections.push({
      el, anchor,
      z: -anchor * state.scale - 9,
      code, title,
      name: el.dataset.scene || "",
      cue: el.dataset.cue || "",
    });
  }

  // 3ゲート: STRENGTH → SCHEDULE 間の走行区間に立てる
  const iS = sections.findIndex((s) => s.el.id === "strength");
  const iN = Math.min(iS + 1, sections.length - 1);
  const gateZs = [];
  if (iS >= 0) {
    for (let i = 0; i < 3; i++) {
      const f = 0.3 + i * 0.2;
      gateZs.push(
        sections[iS].z * (1 - f) + sections[iN].z * f - 1.5
      );
    }
  }
  state.gateZs = gateZs;
  state.gatesHit = gateZs.map(() => false);

  const iC = sections.findIndex((s) => s.el.id === "contact");
  const endZ = (iC >= 0 ? sections[iC].z : -state.maxScroll * state.scale) - 4;

  if (world) {
    world.layout({
      sections: sections.map(({ z, code, name, title }) => ({ z, code, name, title })),
      gatesZ: gateZs,
      endZ,
      length: state.maxScroll * state.scale + 24,
    });
  }

  buildScrub(sections);
  return sections;
}

// ---------- HUD ----------

function buildScrub(sections) {
  scrubCues.innerHTML = "";
  for (const s of sections) {
    const b = document.createElement("button");
    b.className = "scrub-cue";
    b.type = "button";
    b.style.left = `${(s.anchor / state.maxScroll) * 100}%`;
    b.innerHTML = `<span>${s.cue}</span><strong>${s.name}</strong>`;
    b.addEventListener("click", () => {
      SFX.uiClick();
      window.scrollTo({ top: s.anchor, behavior: reduced ? "auto" : "smooth" });
    });
    scrubCues.appendChild(b);
    s.cueEl = b;
  }
}

function fmtTc(progress) {
  const sec = progress * 144;
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(Math.floor(sec % 60)).padStart(2, "0");
  const ff = String(Math.floor((sec * 24) % 24)).padStart(2, "0");
  return `${mm}:${ss}:${ff}`;
}

let sections = [];
let activeIdx = -1;

function updateHud(scrollY) {
  const p = Math.min(scrollY / state.maxScroll, 1);
  hudTc.textContent = fmtTc(p);
  scrubFill.style.width = `${p * 100}%`;

  // 現在のシーン
  let idx = 0;
  for (let i = 0; i < sections.length; i++) {
    if (scrollY >= sections[i].anchor - window.innerHeight * 0.5) idx = i;
  }
  if (idx !== activeIdx) {
    activeIdx = idx;
    hudScene.textContent = sections[idx]?.name || "TOP";
    sections.forEach((s, i) => s.cueEl?.classList.toggle("active", i === idx));
  }
}

// ---------- シーン出現 ----------

const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) e.target.classList.add("on");
  }
}, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
// 観測開始は着地後(起動画面の下で発火しないように)

// ---------- 起動 → ワープ → 着地 ----------

async function runRenderBar() {
  renderUi.classList.remove("hidden");
  const o = { v: 0 };
  let lastShown = -1;
  await tween(o, { v: 100 }, reduced ? 400 : 2100, Ease.inOutQuad, {
    onUpdate: () => {
      const v = Math.floor(o.v);
      renderFill.style.width = `${v}%`;
      if (v !== lastShown) {
        renderPct.textContent = `${v}%`;
        if (v % 7 === 0 && !state.muted) SFX.renderTick();
        lastShown = v;
      }
    },
  });
  renderPct.textContent = "100%";
}

async function runWarp() {
  if (!warp || !renderer) return;
  state.warpActive = true;
  state.warpT = 0;
  SFX.exportHit();
  SFX.warpWhoosh(5.2);

  // フラッシュしてトンネルへ
  flash.style.transition = "none";
  flash.style.opacity = "0.9";
  requestAnimationFrame(() => {
    flash.style.transition = "opacity 0.6s ease";
    flash.style.opacity = "0";
  });

  const u = warp.uniforms;
  u.uAlpha.value = 1;
  u.uGrade.value = 0;
  u.uSpeed.value = 0;

  // 加速 → 素材が完成グレードへ変質 → 減速しつつ世界へ溶ける
  tween(u.uSpeed, { value: 1 }, 2000, Ease.inCubic);
  tween(u.uGrade, { value: 1 }, 4200, Ease.inOutSine, { delay: 700 });
  await wait(3900);
  renderUi.classList.add("hidden");
  tween(u.uSpeed, { value: 0.12 }, 1500, Ease.outCubic);
  await wait(700);
  await tween(u.uAlpha, { value: 0 }, 1300, Ease.inOutSine);
  state.warpActive = false;
}

async function landing() {
  if (state.landed) return;
  state.landed = true;
  renderUi.classList.add("hidden");
  warpSkip.style.display = "none";
  sceneEls.forEach((el) => io.observe(el));

  // 上空からタイムラインへ降りるワンテイク
  if (world && !reduced) {
    world.cam.y = 6.4;
    tween(world.cam, { y: 1.62 }, 2400, Ease.inOutCubic);
  } else if (world) {
    world.cam.y = 1.62;
  }

  SFX.landingChord();
  SFX.startAmbient();

  hud.classList.remove("hud-hidden");
  document.body.classList.remove("no-scroll");
  sceneEls[0]?.classList.add("on");

  sections = relayout();
  updateHud(window.scrollY);
}

let bootStarted = false;
async function startExperience() {
  if (bootStarted) return;
  bootStarted = true;
  state.started = true;

  SFX.setMuted(state.muted);
  SFX.uiClick();

  boot.classList.add("gone");

  if (!renderer || reduced) {
    // WebGL 無し / モーション低減: ワープを省いて着地
    await wait(500);
    await landing();
    return;
  }

  await wait(650);
  await runRenderBar();
  await runWarp();
  await landing();
}

bootBtn.addEventListener("click", startExperience);

warpSkip.addEventListener("click", () => {
  if (!state.warpActive) return;
  killAllTweens();
  if (warp) warp.uniforms.uAlpha.value = 0;
  state.warpActive = false;
  landing();
});

// ---------- ミュート ----------

function applyMute() {
  muteBtn.setAttribute("aria-pressed", state.muted ? "true" : "false");
  muteBtn.setAttribute("aria-label", state.muted ? "音を出す" : "音を消す");
  SFX.setMuted(state.muted);
  localStorage.setItem("pe_muted", state.muted ? "1" : "0");
}
muteBtn.addEventListener("click", () => {
  state.muted = !state.muted;
  applyMute();
});
if (state.muted) applyMute();

// ---------- FAQ ----------

$$(".faq-q").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = btn.closest(".faq-item");
    const ans = item.querySelector(".faq-a");
    const open = item.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    ans.hidden = !open;
    SFX.uiClick();
  });
});

// ---------- WORKS モニター ----------

const WORKS = [
  { img: "assets/works/work-2000-rank.png", tag: "GAME THUMBNAIL", title: "2000目指してランクマッチ",
    desc: "大会感のある背景、キャラクター、巨大テキストで、配信前に期待値を作るサムネイル。" },
  { img: "assets/works/work-xp-update.png", tag: "SPLATOON", title: "XP更新行くぞ!!!",
    desc: "挑戦系の配信タイトルを、勢いのある文字組みで見せるサムネイル。" },
  { img: "assets/works/work-horror-game.png", tag: "STREAM", title: "みんなでホラーゲーム",
    desc: "ホラーの空気感を色と明暗で作る、コラボ配信向けサムネイル。" },
  { img: "assets/works/work-nintendo-direct.png", tag: "LIVE", title: "同時視聴配信",
    desc: "同時視聴の企画性がひと目で伝わるレイアウトのサムネイル。" },
  { img: "assets/works/work-mariokart-world.png", tag: "MARIOKART", title: "世界1元気マリカ",
    desc: "キャラクターの表情と配色で楽しさを前に出すサムネイル。" },
  { img: "assets/works/work-birthday-live.png", tag: "BIRTHDAY LIVE", title: "飲酒誕生日配信",
    desc: "記念配信の特別感を飾りと光で演出するサムネイル。" },
  { img: "assets/works/work-springfest-members.png", tag: "MEMBERS", title: "SpringFest メン限",
    desc: "メンバー限定の親密さを、柔らかいトーンでまとめたサムネイル。" },
  { img: "assets/works/work-short-editing.png", tag: "EDITING", title: "shortを作るには",
    desc: "ノウハウ系の内容を、整理された文字情報で伝えるサムネイル。" },
];

const monitorImg = $("#monitor-img");
const monitorNum = $("#monitor-num");
const monitorTag = $("#monitor-tag");
const monitorTitle = $("#monitor-title");
const monitorDesc = $("#monitor-desc");
const pickBtns = $$("[data-pick]");

function selectWork(i) {
  const w = WORKS[i];
  if (!w) return;
  monitorImg.classList.add("loading");
  setTimeout(() => {
    monitorImg.src = w.img;
    monitorImg.alt = w.title;
    monitorImg.classList.remove("loading");
  }, 180);
  monitorNum.textContent = String(i + 1).padStart(2, "0");
  monitorTag.textContent = w.tag;
  monitorTitle.textContent = w.title;
  monitorDesc.textContent = w.desc;
  pickBtns.forEach((b) => b.setAttribute("aria-selected", b.dataset.pick == i ? "true" : "false"));
  SFX.uiClick();
}
pickBtns.forEach((b) => b.addEventListener("click", () => selectWork(+b.dataset.pick)));

// テープを複製してシームレスにループ + クリックでモニターへ
{
  const track = $(".tape-track");
  if (track) {
    track.innerHTML += track.innerHTML;
    track.addEventListener("click", (e) => {
      const fig = e.target.closest("figure");
      if (!fig) return;
      selectWork(+fig.dataset.work);
      $("[data-monitor]")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    });
  }
}

// ---------- 最終CTA ----------

$("#final-cta")?.addEventListener("click", () => {
  SFX.exportHit();
});

// ---------- マウスパララックス ----------

if (!isMobile && world) {
  window.addEventListener("pointermove", (e) => {
    world.cam.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    world.cam.mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
}

// ---------- リサイズ ----------

let resizeTimer = 0;
window.addEventListener("resize", () => {
  if (renderer) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    world.resize(window.innerWidth, window.innerHeight);
    warp.resize();
  }
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (state.landed) {
      sections = relayout();
      updateHud(window.scrollY);
    }
  }, 300);
});

// フォント読み込み後、クリップのラベルを正しい書体で作り直す
if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    if (state.landed) sections = relayout();
  });
}

// ---------- メインループ ----------

let lastNow = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastNow) / 1000, 0.05);
  lastNow = now;

  updateTweens(now);
  if (document.hidden) return;

  const scrollY = window.scrollY;

  if (world && renderer) {
    if (state.landed) {
      world.cam.targetZ = -scrollY * state.scale;
    }

    state.prevCamZ = world.cam.z;
    world.update(now, dt);

    if (state.landed) {
      updateHud(scrollY);

      // ゲート通過検出
      for (let i = 0; i < state.gateZs.length; i++) {
        const gz = state.gateZs[i];
        const phZ = world.cam.z - 7.2;          // 再生ヘッド位置で判定
        const prevPh = state.prevCamZ - 7.2;
        if (prevPh > gz && phZ <= gz && !state.gatesHit[i]) {
          state.gatesHit[i] = true;
          world.pulseGate(i);
          SFX.gateChime();
        }
        // 逆走したら再度鳴らせるようにリセット
        if (phZ > gz + 3) state.gatesHit[i] = false;
      }

      // スクラブの目盛り音(高速走行時のみ・控えめに)
      const zone = Math.floor(world.cam.z / 2.4);
      const speed = Math.abs(world.cam.z - state.prevCamZ) / Math.max(dt, 1e-4);
      if (zone !== state.lastTickZone && speed > 6 && now - state.lastTickAt > 90) {
        state.lastTickZone = zone;
        state.lastTickAt = now;
        SFX.scrubTick();
      }
    }

    if (state.warpActive && warp) {
      state.warpT += dt;
      warp.uniforms.uTime.value = state.warpT;
      renderer.render(world.scene, world.camera);
      renderer.autoClear = false;
      renderer.render(warp.scene, warp.camera);
      renderer.autoClear = true;
    } else {
      renderer.render(world.scene, world.camera);
    }
  } else if (state.landed) {
    updateHud(scrollY);
  }
}
requestAnimationFrame(frame);

// ---------- 初期レイアウト(起動前でも世界を組んでおく) ----------

if (world) {
  sections = relayout();
}
