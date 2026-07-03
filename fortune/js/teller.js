// ============================================================
// 影の占い師 ― 実体を持たない黒い影の存在
//   ・輪郭がノイズで常に揺らぐシェーダー
//   ・裾は煙となって虚空に溶ける
//   ・多関節の腕 + 長い指によるプロシージャルなジェスチャー
//   ・視線追従・瞬き・呼吸・浮遊などの生きた待機モーション
// ============================================================

import * as THREE from "three";
import { tween, wait, Ease } from "./tween.js";

// ---------- 影のシェーダー ----------

const SHADOW_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying float vLocalY;

  float wob(vec3 p) {
    return sin(p.x * 6.3 + uTime * 1.35) * 0.5
         + sin(p.y * 4.7 - uTime * 1.05) * 0.32
         + sin((p.z + p.x) * 7.9 + uTime * 1.85) * 0.18;
  }

  void main() {
    vLocalY = position.y;
    vec3 p = position;
    // 下にいくほど大きく揺らぐ(裾が煙のように)
    float lowFactor = smoothstep(1.15, 0.0, position.y);
    float n = wob(position) + 0.55 * wob(position * 2.31 + 13.7);
    p += normal * n * uAmp * (0.3 + lowFactor * 1.4);
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vPosW = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SHADOW_FRAG = /* glsl */ `
  uniform vec3 uRim;
  uniform float uRimStrength;
  uniform float uGlow;
  uniform float uHemY;
  uniform float uHemRange;
  uniform float uOpacity;
  uniform float uTime;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying float vLocalY;

  void main() {
    vec3 V = normalize(cameraPosition - vPosW);
    vec3 N = normalize(vNormalW);
    float fres = pow(1.0 - abs(dot(N, V)), 2.6);
    vec3 base = vec3(0.030, 0.024, 0.052);
    vec3 col = base + uRim * fres * (uRimStrength + uGlow);
    // 裾の溶解(ノイズ混じりに透ける)
    float hemNoise = sin(vPosW.x * 21.0 + uTime * 2.2) * 0.5
                   + sin(vPosW.z * 17.0 - uTime * 1.7) * 0.5;
    float hem = smoothstep(uHemY, uHemY + uHemRange, vLocalY + hemNoise * 0.045);
    float alpha = uOpacity * hem * (0.94 + fres * 0.06);
    gl_FragColor = vec4(col, alpha);
  }
`;

function makeShadowMat({ amp = 0.02, hemY = -10, hemRange = 0.3, rimStrength = 0.55, opacity = 0.97 } = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: SHADOW_VERT,
    fragmentShader: SHADOW_FRAG,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: amp },
      uRim: { value: new THREE.Color(0x53379f) },
      uRimStrength: { value: rimStrength },
      uGlow: { value: 0 },
      uHemY: { value: hemY },
      uHemRange: { value: hemRange },
      uOpacity: { value: opacity },
    },
  });
}

// ---------- テクスチャ ----------

function softCircleTexture(inner, outer) {
  const cv = document.createElement("canvas");
  cv.width = 64; cv.height = 64;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function eyeTexture() {
  const cv = document.createElement("canvas");
  cv.width = 128; cv.height = 64;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(64, 32, 2, 64, 32, 30);
  g.addColorStop(0, "rgba(240, 235, 255, 1)");
  g.addColorStop(0.28, "rgba(190, 160, 255, 0.9)");
  g.addColorStop(0.6, "rgba(130, 90, 230, 0.4)");
  g.addColorStop(1, "rgba(90, 50, 200, 0)");
  ctx.fillStyle = g;
  ctx.save();
  ctx.translate(64, 32);
  ctx.scale(1.9, 1);
  ctx.translate(-64, -32);
  ctx.fillRect(-64, 0, 256, 64);
  ctx.restore();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ============================================================

export class ShadowTeller {
  constructor(scene) {
    this.scene = scene;
    this.materials = [];
    this.time = 0;
    this.speaking = false;
    this.speakLevel = 0;   // 0-1 目の輝き・声の脈動
    this.gazeWeight = 0.6; // カメラへの視線追従の強さ
    this.gaze = { x: 0, y: 0 };
    this.blinkTimer = 2.5;
    this.blinkPhase = 0;
    this.shuffleGesture = false;
    this.presence = { v: 0 }; // 出現度 0-1

    // 全体グループ(卓の向こう側・プレイヤーに正対)
    this.group = new THREE.Group();
    this.group.position.set(0, 0, -1.32);
    this.group.scale.setScalar(1.1);
    scene.add(this.group);

    this.root = new THREE.Group(); // 浮遊・呼吸用
    this.group.add(this.root);

    this._buildBody();
    this._buildHead();
    this._buildArms();
    this._buildWisps();
    this._buildGroundMist();
    this._buildLight();

    this.setVisible(false);
  }

  _shadowMat(opts) {
    const m = makeShadowMat(opts);
    this.materials.push(m);
    return m;
  }

  // ---------- 造形 ----------

  _buildBody() {
    // ローブ姿の胴体(回転体)
    const profile = [
      [0.44, 0.00], [0.47, 0.10], [0.42, 0.26], [0.35, 0.52],
      [0.37, 0.70], [0.32, 0.92], [0.27, 1.10], [0.21, 1.24],
      [0.11, 1.33], [0.05, 1.38],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const geo = new THREE.LatheGeometry(profile, 48);
    this.bodyMat = this._shadowMat({ amp: 0.035, hemY: 0.12, hemRange: 0.5, rimStrength: 0.50 });
    const body = new THREE.Mesh(geo, this.bodyMat);
    body.scale.z = 0.8;
    this.body = body;
    this.root.add(body);
  }

  _buildHead() {
    this.head = new THREE.Group();
    this.head.position.set(0, 1.47, 0.03);
    this.head.userData.base = { x: 0, y: 0, z: 0 };
    this.root.add(this.head);

    // 頭部
    const skullMat = this._shadowMat({ amp: 0.012, rimStrength: 0.10 });
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.105, 32, 24), skullMat);
    skull.scale.set(0.95, 1.14, 1.0);
    this.head.add(skull);

    // フード(前方が開いた回転体)
    const hoodProfile = [
      [0.155, -0.14], [0.175, -0.02], [0.165, 0.08],
      [0.135, 0.155], [0.075, 0.205], [0.01, 0.225],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const gap = 1.9; // 前方の開口(ラジアン)
    const hoodGeo = new THREE.LatheGeometry(hoodProfile, 40, gap / 2, Math.PI * 2 - gap);
    const hoodMat = this._shadowMat({ amp: 0.018, rimStrength: 0.62 });
    const hood = new THREE.Mesh(hoodGeo, hoodMat);
    hood.position.y = 0.015;
    this.head.add(hood);

    // 顔の虚空(奥の完全な黒)
    const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.97 });
    this.faceVoid = new THREE.Mesh(new THREE.CircleGeometry(0.098, 24), voidMat);
    this.faceVoid.position.set(0, 0.01, 0.05);
    this.faceVoid.renderOrder = 1; // 目より先に描く(ソート順の反転で目が塗り潰されるのを防ぐ)
    this.head.add(this.faceVoid);

    // 双眸(本体 + 後光)
    const eyeTex = eyeTexture();
    this.eyes = [];
    this.eyeMats = [];
    this.eyeHaloMats = [];
    for (const sx of [-1, 1]) {
      const mat = new THREE.MeshBasicMaterial({
        map: eyeTex, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const eye = new THREE.Mesh(new THREE.PlaneGeometry(0.058, 0.027), mat);
      eye.position.set(sx * 0.034, 0.012, 0.098);
      eye.renderOrder = 3;
      this.head.add(eye);
      this.eyes.push(eye);
      this.eyeMats.push(mat);

      const haloMat = new THREE.MeshBasicMaterial({
        map: eyeTex, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.046), haloMat);
      halo.position.set(sx * 0.034, 0.012, 0.093);
      halo.renderOrder = 2;
      this.head.add(halo);
      this.eyeHaloMats.push(haloMat);
    }
  }

  _buildArms() {
    this.j = { head: this.head };
    this.fingers = { L: [], R: [] };
    this.curl = {
      L: { base: 0.45, splay: 0.0 },
      R: { base: 0.45, splay: 0.0 },
    };

    for (const side of ["L", "R"]) {
      const s = side === "L" ? -1 : 1;

      // 肩
      const shoulder = new THREE.Group();
      shoulder.position.set(s * 0.235, 1.235, 0.055);
      shoulder.userData.base = { x: -0.95, y: 0, z: s * -0.14 };
      this.root.add(shoulder);

      const armMat = this._shadowMat({ amp: 0.01, rimStrength: 0.45 });
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.034, 0.34, 12), armMat);
      upper.position.y = -0.17;
      shoulder.add(upper);

      // 肘
      const elbow = new THREE.Group();
      elbow.position.y = -0.34;
      elbow.userData.base = { x: -0.55, y: 0, z: 0 };
      shoulder.add(elbow);

      const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.02, 0.32, 12), armMat);
      fore.position.y = -0.16;
      elbow.add(fore);

      // 手首
      const wrist = new THREE.Group();
      wrist.position.y = -0.32;
      wrist.userData.base = { x: 0.62, y: 0, z: 0 };
      elbow.add(wrist);

      // 手のひら
      const hand = new THREE.Group();
      wrist.add(hand);
      const palmMat = this._shadowMat({ amp: 0.006, rimStrength: 0.5 });
      const palm = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), palmMat);
      palm.scale.set(1.0, 0.38, 1.25);
      palm.position.set(0, -0.02, 0.035);
      hand.add(palm);

      // 長い指(親指 + 4本)
      const fingerMat = this._shadowMat({ amp: 0.004, rimStrength: 0.55 });
      const positions = [
        { x: -0.030, z: 0.062, len: 0.095, spread: -0.10 },
        { x: -0.011, z: 0.070, len: 0.115, spread: -0.03 },
        { x: 0.009, z: 0.070, len: 0.120, spread: 0.03 },
        { x: 0.028, z: 0.062, len: 0.100, spread: 0.10 },
        // 親指
        { x: s * -0.045, z: 0.012, len: 0.080, spread: s * -0.55, thumb: true },
      ];
      for (const fp of positions) {
        const fgroup = new THREE.Group();
        fgroup.position.set(fp.x, -0.02, fp.z);
        fgroup.userData.spread = fp.spread;
        fgroup.userData.phase = Math.random() * Math.PI * 2;
        const f = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0045, 0.0085, fp.len, 8), fingerMat);
        f.rotation.x = Math.PI / 2;
        f.position.z = fp.len / 2;
        fgroup.add(f);
        // 爪先(先端を細く)
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0045, 0.03, 8), fingerMat);
        tip.rotation.x = Math.PI / 2;
        tip.position.z = fp.len + 0.014;
        fgroup.add(tip);
        hand.add(fgroup);
        this.fingers[side].push(fgroup);
      }

      this.j["sh" + side] = shoulder;
      this.j["el" + side] = elbow;
      this.j["wr" + side] = wrist;
    }
  }

  _buildWisps() {
    // 体から立ち昇る霊気の粒子
    const COUNT = 130;
    this.wispData = [];
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      this.wispData.push(this._newWisp(true));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.wispGeo = geo;
    this.wispMat = new THREE.PointsMaterial({
      size: 0.042,
      map: softCircleTexture("rgba(140, 105, 235, 0.55)", "rgba(80, 50, 180, 0)"),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.wisps = new THREE.Points(geo, this.wispMat);
    this.group.add(this.wisps);
  }

  _newWisp(randomAge = false) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.14 + Math.random() * 0.3;
    return {
      x: Math.cos(a) * r,
      y: 0.05 + Math.random() * 1.25,
      z: Math.sin(a) * r * 0.8,
      vy: 0.10 + Math.random() * 0.16,
      swirl: Math.random() * Math.PI * 2,
      swirlSpeed: 0.6 + Math.random() * 1.4,
      life: randomAge ? Math.random() : 0,
      maxLife: 2.2 + Math.random() * 2.4,
    };
  }

  _buildGroundMist() {
    // 足元(卓の向こうの床)に広がる闇だまり
    const tex = softCircleTexture("rgba(4, 2, 12, 0.95)", "rgba(4, 2, 12, 0)");
    this.mistMat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0, depthWrite: false,
    });
    const mist = new THREE.Mesh(new THREE.CircleGeometry(0.85, 32), this.mistMat);
    mist.rotation.x = -Math.PI / 2;
    mist.position.y = 0.012;
    this.mist = mist;
    this.group.add(mist);
  }

  _buildLight() {
    // 双眸から漏れる妖しい光
    this.light = new THREE.PointLight(0x7a55e8, 0, 2.2, 2);
    this.light.position.set(0, 1.45, 0.25);
    this.group.add(this.light);
  }

  setVisible(v) {
    this.group.visible = v;
  }

  // ---------- ポーズ制御 ----------

  _pose(joint, to, dur = 900, ease = Ease.inOutCubic) {
    return tween(joint.userData.base, to, dur, ease);
  }

  _handCurl(side, base, splay, dur = 700) {
    return tween(this.curl[side], { base, splay }, dur, Ease.inOutCubic);
  }

  /** 両腕を基本姿勢(卓の縁に手をかざす)へ */
  restPose(dur = 1100) {
    return Promise.all([
      this._pose(this.j.shL, { x: -0.95, y: 0, z: 0.14 }, dur),
      this._pose(this.j.elL, { x: -0.55, y: 0, z: 0 }, dur),
      this._pose(this.j.wrL, { x: 0.62, y: 0, z: 0 }, dur),
      this._pose(this.j.shR, { x: -0.95, y: 0, z: -0.14 }, dur),
      this._pose(this.j.elR, { x: -0.55, y: 0, z: 0 }, dur),
      this._pose(this.j.wrR, { x: 0.62, y: 0, z: 0 }, dur),
      this._handCurl("L", 0.45, 0, dur),
      this._handCurl("R", 0.45, 0, dur),
      tween(this.j.shL.scale, { y: 1 }, dur, Ease.inOutCubic),
      tween(this.j.shR.scale, { y: 1 }, dur, Ease.inOutCubic),
    ]);
  }

  // ---------- ジェスチャー ----------

  /** 闇の中から現れる */
  async materialize() {
    this.setVisible(true);
    this.presence.v = 0;
    this.root.scale.set(1, 0.25, 1);
    this.root.position.y = -0.35;
    this.bodyMat.uniforms.uHemY.value = 1.6;

    tween(this.mistMat, { opacity: 0.85 }, 2000, Ease.inOutSine);
    tween(this.wispMat, { opacity: 0.42 }, 2600, Ease.inOutSine);
    tween(this.presence, { v: 1 }, 2600, Ease.inOutSine);

    // 体が立ち昇る
    const hem = this.bodyMat.uniforms.uHemY;
    tween(hem, { value: 0.12 }, 2800, Ease.inOutCubic);
    await Promise.all([
      tween(this.root.scale, { y: 1 }, 2600, Ease.inOutCubic),
      tween(this.root.position, { y: 0 }, 2600, Ease.inOutCubic),
    ]);

    // 双眸が灯る(ちらつきながら)
    await wait(200);
    for (const flick of [0.35, 0.1, 0.75, 0.3, 1.0]) {
      tween(this.eyeMats[0], { opacity: flick }, 90, Ease.linear);
      tween(this.eyeHaloMats[0], { opacity: flick * 0.4 }, 90, Ease.linear);
      tween(this.eyeHaloMats[1], { opacity: flick * 0.4 }, 90, Ease.linear);
      await tween(this.eyeMats[1], { opacity: flick }, 90, Ease.linear);
      await wait(50);
    }
    tween(this.light, { intensity: 1.5 }, 900, Ease.inOutSine);
    this.eyesLit = true;
    await wait(300);
  }

  /** 挨拶 ― 腕を広げ、深く頭を垂れる */
  async greet() {
    await Promise.all([
      this._pose(this.j.shL, { x: -0.72, z: -0.55 }, 1100),
      this._pose(this.j.shR, { x: -0.72, z: 0.55 }, 1100),
      this._pose(this.j.elL, { x: -0.3 }, 1100),
      this._pose(this.j.elR, { x: -0.3 }, 1100),
      this._pose(this.j.wrL, { x: 0.25 }, 1100),
      this._pose(this.j.wrR, { x: 0.25 }, 1100),
      this._handCurl("L", 0.12, 0.5, 1100),
      this._handCurl("R", 0.12, 0.5, 1100),
    ]);
    await Promise.all([
      this._pose(this.j.head, { x: 0.38 }, 900),
      tween(this.root.rotation, { x: 0.1 }, 900, Ease.inOutCubic),
    ]);
    await wait(650);
    await Promise.all([
      this._pose(this.j.head, { x: 0 }, 1000),
      tween(this.root.rotation, { x: 0 }, 1000, Ease.inOutCubic),
      this.restPose(1300),
    ]);
  }

  /** カードの上で両手をかざして回す(シャッフル詠唱) */
  async startShuffleGesture() {
    this.shuffleGesture = true;
    await Promise.all([
      this._pose(this.j.shL, { x: -1.32, z: -0.08 }, 900),
      this._pose(this.j.shR, { x: -1.32, z: 0.08 }, 900),
      this._pose(this.j.elL, { x: -0.30 }, 900),
      this._pose(this.j.elR, { x: -0.30 }, 900),
      this._pose(this.j.wrL, { x: 0.9 }, 900),
      this._pose(this.j.wrR, { x: 0.9 }, 900),
      this._handCurl("L", 0.1, 0.65, 900),
      this._handCurl("R", 0.1, 0.65, 900),
      tween(this.j.shL.scale, { y: 1.18 }, 900, Ease.inOutCubic),
      tween(this.j.shR.scale, { y: 1.18 }, 900, Ease.inOutCubic),
    ]);
  }

  async stopShuffleGesture() {
    this.shuffleGesture = false;
    await this.restPose(1100);
  }

  /** プレイヤーへ手を差し伸べ、指先で招く */
  async beckon() {
    await Promise.all([
      this._pose(this.j.shR, { x: -1.22, z: -0.05 }, 1000),
      this._pose(this.j.elR, { x: -0.42 }, 1000),
      this._pose(this.j.wrR, { x: 1.35, z: 0 }, 1000),
      this._handCurl("R", 0.1, 0.15, 1000),
      tween(this.j.shR.scale, { y: 1.22 }, 1000, Ease.inOutCubic),
    ]);
    // 指先をゆっくり手繰り寄せる
    for (let i = 0; i < 2; i++) {
      await this._handCurl("R", 0.85, 0.1, 520);
      await this._handCurl("R", 0.15, 0.15, 520);
    }
    await Promise.all([
      this._pose(this.j.shR, { x: -0.95, z: -0.14 }, 1100),
      this._pose(this.j.elR, { x: -0.55 }, 1100),
      this._pose(this.j.wrR, { x: 0.62 }, 1100),
      this._handCurl("R", 0.45, 0, 1100),
      tween(this.j.shR.scale, { y: 1 }, 1100, Ease.inOutCubic),
    ]);
  }

  /** スロットの上へ手を伸ばす(影ゆえに腕が伸びる) */
  async reachToSlot(slotIndex) {
    const dx = [-0.3, 0, 0.3][slotIndex];
    await Promise.all([
      this._pose(this.j.shR, { x: -1.42, y: dx * 0.3, z: dx * 1.05 }, 1000),
      this._pose(this.j.elR, { x: -0.22 }, 1000),
      this._pose(this.j.wrR, { x: 1.15 }, 1000),
      this._handCurl("R", 0.06, 0.5, 1000),
      tween(this.j.shR.scale, { y: 1.55 }, 1000, Ease.inOutCubic),
    ]);
  }

  /** 手を引き戻す */
  async withdraw() {
    await Promise.all([
      this._pose(this.j.shR, { x: -0.95, y: 0, z: -0.14 }, 1000),
      this._pose(this.j.elR, { x: -0.55 }, 1000),
      this._pose(this.j.wrR, { x: 0.62 }, 1000),
      this._handCurl("R", 0.45, 0, 1000),
      tween(this.j.shR.scale, { y: 1 }, 1000, Ease.inOutCubic),
    ]);
  }

  /** 深いお辞儀(締めの挨拶) */
  async bowDeep() {
    await Promise.all([
      this._pose(this.j.shL, { x: -0.62, z: 0.30 }, 1000),
      this._pose(this.j.shR, { x: -0.62, z: -0.30 }, 1000),
      this._pose(this.j.elL, { x: -1.35 }, 1000),
      this._pose(this.j.elR, { x: -1.35 }, 1000),
      this._pose(this.j.wrL, { x: 0.3 }, 1000),
      this._pose(this.j.wrR, { x: 0.3 }, 1000),
      this._handCurl("L", 0.3, 0.2, 1000),
      this._handCurl("R", 0.3, 0.2, 1000),
    ]);
    await Promise.all([
      this._pose(this.j.head, { x: 0.5 }, 1100),
      tween(this.root.rotation, { x: 0.16 }, 1100, Ease.inOutCubic),
    ]);
    await wait(900);
    await Promise.all([
      this._pose(this.j.head, { x: 0 }, 1200),
      tween(this.root.rotation, { x: 0 }, 1200, Ease.inOutCubic),
      this.restPose(1400),
    ]);
  }

  /** 小さくうなずく */
  async nod() {
    await this._pose(this.j.head, { x: 0.22 }, 420, Ease.inOutQuad);
    await this._pose(this.j.head, { x: 0 }, 520);
  }

  /** 首をかしげる */
  async tiltHead() {
    await this._pose(this.j.head, { z: 0.2 }, 700);
    await wait(500);
    await this._pose(this.j.head, { z: 0 }, 700);
  }

  setSpeaking(v) {
    this.speaking = v;
  }

  // ---------- 毎フレーム更新 ----------

  update(t, dt, camera) {
    this.time = t;
    for (const m of this.materials) m.uniforms.uTime.value = t;

    const p = this.presence.v;

    // 浮遊と呼吸
    this.root.position.y = Math.sin(t * 0.55) * 0.012 * p + (1 - p) * this.root.position.y;
    this.root.rotation.z = Math.sin(t * 0.23) * 0.018 * p;
    const breathe = 1 + Math.sin(t * 0.9) * 0.008 * p;
    this.body.scale.x = breathe;
    this.body.scale.z = 0.8 * breathe;

    // 発話レベル(目の輝きと連動)
    const targetSpeak = this.speaking ? 1 : 0;
    this.speakLevel += (targetSpeak - this.speakLevel) * Math.min(1, dt * 4);

    // 視線 ― カメラの方をゆっくり見る
    if (camera) {
      const v = camera.position.clone();
      this.head.parent.worldToLocal(v);
      v.sub(this.head.position);
      const targetYaw = THREE.MathUtils.clamp(Math.atan2(v.x, v.z), -0.6, 0.6);
      const hd = Math.sqrt(v.x * v.x + v.z * v.z);
      const targetPitch = THREE.MathUtils.clamp(-Math.atan2(v.y, hd), -0.45, 0.45);
      const w = (0.55 + this.speakLevel * 0.45);
      this.gaze.x += (targetPitch * w - this.gaze.x) * Math.min(1, dt * 2.2);
      this.gaze.y += (targetYaw * w - this.gaze.y) * Math.min(1, dt * 2.2);
    }

    // 頭部 = 基本ポーズ + 視線 + 揺らぎ + 発話の相槌
    const hb = this.head.userData.base;
    const speakNod = Math.sin(t * 5.1) * 0.016 * this.speakLevel;
    this.head.rotation.set(
      hb.x + this.gaze.x + Math.sin(t * 0.31) * 0.02 + speakNod,
      hb.y + this.gaze.y + Math.sin(t * 0.27 + 2) * 0.025,
      hb.z + Math.sin(t * 0.4 + 4) * 0.012
    );

    // 腕関節 = 基本ポーズ + 微細な揺らぎ
    const joints = ["shL", "elL", "wrL", "shR", "elR", "wrR"];
    for (let i = 0; i < joints.length; i++) {
      const j = this.j[joints[i]];
      const b = j.userData.base;
      const ph = i * 1.7;
      let gx = 0, gy = 0;
      // シャッフル詠唱中は手が円を描く
      if (this.shuffleGesture && (joints[i] === "shL" || joints[i] === "shR")) {
        const dir = joints[i] === "shL" ? 1 : -1;
        gx = Math.sin(t * 2.4 + (dir > 0 ? 0 : Math.PI)) * 0.09;
        gy = Math.cos(t * 2.4 + (dir > 0 ? 0 : Math.PI)) * 0.09 * dir;
      }
      j.rotation.set(
        b.x + Math.sin(t * 0.7 + ph) * 0.014 + gx,
        b.y + Math.sin(t * 0.53 + ph * 2) * 0.012 + gy,
        b.z + Math.sin(t * 0.61 + ph * 3) * 0.012
      );
    }

    // 指 ― カール + 波打つ蠢き
    for (const side of ["L", "R"]) {
      const c = this.curl[side];
      const fingers = this.fingers[side];
      for (let i = 0; i < fingers.length; i++) {
        const f = fingers[i];
        const wave = Math.sin(t * 1.6 + f.userData.phase + i * 0.9) * 0.09;
        f.rotation.x = c.base + wave;
        f.rotation.y = f.userData.spread * (0.4 + c.splay);
      }
    }

    // 瞬き
    this.blinkPhase -= dt;
    if (this.blinkPhase <= 0) {
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        this.blinkPhase = 0.22;
        this.blinkTimer = 1.8 + Math.random() * 3.5;
      }
    }
    let eyeScaleY = 1;
    if (this.blinkPhase > 0) {
      const bp = this.blinkPhase / 0.22;
      eyeScaleY = Math.abs(bp - 0.5) * 2 * 0.95 + 0.05;
    }
    const glow = 0.85 + Math.sin(t * 7.3) * 0.15 * this.speakLevel + Math.sin(t * 1.7) * 0.06;
    for (const eye of this.eyes) {
      eye.scale.y = eyeScaleY;
      // 出現演出中(eyesLit 前)は materialize() 側が opacity を制御する
      if (this.eyesLit) eye.material.opacity = Math.min(1, glow);
    }
    if (this.eyesLit) {
      for (const halo of this.eyeHaloMats) {
        halo.opacity = Math.min(0.3, glow * 0.26) * eyeScaleY;
      }
    }

    // シェーダーの縁光も発話で強まる
    for (const m of this.materials) {
      m.uniforms.uGlow.value = this.speakLevel * 0.35 + Math.sin(t * 1.3) * 0.05;
    }
    this.light.intensity = p * (1.3 + this.speakLevel * 0.9 + Math.sin(t * 6.1) * 0.18 * this.speakLevel);

    // 闇だまりの脈動
    this.mist.scale.setScalar(1 + Math.sin(t * 0.7) * 0.06);

    // 霊気の粒子
    const pos = this.wispGeo.attributes.position.array;
    for (let i = 0; i < this.wispData.length; i++) {
      const w = this.wispData[i];
      w.life += dt / w.maxLife;
      if (w.life >= 1) {
        Object.assign(w, this._newWisp());
      }
      w.y += w.vy * dt;
      w.swirl += w.swirlSpeed * dt;
      const sway = 0.045 * Math.sin(w.swirl);
      pos[i * 3] = w.x + sway;
      pos[i * 3 + 1] = w.y;
      pos[i * 3 + 2] = w.z + 0.045 * Math.cos(w.swirl * 0.8);
    }
    this.wispGeo.attributes.position.needsUpdate = true;
  }
}
