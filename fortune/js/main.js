// ============================================================
// 宵闇の占い館 ― エントリーポイント
//   レンダリング・カメラ演出・占いの進行(状態機械)
// ============================================================

import * as THREE from "three";
import { updateTweens, tween, wait, Ease } from "./tween.js";
import { buildEnvironment } from "./scene.js";
import { CardTable, SLOTS, TABLE_Y } from "./cards.js";
import { ShadowTeller } from "./teller.js";
import {
  buildDeck, readingFor, synthesize, luckScore,
  TOPICS, POSITIONS, MEANINGS, PICK_REACTIONS,
} from "./fortunes.js";
import {
  initDialogue, say, sayAll, hideDialogue, choose, showHint, hideHint, hooks,
} from "./dialogue.js";
import {
  initAudio, startAmbient, sfxWhisper, sfxChime, toggleMute, isMuted,
} from "./audio.js";

// ---------- 基本セットアップ ----------

const canvas = document.getElementById("stage");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.05, 40);

// カメラリグ(位置と注視点をトゥイーンで動かし、揺らぎを足す)
const rig = {
  px: 0, py: 2.05, pz: 3.1,   // 初期は入口から
  tx: 0, ty: 1.15, tz: -1.0,
};
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };

function applyViewport() {
  camera.aspect = window.innerWidth / window.innerHeight;
  // 縦長画面では画角を広げ、卓上のカードが見切れないようにする
  camera.fov = camera.aspect < 0.8 ? 68 : 54;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", applyViewport);
applyViewport();

window.addEventListener("pointermove", (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
});

// ---------- 構築 ----------

const env = buildEnvironment(scene);
const cardTable = new CardTable(scene);
const teller = new ShadowTeller(scene);

// ---------- レイキャスト(カード選択) ----------

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let hoveredCard = null;
let pickResolver = null;

canvas.addEventListener("pointermove", (e) => {
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
});

canvas.addEventListener("click", (e) => {
  if (!pickResolver) return;
  // タッチ端末では pointermove を経ずにタップされるため、
  // クリック座標から直接レイキャストして判定する
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const card = cardTable.updateHover(raycaster) || hoveredCard;
  if (card) {
    const r = pickResolver;
    pickResolver = null;
    r(card);
  }
});

function waitForPick() {
  return new Promise((resolve) => { pickResolver = resolve; });
}

// ---------- 会話と占い師の連動 ----------

let whisperTick = 0;
hooks.onSpeakStart = () => teller.setSpeaking(true);
hooks.onSpeakTick = () => {
  whisperTick++;
  if (whisperTick % 4 === 0) sfxWhisper();
};
hooks.onSpeakEnd = () => teller.setSpeaking(false);

// ---------- レンダリングループ ----------

const clock = new THREE.Clock();

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  updateTweens(performance.now());

  // カメラ:呼吸の揺れ + マウス視差
  pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 3);
  pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 3);
  const bob = Math.sin(t * 0.9) * 0.006;
  camera.position.set(
    rig.px + pointer.sx * 0.055,
    rig.py + bob + pointer.sy * -0.03,
    rig.pz
  );
  camera.lookAt(rig.tx + pointer.sx * 0.12, rig.ty + pointer.sy * -0.07, rig.tz);

  env.update(t, dt);
  teller.update(t, dt, camera);
  cardTable.update(t, dt);

  // カードのホバー判定
  if (cardTable.pickable) {
    raycaster.setFromCamera(ndc, camera);
    hoveredCard = cardTable.updateHover(raycaster);
    canvas.classList.toggle("pickable", !!hoveredCard);
  } else if (canvas.classList.contains("pickable")) {
    canvas.classList.remove("pickable");
  }

  renderer.render(scene, camera);
}
frame();

// ---------- UI 要素 ----------

const titleScreen = document.getElementById("title-screen");
const enterBtn = document.getElementById("enter-btn");
const muteBtn = document.getElementById("mute-btn");
const topControls = document.getElementById("top-controls");
const resultPanel = document.getElementById("result-panel");
const retryBtn = document.getElementById("retry-btn");

muteBtn.addEventListener("click", () => {
  const m = toggleMute();
  muteBtn.classList.toggle("muted", m);
});

// ---------- 占いの進行 ----------

const state = {
  topic: "all",
  picked: [],   // { card(3D), data(スート・ランク) }
  running: false,
};

async function cameraToSeat() {
  await Promise.all([
    tween(rig, { px: 0, py: 1.46, pz: 1.42, tx: 0, ty: 1.04, tz: -0.55 }, 3400, Ease.inOutCubic),
  ]);
}

function cameraFocusTable(dur = 1800) {
  return tween(rig, { py: 1.52, pz: 1.36, ty: 0.97, tz: -0.30 }, dur, Ease.inOutCubic);
}

function cameraFocusTeller(dur = 1800) {
  return tween(rig, { py: 1.46, pz: 1.42, ty: 1.04, tz: -0.55 }, dur, Ease.inOutCubic);
}

// スロットと占い師の両方が映る「読み解き」の構図
function cameraReading(dur = 1800) {
  return tween(rig, { py: 1.50, pz: 1.40, ty: 1.00, tz: -0.45 }, dur, Ease.inOutCubic);
}

/** 入室 〜 挨拶 */
async function sessionIntro() {
  await wait(600);
  await teller.materialize();
  await wait(400);

  teller.greet(); // 挨拶モーションと台詞を並行
  await sayAll([
    "……ようこそ、迷える旅人よ。",
    "この卓に辿り着いたのも、何かの導き。",
    "私は「影」。実体を持たぬ、しがない占い師だ。",
    "肉の器を持たぬ代わりに……人の運命の糸だけは、よく視える。",
  ]);
}

/** テーマ選択 */
async function chooseTopic() {
  await say("今宵は、何を知りたい?", { autoAdvanceMs: 150 });
  const topic = await choose(
    Object.entries(TOPICS).map(([key, t]) => ({ key, label: t.label }))
  );
  state.topic = topic;
  hideDialogue();
  await teller.nod();
  await say(`……${TOPICS[topic].label}か。承知した。`);
}

/** 配札 〜 シャッフル */
async function shufflePhase() {
  await say("では、卓上にカードを並べよう。", { autoAdvanceMs: 300 });
  hideDialogue();
  await cameraFocusTable();
  await cardTable.dealIn();
  await wait(300);

  await say("いま、カードにお前の「問い」を吹き込む……。", { autoAdvanceMs: 300 });
  hideDialogue();
  await teller.startShuffleGesture();
  await cardTable.shuffle();
  await teller.stopShuffleGesture();
}

/** 3枚選択 */
async function pickPhase() {
  teller.beckon(); // 手招きと台詞を並行
  await sayAll([
    "さあ……手をかざし、心に触れたカードを3枚。",
    "考えるな。指先が勝手に止まる場所……それが答えだ。",
  ]);
  hideDialogue();

  cardTable.showSlotLabels([0, 1, 2], 0.5);
  state.picked = [];

  for (let i = 0; i < 3; i++) {
    showHint(`カードを選んでください(${i + 1} / 3枚目)`);
    cardTable.setPickable(true);
    const card = await waitForPick();
    cardTable.setPickable(false);
    hideHint();
    await cardTable.pickCard(card, i);
    state.picked.push({ card });
    if (i < 2) {
      teller.nod();
      say(PICK_REACTIONS[Math.floor(Math.random() * PICK_REACTIONS.length)], { autoAdvanceMs: 500 })
        .then(() => hideDialogue());
    }
  }

  await say("……よし。それがお前の三枚だ。", { autoAdvanceMs: 400 });
  hideDialogue();
  await cardTable.dismissRest();
}

/** 公開と読み解き */
async function revealPhase() {
  // カードの正体を決める(52枚から重複なく3枚)
  const deck = buildDeck();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const drawn = deck.slice(0, 3);

  await cameraReading(1600);
  cardTable.showSlotLabels([0, 1, 2], 0.85);

  for (let i = 0; i < 3; i++) {
    const pick = state.picked[i];
    pick.data = drawn[i];
    const pos = POSITIONS[i];

    await say(pos.intro, { autoAdvanceMs: 500 });
    hideDialogue();

    cardTable.assignFace(pick.card, drawn[i].suit, drawn[i].rank);

    // 影の手がカードへ伸び、カードがめくれて目の前へ
    await teller.reachToSlot(i);
    await cardTable.reveal(pick.card, i);
    teller.withdraw();

    await say(`現れたのは……「${drawn[i].name}」。`);
    await say(readingFor(drawn[i], pos.key));

    // 読み終えたカードは卓上へ(表向き)
    await cardTable.settle(pick.card, i);
    pick.card.revealed = true;
  }
}

/** 総合鑑定 */
async function summaryPhase() {
  const cards = state.picked.map((p) => p.data);
  const result = synthesize(cards, state.topic);

  await teller.tiltHead();
  await say("三枚の声を、束ねて読もう……。", { autoAdvanceMs: 600 });

  const lines = result.text.split("\n");
  await sayAll(lines);

  sfxChime(880, 0.07);
  teller.bowDeep();
  await say("……以上が、カードの示した筋書きだ。");
  await say("運命は定まってはいない。……良い夜を、旅人よ。");
  hideDialogue();
  cardTable.hideSlotLabels();
  await wait(600);

  showResult(cards, result);
}

/** 結果パネル */
function showResult(cards, result) {
  document.getElementById("result-topic").textContent =
    `【 ${TOPICS[state.topic].label} 】`;

  const cardsWrap = document.getElementById("result-cards");
  cardsWrap.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const c = cards[i];
    const m = MEANINGS[c.id];
    const div = document.createElement("div");
    div.className = "result-card";
    const img = document.createElement("img");
    img.className = "rc-img";
    img.alt = c.name;
    // 3D 用に生成したカード表面キャンバスをそのまま流用
    const tex = state.picked[i].card.front.material.map;
    if (tex && tex.image && tex.image.toDataURL) {
      img.src = tex.image.toDataURL("image/png");
    }
    div.innerHTML = `<div class="rc-pos">${POSITIONS[i].label}</div>`;
    div.appendChild(img);
    div.insertAdjacentHTML(
      "beforeend",
      `<div class="rc-name">${c.name}</div>
       <div class="rc-keys">${m.keys.join(" / ")}</div>`
    );
    cardsWrap.appendChild(div);
  }

  const stars = result.stars;
  document.getElementById("result-stars").innerHTML =
    `<span class="stars-label">${TOPICS[state.topic].label}</span>` +
    "★".repeat(stars) + "<span style='opacity:0.25'>" + "★".repeat(5 - stars) + "</span>";

  document.getElementById("result-summary").textContent = result.text;

  resultPanel.classList.remove("hidden");
}

/** もう一度 */
async function retrySession() {
  resultPanel.classList.add("hidden");
  cardTable.reset();
  await cameraFocusTeller(1400);
  await say("……ほう、まだ聞きたいことがあるか。良いだろう。");
  await chooseTopic();
  await shufflePhase();
  await cameraFocusTable(1200);
  await pickPhase();
  await revealPhase();
  await summaryPhase();
}

retryBtn.addEventListener("click", () => {
  if (state.running) return;
  state.running = true;
  retrySession().finally(() => { state.running = false; });
});

/** メインフロー */
async function mainFlow() {
  await cameraToSeat();
  await sessionIntro();
  await chooseTopic();
  await shufflePhase();
  await cameraFocusTable(1200);
  await pickPhase();
  await revealPhase();
  await summaryPhase();
}

enterBtn.addEventListener("click", () => {
  if (state.running) return;
  state.running = true;
  initAudio();
  startAmbient();
  titleScreen.classList.add("fading");
  topControls.classList.remove("hidden");
  setTimeout(() => { titleScreen.style.display = "none"; }, 1700);
  mainFlow().finally(() => { state.running = false; });
});

initDialogue();

// ---------- 動作確認用フック(UI からは使わない) ----------
window.__fortune = {
  cardScreenPos(i) {
    const c = cardTable.cards[i];
    if (!c || !c.group.visible) return null;
    const v = new THREE.Vector3();
    c.group.getWorldPosition(v);
    v.project(camera);
    return {
      x: (v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-v.y * 0.5 + 0.5) * window.innerHeight,
    };
  },
  state,
  cardTable,
  teller,
  rig,
};
