// ============================================================
// トランプ ― テクスチャ生成・配置・シャッフル・選択・公開演出
//   カード絵柄はすべて Canvas で手続き的に描画する。
// ============================================================

import * as THREE from "three";
import { tween, wait, Ease } from "./tween.js";
import { SUITS } from "./fortunes.js";
import { sfxCardSlide, sfxCardFlip, sfxSwirl, sfxChime } from "./audio.js";

export const CARD_W = 0.068;
export const CARD_H = 0.0955;
export const TABLE_Y = 0.95;
const CARD_LIFT = 0.0016; // テーブルからの浮き(Z-fighting 回避)

const TEX_W = 512;
const TEX_H = 720;
const CORNER_R = 42;

// プレイヤー(カメラの座席)位置 ― ファンの向きの基準
const SEAT = new THREE.Vector3(0, 0, 1.42);

// 選択スロット(過去・現在・未来)
export const SLOTS = [
  { x: -0.30, z: -0.18, label: "過去" },
  { x: 0.0, z: -0.21, label: "現在" },
  { x: 0.30, z: -0.18, label: "未来" },
];

// ---------- Canvas 描画ヘルパ ----------

function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** カード裏面 ― 月と星の意匠 */
export function makeBackTexture() {
  const cv = document.createElement("canvas");
  cv.width = TEX_W; cv.height = TEX_H;
  const ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, TEX_W, TEX_H);

  roundedRectPath(ctx, 0, 0, TEX_W, TEX_H, CORNER_R);
  ctx.save();
  ctx.clip();

  // 地:深い藍
  const bg = ctx.createLinearGradient(0, 0, TEX_W, TEX_H);
  bg.addColorStop(0, "#130b26");
  bg.addColorStop(0.5, "#0b0619");
  bg.addColorStop(1, "#100a22");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // 斜めの格子模様
  ctx.strokeStyle = "rgba(201, 168, 106, 0.14)";
  ctx.lineWidth = 2;
  for (let i = -TEX_H; i < TEX_W + TEX_H; i += 46) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + TEX_H, TEX_H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i + TEX_H, 0); ctx.lineTo(i, TEX_H); ctx.stroke();
  }
  // 格子の交点に小さな星
  ctx.fillStyle = "rgba(232, 207, 154, 0.20)";
  for (let y = 23; y < TEX_H; y += 46) {
    for (let x = 23 + ((Math.floor(y / 46) % 2) * 23); x < TEX_W; x += 46) {
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  // 中央円環
  const cx = TEX_W / 2, cy = TEX_H / 2;
  ctx.strokeStyle = "rgba(201, 168, 106, 0.85)";
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx, cy, 150, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(cx, cy, 136, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 164, 0, Math.PI * 2); ctx.stroke();

  // 円環の目盛り(星位)
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r1 = 150, r2 = i % 2 === 0 ? 160 : 155;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }

  // 中央の円盤(夜空)
  const disc = ctx.createRadialGradient(cx, cy, 10, cx, cy, 132);
  disc.addColorStop(0, "#2c1b56");
  disc.addColorStop(1, "#120a26");
  ctx.fillStyle = disc;
  ctx.beginPath(); ctx.arc(cx, cy, 132, 0, Math.PI * 2); ctx.fill();

  // 三日月
  ctx.fillStyle = "#e8cf9a";
  ctx.shadowColor = "rgba(232, 207, 154, 0.9)";
  ctx.shadowBlur = 26;
  ctx.beginPath(); ctx.arc(cx - 6, cy, 74, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#1c1140";
  ctx.beginPath(); ctx.arc(cx + 26, cy - 12, 66, 0, Math.PI * 2); ctx.fill();

  // 星々
  ctx.fillStyle = "#e8cf9a";
  const stars = [[cx + 62, cy - 58, 5], [cx + 84, cy + 6, 3.4], [cx + 52, cy + 62, 4.2], [cx + 96, cy - 30, 2.6]];
  for (const [sx, sy, sr] of stars) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.beginPath();
    for (let p = 0; p < 8; p++) {
      const a = (p / 8) * Math.PI * 2;
      const rr = p % 2 === 0 ? sr * 2.2 : sr * 0.85;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // 外周の縁取り(二重)
  ctx.strokeStyle = "#c9a86a";
  ctx.lineWidth = 7;
  roundedRectPath(ctx, 12, 12, TEX_W - 24, TEX_H - 24, CORNER_R - 8);
  ctx.stroke();
  ctx.lineWidth = 2;
  roundedRectPath(ctx, 26, 26, TEX_W - 52, TEX_H - 52, CORNER_R - 14);
  ctx.stroke();

  // 四隅の飾り
  ctx.fillStyle = "rgba(201,168,106,0.9)";
  for (const [ox, oy] of [[46, 46], [TEX_W - 46, 46], [46, TEX_H - 46], [TEX_W - 46, TEX_H - 46]]) {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
  }

  ctx.restore();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// 数札のピップ配置(x: 0-1, y: 0-1, flip)
const PIP_LAYOUT = {
  A: [[0.5, 0.5, 0]],
  2: [[0.5, 0.18, 0], [0.5, 0.82, 1]],
  3: [[0.5, 0.18, 0], [0.5, 0.5, 0], [0.5, 0.82, 1]],
  4: [[0.3, 0.2, 0], [0.7, 0.2, 0], [0.3, 0.8, 1], [0.7, 0.8, 1]],
  5: [[0.3, 0.2, 0], [0.7, 0.2, 0], [0.5, 0.5, 0], [0.3, 0.8, 1], [0.7, 0.8, 1]],
  6: [[0.3, 0.2, 0], [0.7, 0.2, 0], [0.3, 0.5, 0], [0.7, 0.5, 0], [0.3, 0.8, 1], [0.7, 0.8, 1]],
  7: [[0.3, 0.2, 0], [0.7, 0.2, 0], [0.5, 0.35, 0], [0.3, 0.5, 0], [0.7, 0.5, 0], [0.3, 0.8, 1], [0.7, 0.8, 1]],
  8: [[0.3, 0.2, 0], [0.7, 0.2, 0], [0.5, 0.35, 0], [0.3, 0.5, 0], [0.7, 0.5, 0], [0.5, 0.65, 1], [0.3, 0.8, 1], [0.7, 0.8, 1]],
  9: [[0.3, 0.17, 0], [0.7, 0.17, 0], [0.3, 0.39, 0], [0.7, 0.39, 0], [0.5, 0.5, 0], [0.3, 0.61, 1], [0.7, 0.61, 1], [0.3, 0.83, 1], [0.7, 0.83, 1]],
  10: [[0.3, 0.17, 0], [0.7, 0.17, 0], [0.5, 0.28, 0], [0.3, 0.39, 0], [0.7, 0.39, 0], [0.3, 0.61, 1], [0.7, 0.61, 1], [0.5, 0.72, 1], [0.3, 0.83, 1], [0.7, 0.83, 1]],
};

function drawSuit(ctx, suit, x, y, size, color, flip = 0) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.rotate(Math.PI);
  ctx.fillStyle = color;
  ctx.font = `${size}px "Hiragino Mincho ProN", "Yu Mincho", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(SUITS[suit].symbol, 0, size * 0.04);
  ctx.restore();
}

/** カード表面 */
export function makeFaceTexture(suit, rank) {
  const cv = document.createElement("canvas");
  cv.width = TEX_W; cv.height = TEX_H;
  const ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, TEX_W, TEX_H);

  roundedRectPath(ctx, 0, 0, TEX_W, TEX_H, CORNER_R);
  ctx.save();
  ctx.clip();

  // 地:生成り色
  const bg = ctx.createRadialGradient(TEX_W / 2, TEX_H / 2, 60, TEX_W / 2, TEX_H / 2, 460);
  bg.addColorStop(0, "#faf6ea");
  bg.addColorStop(1, "#ece2c8");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  const color = SUITS[suit].color;
  const isRed = suit === "H" || suit === "D";
  const inkColor = isRed ? "#a3182f" : "#1b1b26";

  // 内枠
  ctx.strokeStyle = "rgba(160, 130, 80, 0.55)";
  ctx.lineWidth = 3;
  roundedRectPath(ctx, 18, 18, TEX_W - 36, TEX_H - 36, CORNER_R - 10);
  ctx.stroke();

  // コーナーインデックス
  const drawIndex = (flip) => {
    ctx.save();
    if (flip) { ctx.translate(TEX_W, TEX_H); ctx.rotate(Math.PI); }
    ctx.fillStyle = inkColor;
    ctx.font = `bold 74px Georgia, "Times New Roman", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(rank, 62, 96);
    ctx.font = `58px serif`;
    ctx.fillText(SUITS[suit].symbol, 62, 156);
    ctx.restore();
  };
  drawIndex(0);
  drawIndex(1);

  const isCourt = rank === "J" || rank === "Q" || rank === "K";
  if (isCourt) {
    // 絵札 ― 装飾枠と大きな文字
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 4;
    roundedRectPath(ctx, 118, 150, TEX_W - 236, TEX_H - 300, 18);
    ctx.stroke();
    ctx.strokeStyle = "rgba(160,130,80,0.7)";
    ctx.lineWidth = 2;
    roundedRectPath(ctx, 130, 162, TEX_W - 260, TEX_H - 324, 12);
    ctx.stroke();

    ctx.fillStyle = inkColor;
    ctx.font = `bold 200px Georgia, "Times New Roman", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(rank, TEX_W / 2, TEX_H / 2 - 30);
    drawSuit(ctx, suit, TEX_W / 2, TEX_H / 2 + 120, 110, inkColor);

    // 冠意匠
    ctx.fillStyle = "rgba(201,168,106,0.95)";
    ctx.beginPath();
    const cw = 110, cy0 = 188, cx0 = TEX_W / 2;
    ctx.moveTo(cx0 - cw / 2, cy0 + 26);
    ctx.lineTo(cx0 - cw / 2, cy0);
    ctx.lineTo(cx0 - cw / 4, cy0 + 14);
    ctx.lineTo(cx0, cy0 - 8);
    ctx.lineTo(cx0 + cw / 4, cy0 + 14);
    ctx.lineTo(cx0 + cw / 2, cy0);
    ctx.lineTo(cx0 + cw / 2, cy0 + 26);
    ctx.closePath();
    ctx.fill();
  } else if (rank === "A") {
    // エース ― 大きなピップと放射装飾
    ctx.strokeStyle = "rgba(160,130,80,0.5)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(TEX_W / 2 + Math.cos(a) * 150, TEX_H / 2 + Math.sin(a) * 150);
      ctx.lineTo(TEX_W / 2 + Math.cos(a) * 172, TEX_H / 2 + Math.sin(a) * 172);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(TEX_W / 2, TEX_H / 2, 150, 0, Math.PI * 2);
    ctx.stroke();
    drawSuit(ctx, suit, TEX_W / 2, TEX_H / 2, 210, inkColor);
  } else {
    // 数札 ― 標準的なピップ配置
    const layout = PIP_LAYOUT[rank];
    const areaX = 128, areaW = TEX_W - 256;
    const areaY = 130, areaH = TEX_H - 260;
    for (const [px, py, flip] of layout) {
      drawSuit(ctx, suit, areaX + areaW * px, areaY + areaH * py, 96, inkColor, flip);
    }
  }

  ctx.restore();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** スロットラベル(過去・現在・未来)のスプライト用テクスチャ */
function makeLabelTexture(text) {
  const cv = document.createElement("canvas");
  cv.width = 320; cv.height = 120;
  const ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, 320, 120);
  ctx.font = `bold 58px "Hiragino Mincho ProN", "Yu Mincho", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(232, 207, 154, 0.95)";
  ctx.shadowBlur = 22;
  ctx.fillStyle = "#eed9a8";
  ctx.fillText(text, 160, 60);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** カード下の輝きテクスチャ */
function makeGlowTexture() {
  const cv = document.createElement("canvas");
  cv.width = 128; cv.height = 128;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, "rgba(168, 130, 255, 0.85)");
  g.addColorStop(0.5, "rgba(120, 90, 220, 0.30)");
  g.addColorStop(1, "rgba(90, 60, 180, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- カード卓 ----------

export class CardTable {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.backTexture = makeBackTexture();
    this.glowTexture = makeGlowTexture();
    this.cards = [];       // { group, front, back, glow, home:{pos,rot}, picked, index }
    this.pickable = false;
    this.hovered = null;

    this._buildCards(30);
    this._buildSlotLabels();
  }

  _cardMaterial(map) {
    return new THREE.MeshStandardMaterial({
      map,
      transparent: true,
      alphaTest: 0.02,
      roughness: 0.88,
      metalness: 0.0,
      side: THREE.FrontSide,
    });
  }

  _buildCards(count) {
    const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();

      // 裏面:グループ +Z 向き(卓上に伏せた状態で上を向く)
      const backMat = this._cardMaterial(this.backTexture);
      const back = new THREE.Mesh(geo, backMat);
      back.userData.cardIndex = i;

      // 表面:グループ -Z 向き(テーブル側。めくると上を向く)
      const frontMat = this._cardMaterial(null);
      frontMat.visible = false;
      const front = new THREE.Mesh(geo, frontMat);
      front.rotation.x = Math.PI;

      g.add(back, front);

      // 下光(選択時の輝き)
      const glowMat = new THREE.MeshBasicMaterial({
        map: this.glowTexture,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W * 2.4, CARD_H * 2.0), glowMat);
      glow.position.z = -0.0012;
      g.add(glow);

      // 卓上に伏せる: グループ全体を水平に
      g.rotation.x = -Math.PI / 2;
      g.position.set(0, TABLE_Y + CARD_LIFT + i * 0.0002, 0.8); // 初期はプレイヤー脇の山札位置
      g.visible = false;

      this.group.add(g);
      this.cards.push({
        group: g, front, back, glowMat,
        home: null, picked: false, revealed: false, index: i,
        faceCard: null,
      });
    }
  }

  _buildSlotLabels() {
    this.slotLabels = [];
    for (const slot of SLOTS) {
      const tex = makeLabelTexture(slot.label);
      const mat = new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0, depthWrite: false,
      });
      const spr = new THREE.Sprite(mat);
      spr.scale.set(0.19, 0.071, 1);
      spr.position.set(slot.x, TABLE_Y + 0.13, slot.z - 0.09);
      this.group.add(spr);
      this.slotLabels.push(mat);
    }
  }

  /** 扇状(二重の弧)のホーム位置を計算 */
  _fanPlacements() {
    const placements = [];
    const rows = [
      { r: 1.06, count: 15, span: 0.62 },
      { r: 1.19, count: 15, span: 0.60 },
    ];
    for (const row of rows) {
      for (let i = 0; i < row.count; i++) {
        const t = row.count === 1 ? 0 : i / (row.count - 1);
        const a = (t - 0.5) * row.span * 2;
        const x = SEAT.x + Math.sin(a) * row.r * 0.62;
        const z = SEAT.z - Math.cos(a) * row.r;
        const jitter = (Math.random() - 0.5) * 0.08;
        placements.push({ x, z, yaw: -a * 0.62 + jitter });
      }
    }
    return placements;
  }

  /** 山札位置から扇形に配る */
  async dealIn() {
    const placements = this._fanPlacements();
    const jobs = [];
    for (let i = 0; i < this.cards.length; i++) {
      const c = this.cards[i];
      const p = placements[i];
      c.home = p;
      c.group.visible = true;
      c.group.position.set(-0.75, TABLE_Y + 0.06 + i * 0.0018, 0.28);
      c.group.rotation.set(-Math.PI / 2, 0, 1.2);
      const y = TABLE_Y + CARD_LIFT + (i % 15) * 0.00022;
      jobs.push((async () => {
        await wait(i * 55);
        sfxCardSlide();
        await Promise.all([
          tween(c.group.position, { x: p.x, y, z: p.z }, 460, Ease.outCubic),
          tween(c.group.rotation, { z: p.yaw }, 460, Ease.outCubic),
        ]);
      })());
    }
    await Promise.all(jobs);
  }

  /** シャッフル ― 全カードが渦を巻いて舞い、再び扇形へ */
  async shuffle() {
    sfxSwirl(2.2);
    const jobs = [];
    const n = this.cards.length;
    for (let i = 0; i < n; i++) {
      const c = this.cards[i];
      const angle0 = (i / n) * Math.PI * 2;
      const r = 0.34 + Math.random() * 0.22;
      const h = TABLE_Y + 0.16 + Math.random() * 0.22;
      jobs.push((async () => {
        await wait(i * 18);
        // 1) 渦へ吸い上げられる
        const swirl = { a: angle0, r, y: h };
        const upDur = 620;
        await tween(swirl, { a: angle0 + Math.PI * 1.75, y: h + 0.05 }, upDur + 900, Ease.inOutSine, {
          onUpdate: () => {
            c.group.position.x = Math.cos(swirl.a) * swirl.r;
            c.group.position.z = -0.05 + Math.sin(swirl.a) * swirl.r * 0.72;
            c.group.position.y += (swirl.y - c.group.position.y) * 0.14;
            c.group.rotation.z = swirl.a * 1.5;
          },
        });
        // 2) 新しい扇位置へ舞い戻る
        const p = c.home;
        const y = TABLE_Y + CARD_LIFT + (i % 15) * 0.00022;
        sfxCardSlide();
        await Promise.all([
          tween(c.group.position, { x: p.x, y, z: p.z }, 560, Ease.outCubic),
          tween(c.group.rotation, { x: -Math.PI / 2, y: 0, z: p.yaw }, 560, Ease.outCubic),
        ]);
      })());
    }
    await Promise.all(jobs);
  }

  setPickable(v) {
    this.pickable = v;
    if (!v) this._setHover(null);
  }

  getPickMeshes() {
    return this.cards.filter((c) => !c.picked).map((c) => c.back);
  }

  _setHover(card) {
    if (this.hovered === card) return;
    // 以前のホバーを戻す
    if (this.hovered && !this.hovered.picked) {
      const h = this.hovered;
      tween(h.group.position, { y: TABLE_Y + CARD_LIFT + (h.index % 15) * 0.00022 }, 260, Ease.outCubic);
      tween(h.glowMat, { opacity: 0 }, 260, Ease.outQuad);
    }
    this.hovered = card;
    if (card && !card.picked) {
      tween(card.group.position, { y: TABLE_Y + 0.02 }, 240, Ease.outCubic);
      tween(card.glowMat, { opacity: 0.85 }, 240, Ease.outQuad);
    }
  }

  /** レイキャストの結果からホバー状態を更新 */
  updateHover(raycaster) {
    if (!this.pickable) return null;
    const hits = raycaster.intersectObjects(this.getPickMeshes(), false);
    const card = hits.length ? this.cards[hits[0].object.userData.cardIndex] : null;
    this._setHover(card);
    return card;
  }

  /** スロットラベルの表示 */
  showSlotLabels(indices, opacity = 0.85) {
    this.slotLabels.forEach((mat, i) => {
      tween(mat, { opacity: indices.includes(i) ? opacity : 0 }, 600, Ease.inOutSine);
    });
  }

  hideSlotLabels() {
    this.slotLabels.forEach((mat) => tween(mat, { opacity: 0 }, 500, Ease.inOutSine));
  }

  /** カードをスロットへ移動(伏せたまま) */
  async pickCard(card, slotIndex) {
    card.picked = true;
    this._setHover(null);
    const slot = SLOTS[slotIndex];
    sfxCardSlide();
    tween(card.glowMat, { opacity: 0 }, 500, Ease.outQuad);
    await Promise.all([
      tween(card.group.position, { x: slot.x, y: TABLE_Y + 0.05, z: slot.z }, 420, Ease.inOutCubic),
      tween(card.group.rotation, { z: 0 }, 420, Ease.inOutCubic),
    ]);
    await tween(card.group.position, { y: TABLE_Y + CARD_LIFT * 3 }, 260, Ease.outCubic);
  }

  /** 選ばれなかったカードが散り消える */
  async dismissRest() {
    const jobs = [];
    for (const c of this.cards) {
      if (c.picked) continue;
      const dir = Math.atan2(c.group.position.x, c.group.position.z - 0.2);
      jobs.push((async () => {
        await wait(Math.random() * 350);
        tween(c.back.material, { opacity: 0 }, 700, Ease.inOutSine);
        await Promise.all([
          tween(c.group.position, {
            x: c.group.position.x + Math.sin(dir) * 0.5,
            z: c.group.position.z + Math.cos(dir) * 0.5,
            y: TABLE_Y + 0.12,
          }, 800, Ease.inQuad),
          tween(c.group.rotation, { z: c.group.rotation.z + (Math.random() - 0.5) * 2.4 }, 800, Ease.inQuad),
        ]);
        c.group.visible = false;
      })());
    }
    await Promise.all(jobs);
  }

  /** カード表面を設定(公開直前に呼ぶ) */
  assignFace(card, suit, rank) {
    card.faceCard = { suit, rank };
    const tex = makeFaceTexture(suit, rank);
    card.front.material.map = tex;
    card.front.material.visible = true;
    card.front.material.needsUpdate = true;
  }

  /**
   * カードの公開 ― 浮き上がってめくれ、目の前まで迫ってくる
   */
  async reveal(card, slotIndex) {
    const slot = SLOTS[slotIndex];
    // 1) 浮き上がる
    await tween(card.group.position, { y: TABLE_Y + 0.16 }, 700, Ease.inOutCubic);
    // 2) めくれる(X軸で半回転し、表がカメラ側へ)
    sfxCardFlip();
    await tween(card.group.rotation, { x: -Math.PI / 2 + Math.PI }, 640, Ease.inOutCubic);
    sfxChime(720 + slotIndex * 120, 0.05);
    // 3) 拡大しながら目の前へ ― 正面に立てて提示する
    await Promise.all([
      tween(card.group.rotation, { x: Math.PI * 0.88, z: 0 }, 900, Ease.inOutCubic),
      tween(card.group.position, {
        x: 0, y: TABLE_Y + 0.27, z: slot.z + 0.68,
      }, 900, Ease.inOutCubic),
      tween(card.group.scale, { x: 1.65, y: 1.65, z: 1.65 }, 900, Ease.inOutCubic),
    ]);
  }

  /** 読み終えたカードをスロットへ静かに戻す(表向き) */
  async settle(card, slotIndex) {
    const slot = SLOTS[slotIndex];
    sfxCardSlide();
    await Promise.all([
      tween(card.group.rotation, { x: Math.PI / 2 }, 800, Ease.inOutCubic),
      tween(card.group.position, { x: slot.x, y: TABLE_Y + CARD_LIFT * 3, z: slot.z }, 800, Ease.inOutCubic),
      tween(card.group.scale, { x: 1, y: 1, z: 1 }, 800, Ease.inOutCubic),
    ]);
  }

  /** すべて初期状態へ(もう一度占う) */
  reset() {
    for (const c of this.cards) {
      c.picked = false;
      c.revealed = false;
      c.faceCard = null;
      c.front.material.visible = false;
      c.front.material.map = null;
      c.back.material.opacity = 1;
      c.glowMat.opacity = 0;
      c.group.visible = false;
      c.group.rotation.set(-Math.PI / 2, 0, 0);
      c.group.scale.set(1, 1, 1);
      c.group.position.set(0, TABLE_Y + CARD_LIFT, 0.8);
    }
    this.hideSlotLabels();
    this.hovered = null;
    this.pickable = false;
  }

  /** 待機中の微細な揺らぎ */
  update(t) {
    // 公開済みカードはゆっくり呼吸するように浮遊
    for (let i = 0; i < this.cards.length; i++) {
      const c = this.cards[i];
      if (c.revealed) {
        c.group.position.y += Math.sin(t * 0.9 + i * 2.1) * 0.00004;
      }
    }
  }
}
