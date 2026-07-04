// ============================================================
// タイムライン宇宙 ― 発光するシーケンスの上を疾走する世界
//   レーン(V2/V1/A1)・ルーラー・クリップ・再生ヘッド・ゲート・
//   星(キーフレーム)・漂う塵。すべて自己発光+加算合成で構成。
// ============================================================

import * as THREE from "three";

const BG = 0x05060e;

const COL = {
  violet: new THREE.Color(0x9a8cff),
  violetDeep: new THREE.Color(0x6c5ce7),
  teal: new THREE.Color(0x37e0d8),
  orange: new THREE.Color(0xffa14a),
  red: new THREE.Color(0xff3b5c),
  ok: new THREE.Color(0x46e08f),
};

// ---------- Canvas テクスチャ ----------

/** 放射グラデーションのグロー */
function makeGlowTexture(inner = "rgba(154,140,255,0.9)", outer = "rgba(154,140,255,0)") {
  const S = 256;
  const cv = document.createElement("canvas");
  cv.width = S; cv.height = S;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, inner.replace(/[\d.]+\)$/, "0.35)"));
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** クリップ天面のラベル */
function makeClipTexture(code, name, title) {
  const W = 512, H = 288;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");

  // クリップ本体(NLEのクリップ風グラデーション)
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#2a2550");
  bg.addColorStop(0.5, "#1a1638");
  bg.addColorStop(1, "#141130");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 上端のカラーバー
  const bar = ctx.createLinearGradient(0, 0, W, 0);
  bar.addColorStop(0, "#37e0d8");
  bar.addColorStop(0.5, "#9a8cff");
  bar.addColorStop(1, "#ffa14a");
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, W, 14);

  // 枠線
  ctx.strokeStyle = "rgba(154,140,255,0.8)";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  // IN/OUT マーカー
  ctx.fillStyle = "rgba(55,224,216,0.9)";
  ctx.fillRect(0, H - 40, 8, 40);
  ctx.fillStyle = "rgba(255,161,74,0.9)";
  ctx.fillRect(W - 8, H - 40, 8, 40);

  // 波形の飾り
  ctx.strokeStyle = "rgba(154,140,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 24; x < W - 24; x += 6) {
    const a = 12 * (0.3 + Math.abs(Math.sin(x * 0.6)) * Math.random());
    ctx.moveTo(x, H - 52 - a);
    ctx.lineTo(x, H - 52 + a);
  }
  ctx.stroke();

  // テキスト
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(55,224,216,0.95)";
  ctx.font = "700 30px Rajdhani, 'Noto Sans JP', sans-serif";
  ctx.fillText(code, 26, 62);
  ctx.fillStyle = "#eef0fb";
  ctx.font = "900 46px 'Noto Sans JP', sans-serif";
  ctx.fillText(name, 26, 120);
  ctx.fillStyle = "rgba(169,176,210,0.9)";
  ctx.font = "600 26px Rajdhani, 'Noto Sans JP', sans-serif";
  ctx.fillText(title, 26, 168);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** タイムコードラベル */
function makeTcTexture(text, color = "rgba(169,176,210,0.95)") {
  const W = 160, H = 44;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = color;
  ctx.font = "700 30px Rajdhani, ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, H / 2 + 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** ゲート/リングのラベル */
function makeGateTexture(main, sub) {
  const W = 512, H = 128;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  ctx.textAlign = "center";
  ctx.fillStyle = "#eef0fb";
  ctx.font = "700 52px Rajdhani, 'Noto Sans JP', sans-serif";
  ctx.fillText(main, W / 2, 58);
  ctx.fillStyle = "rgba(169,176,210,0.9)";
  ctx.font = "600 30px Rajdhani, 'Noto Sans JP', sans-serif";
  ctx.fillText(sub, W / 2, 102);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- 波形レーンのシェーダー ----------

const WAVE_VERT = /* glsl */`
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const WAVE_FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  varying vec3 vWorld;
  uniform float uTime;
  uniform float uCamZ;
  uniform float uLen;

  float hash(float n) { return fract(sin(n * 91.17) * 43758.5453); }

  void main() {
    // レーンに沿ったバー列
    float along = vUv.y * uLen;           // 世界単位に展開
    float bar = floor(along * 2.4);
    float h = hash(bar);
    float amp = 0.12 + h * 0.62 + sin(uTime * (1.2 + h * 2.0) + bar) * 0.10;
    float centered = abs(vUv.x - 0.5) * 2.0;   // レーン幅方向 0(中央)-1(端)
    float on = 1.0 - smoothstep(amp - 0.12, amp, centered);

    // バー間の隙間
    float gap = smoothstep(0.32, 0.42, fract(along * 2.4));
    gap *= 1.0 - smoothstep(0.58, 0.68, fract(along * 2.4));
    on *= 0.35 + gap * 0.85;

    // 距離フェード(手前と遠方)
    float dist = abs(vWorld.z - uCamZ);
    float fade = smoothstep(60.0, 16.0, dist);

    vec3 col = mix(vec3(1.0, 0.63, 0.29), vec3(1.0, 0.8, 0.5), h);
    gl_FragColor = vec4(col, on * fade * 0.85);
  }
`;

// ============================================================

export function createWorld(renderer, opts = {}) {
  const isMobile = opts.mobile || false;
  const reduced = opts.reduced || false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 16, 58);

  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400);

  // カメラ状態(main.js からトゥイーンされる)
  const cam = {
    z: 0,          // 減衰後の現在位置
    targetZ: 0,    // スクロール由来の目標位置
    y: 1.62,
    fovKick: 0,    // スクロール速度によるFOVの押し込み
    mouseX: 0, mouseY: 0,
  };

  const disposables = [];
  function track(obj) { disposables.push(obj); return obj; }

  const glowViolet = track(makeGlowTexture("rgba(154,140,255,0.9)"));
  const glowTeal = track(makeGlowTexture("rgba(55,224,216,0.9)", "rgba(55,224,216,0)"));
  const glowOrange = track(makeGlowTexture("rgba(255,161,74,0.9)", "rgba(255,161,74,0)"));
  const glowRed = track(makeGlowTexture("rgba(255,59,92,0.95)", "rgba(255,59,92,0)"));

  // ---------- 星空(キーフレームの星) ----------
  {
    const N = isMobile ? 700 : 1500;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const palette = [COL.violet, COL.teal, new THREE.Color(0xffffff), COL.orange];
    for (let i = 0; i < N; i++) {
      const r = 60 + Math.random() * 140;
      const th = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(th) * r;
      pos[i * 3 + 1] = 4 + Math.random() * 90;
      pos[i * 3 + 2] = -Math.random() * 700 + 40;
      const c = palette[(Math.random() * palette.length) | 0];
      const dim = 0.35 + Math.random() * 0.65;
      col[i * 3] = c.r * dim; col[i * 3 + 1] = c.g * dim; col[i * 3 + 2] = c.b * dim;
    }
    const geo = track(new THREE.BufferGeometry());
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = track(new THREE.PointsMaterial({
      size: 0.5, vertexColors: true, fog: false,
      transparent: true, opacity: 0.9, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    scene.add(new THREE.Points(geo, mat));
  }

  // ---------- 遠景の星雲 ----------
  const nebulas = [];
  {
    const defs = [
      [glowViolet, -34, 26, 0.35], [glowTeal, 38, 30, 0.5],
      [glowViolet, 30, 18, 0.28], [glowOrange, -42, 34, 0.42],
      [glowTeal, -26, 22, 0.33], [glowViolet, 44, 28, 0.4],
    ];
    for (let i = 0; i < defs.length; i++) {
      const [tex, x, y, op] = defs[i];
      const mat = track(new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: op * (isMobile ? 0.7 : 1),
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      }));
      const sp = new THREE.Sprite(mat);
      sp.position.set(x, y, -60 - i * 110);
      sp.scale.setScalar(60 + i * 14);
      scene.add(sp);
      nebulas.push(sp);
    }
  }

  // ---------- 地平の光(カメラ追従) ----------
  const horizon = new THREE.Sprite(track(new THREE.SpriteMaterial({
    map: glowTeal, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  })));
  horizon.scale.set(90, 46, 1);
  scene.add(horizon);

  const horizon2 = new THREE.Sprite(track(new THREE.SpriteMaterial({
    map: glowViolet, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  })));
  horizon2.scale.set(50, 26, 1);
  scene.add(horizon2);

  // ---------- 動的グループ(layout ごとに作り直す) ----------
  let trackGroup = null;
  let clips = [];       // { mesh, glow, edge, z, baseY, rise, active }
  let gates = [];       // { group, mats, z, pulse }
  let exportRing = null;
  let waveUniforms = null;
  let totalLen = 240;
  let startZ = 0;

  function disposeGroup(g) {
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => { if (m.map && !m.map.__shared) m.map.dispose(); m.dispose(); });
      }
    });
  }

  /**
   * ページレイアウトから世界を組み立てる。
   * sections: [{ z, code, name, title }] / gatesZ: [z,z,z] / endZ: EXPORTリング位置
   */
  function layout({ sections, gatesZ, endZ, length }) {
    if (trackGroup) { scene.remove(trackGroup); disposeGroup(trackGroup); }
    trackGroup = new THREE.Group();
    clips = []; gates = [];
    totalLen = Math.max(length + 60, 120);
    startZ = 14;

    const L = totalLen;
    const zMid = startZ - L / 2;

    // ===== レーンのベッド =====
    // V1(中央・メイン)
    {
      const geo = new THREE.PlaneGeometry(2.1, L);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x171233, transparent: true, opacity: 0.92,
      });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, 0, zMid);
      trackGroup.add(m);
    }
    // V2(左・サブ)
    {
      const geo = new THREE.PlaneGeometry(1.3, L);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x120e28, transparent: true, opacity: 0.85,
      });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(-1.95, 0, zMid);
      trackGroup.add(m);
    }
    // A1(右・オーディオ)
    {
      const geo = new THREE.PlaneGeometry(1.5, L);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x1c1226, transparent: true, opacity: 0.85,
      });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(2.05, 0, zMid);
      trackGroup.add(m);
    }

    // ===== レーンの発光エッジ =====
    const edgeXs = [
      [-2.62, COL.violetDeep, 0.5], [-1.28, COL.violet, 0.7],
      [-1.07, COL.teal, 0.5], [1.07, COL.teal, 0.5],
      [1.28, COL.orange, 0.55], [2.82, COL.orange, 0.45],
    ];
    for (const [x, c, op] of edgeXs) {
      const geo = new THREE.PlaneGeometry(0.045, L);
      const mat = new THREE.MeshBasicMaterial({
        color: c, transparent: true, opacity: op,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.012, zMid);
      trackGroup.add(m);
    }

    // ===== 波形レーン(A1の上) =====
    {
      waveUniforms = {
        uTime: { value: 0 },
        uCamZ: { value: 0 },
        uLen: { value: L },
      };
      const geo = new THREE.PlaneGeometry(1.3, L);
      const mat = new THREE.ShaderMaterial({
        vertexShader: WAVE_VERT, fragmentShader: WAVE_FRAG,
        uniforms: waveUniforms,
        transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(2.05, 0.02, zMid);
      trackGroup.add(m);
    }

    // ===== ルーラー(目盛り) =====
    {
      const minor = Math.floor(L / 2);
      const geo = new THREE.BoxGeometry(0.16, 0.02, 0.05);
      const mat = new THREE.MeshBasicMaterial({
        color: COL.teal, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const inst = new THREE.InstancedMesh(geo, mat, minor);
      const M = new THREE.Matrix4();
      const S = new THREE.Vector3();
      for (let i = 0; i < minor; i++) {
        const z = startZ - i * 2;
        const major = i % 5 === 0;
        S.set(major ? 2.2 : 1, 1, major ? 1.6 : 1);
        M.compose(
          new THREE.Vector3(-2.98, 0.02, z),
          new THREE.Quaternion(),
          S
        );
        inst.setMatrixAt(i, M);
      }
      inst.instanceMatrix.needsUpdate = true;
      trackGroup.add(inst);
    }

    // ===== タイムコードラベル =====
    {
      const step = 10;
      const count = Math.floor(L / step);
      for (let i = 0; i <= count; i++) {
        const z = startZ - i * step;
        const sec = ((startZ - z) / length) * 144;
        const mm = String(Math.floor(sec / 60)).padStart(2, "0");
        const ss = String(Math.floor(sec % 60)).padStart(2, "0");
        const tex = makeTcTexture(`${mm}:${ss}:00`);
        const mat = new THREE.SpriteMaterial({
          map: tex, transparent: true, opacity: 0.65, depthWrite: false, fog: false,
        });
        const sp = new THREE.Sprite(mat);
        sp.position.set(-4.15, 0.22, z);
        sp.scale.set(1.12, 0.31, 1);
        trackGroup.add(sp);
      }
    }

    // ===== クリップ(各シーン) =====
    for (const s of sections) {
      const tex = makeClipTexture(s.code, s.name, s.title);
      const side = new THREE.MeshBasicMaterial({ color: 0x1d1840 });
      const topMat = new THREE.MeshBasicMaterial({ map: tex });
      const mats = [side, side, topMat, side, side, side];
      const geo = new THREE.BoxGeometry(1.9, 0.34, 3.4);
      const mesh = new THREE.Mesh(geo, mats);
      const baseY = 0.17;
      mesh.position.set(0, baseY, s.z);
      trackGroup.add(mesh);

      // 発光エッジ
      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: COL.violet, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending,
      });
      const edge = new THREE.LineSegments(edgeGeo, edgeMat);
      mesh.add(edge);

      // 下部のグロー
      const glowMat = new THREE.SpriteMaterial({
        map: glowViolet, transparent: true, opacity: 0.25,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      glowMat.map.__shared = true;
      const glow = new THREE.Sprite(glowMat);
      glow.position.set(0, 0.08, s.z);
      glow.scale.set(5.2, 2.4, 1);
      trackGroup.add(glow);

      clips.push({ mesh, glow, edge, z: s.z, baseY, rise: 0, active: false });
    }

    // ===== 3つのゲート =====
    const gateDefs = [
      [COL.teal, glowTeal, "GATE 01", "TIME"],
      [COL.violet, glowViolet, "GATE 02", "AUDIO"],
      [COL.orange, glowOrange, "GATE 03", "REVIEW"],
    ];
    gatesZ.forEach((gz, i) => {
      const [c, gtex, main, sub] = gateDefs[i % 3];
      const group = new THREE.Group();
      const mats = [];
      const mk = (w, h, x, y) => {
        const mat = new THREE.MeshBasicMaterial({
          color: c, transparent: true, opacity: 0.7,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        mats.push(mat);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), mat);
        m.position.set(x, y, 0);
        group.add(m);
      };
      mk(7.4, 0.09, 0, 3.7);        // 上桁
      mk(0.09, 3.7, -3.7, 1.85);    // 左柱
      mk(0.09, 3.7, 3.7, 1.85);     // 右柱

      // 柱の根元のグロー
      for (const gx of [-3.7, 3.7]) {
        const gm = new THREE.SpriteMaterial({
          map: gtex, transparent: true, opacity: 0.4,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        gm.map.__shared = true;
        mats.push(gm);
        const gs = new THREE.Sprite(gm);
        gs.position.set(gx, 0.25, 0);
        gs.scale.set(2.6, 1.4, 1);
        group.add(gs);
      }

      // ラベル
      const lt = makeGateTexture(main, sub);
      const lm = new THREE.SpriteMaterial({
        map: lt, transparent: true, opacity: 0.95, depthWrite: false, fog: false,
      });
      const ls = new THREE.Sprite(lm);
      ls.position.set(0, 4.35, 0);
      ls.scale.set(3.6, 0.9, 1);
      group.add(ls);

      group.position.set(0, 0, gz);
      trackGroup.add(group);
      gates.push({ group, mats, z: gz, pulse: 0 });
    });

    // ===== 終端のEXPORTリング =====
    {
      const group = new THREE.Group();
      const ringMat = new THREE.MeshBasicMaterial({
        color: COL.ok, transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.05, 12, 80), ringMat);
      ring.position.y = 1.9;
      group.add(ring);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.02, 12, 80), ringMat.clone());
      ring2.material.opacity = 0.35;
      ring2.position.y = 1.9;
      group.add(ring2);

      const gm = new THREE.SpriteMaterial({
        map: glowTeal, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      });
      gm.map.__shared = true;
      const gs = new THREE.Sprite(gm);
      gs.position.y = 1.9;
      gs.scale.set(9, 9, 1);
      group.add(gs);

      const lt = makeGateTexture("FINAL EXPORT", "LINE CHECK");
      const lm = new THREE.SpriteMaterial({
        map: lt, transparent: true, opacity: 0.95, depthWrite: false, fog: false,
      });
      const ls = new THREE.Sprite(lm);
      ls.position.set(0, 6.0, 0);
      ls.scale.set(4.4, 1.1, 1);
      group.add(ls);

      group.position.z = endZ;
      trackGroup.add(group);
      exportRing = { group, ring, ring2 };
    }

    scene.add(trackGroup);
  }

  // ---------- 再生ヘッド(カメラ追従) ----------
  const playhead = new THREE.Group();
  {
    const barMat = new THREE.MeshBasicMaterial({
      color: COL.red, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.015, 0.05), barMat);
    bar.position.y = 0.03;
    playhead.add(bar);

    const glowMat = new THREE.SpriteMaterial({
      map: glowRed, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(2.4, 0.8, 1);
    glow.position.y = 0.05;
    playhead.add(glow);

    // 左端のフラッグ
    const flagMat = new THREE.MeshBasicMaterial({
      color: COL.red, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const flagGeo = new THREE.ConeGeometry(0.14, 0.3, 4);
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.rotation.x = Math.PI;
    flag.position.set(-2.98, 0.42, 0);
    playhead.add(flag);
  }
  scene.add(playhead);

  // ---------- 漂う塵 ----------
  const dust = { points: null, base: null, N: isMobile ? 90 : 220 };
  {
    const N = dust.N;
    const pos = new Float32Array(N * 3);
    dust.base = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      dust.base[i * 3] = (Math.random() - 0.5) * 16;
      dust.base[i * 3 + 1] = Math.random() * 6;
      dust.base[i * 3 + 2] = -Math.random() * 30 + 6; // カメラ相対
      pos.set(dust.base.slice(i * 3, i * 3 + 3), i * 3);
    }
    const geo = track(new THREE.BufferGeometry());
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = track(new THREE.PointsMaterial({
      color: 0xbfb6ff, size: 0.05, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      sizeAttenuation: true,
    }));
    dust.points = new THREE.Points(geo, mat);
    scene.add(dust.points);
  }

  // ---------- 更新 ----------
  const clock = { t: 0 };

  function update(now, dt) {
    clock.t = now / 1000;
    const t = clock.t;

    // カメラの減衰追従
    const k = 1 - Math.exp(-dt * 3.4);
    const prevZ = cam.z;
    cam.z += (cam.targetZ - cam.z) * k;
    const vel = (prevZ - cam.z) / Math.max(dt, 1e-4); // 前進で正

    // FOV: スクロール速度で押し込む
    const targetKick = Math.min(Math.abs(vel) * 0.55, 9);
    cam.fovKick += (targetKick - cam.fovKick) * (1 - Math.exp(-dt * 5));
    camera.fov = 58 + cam.fovKick;
    camera.updateProjectionMatrix();

    // 呼吸 + マウスパララックス
    const swayX = reduced ? 0 : Math.sin(t * 0.32) * 0.07;
    const swayY = reduced ? 0 : Math.sin(t * 0.45 + 1.7) * 0.05;
    camera.position.set(
      swayX + cam.mouseX * 0.4,
      cam.y + swayY + cam.mouseY * 0.22,
      cam.z
    );
    camera.lookAt(cam.mouseX * 1.4, 0.6 + cam.y * 0.28 + cam.mouseY * 0.8, cam.z - 10);

    // 再生ヘッドはカメラの少し先
    playhead.position.z = cam.z - 7.2;

    // 地平の光
    horizon.position.set(0, 1.5, cam.z - 62);
    horizon2.position.set(0, 3.5, cam.z - 55);

    // 波形
    if (waveUniforms) {
      waveUniforms.uTime.value = t;
      waveUniforms.uCamZ.value = cam.z;
    }

    // クリップの活性化(近いものが浮かび上がる)
    for (const c of clips) {
      const d = Math.abs(cam.z - 8 - c.z);
      const on = d < 6;
      const target = on ? 1 : 0;
      c.rise += (target - c.rise) * (1 - Math.exp(-dt * 4));
      c.mesh.position.y = c.baseY + c.rise * 0.16;
      c.glow.material.opacity = 0.22 + c.rise * 0.5;
      c.edge.material.opacity = 0.45 + c.rise * 0.5;
    }

    // ゲートのパルス減衰 + 揺らぎ
    for (const g of gates) {
      g.pulse = Math.max(0, g.pulse - dt * 1.4);
      const flicker = reduced ? 0 : Math.sin(t * 2.4 + g.z) * 0.06;
      const boost = g.pulse * 1.6;
      g.mats.forEach((m, i) => {
        const base = i < 3 ? 0.62 : 0.4;
        m.opacity = Math.min(base + flicker + boost, 1);
      });
    }

    // EXPORTリングの回転
    if (exportRing) {
      exportRing.ring.rotation.z = t * 0.25;
      exportRing.ring2.rotation.z = -t * 0.18;
    }

    // 塵(カメラ相対で漂わせ、通り過ぎたら前方へ戻す)
    {
      const attr = dust.points.geometry.getAttribute("position");
      const arr = attr.array;
      for (let i = 0; i < dust.N; i++) {
        const bi = i * 3;
        let rz = dust.base[bi + 2] + cam.z;
        // カメラ後方に出たら前方へループ
        let rel = rz - cam.z;
        if (rel > 8) { dust.base[bi + 2] -= 36; rel -= 36; }
        if (rel < -28) { dust.base[bi + 2] += 36; rel += 36; }
        arr[bi] = dust.base[bi] + Math.sin(t * 0.4 + i) * 0.4;
        arr[bi + 1] = dust.base[bi + 1] + Math.sin(t * 0.3 + i * 2.1) * 0.3;
        arr[bi + 2] = cam.z + rel;
      }
      attr.needsUpdate = true;
    }
  }

  function resize(w, h) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function pulseGate(i) {
    if (gates[i]) gates[i].pulse = 1;
  }

  function dispose() {
    if (trackGroup) { scene.remove(trackGroup); disposeGroup(trackGroup); }
    disposables.forEach((d) => d.dispose && d.dispose());
  }

  return {
    scene, camera, cam,
    layout, update, resize, pulseGate, dispose,
    get gates() { return gates; },
    get startZ() { return startZ; },
  };
}
