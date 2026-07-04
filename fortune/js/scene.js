// ============================================================
// 占い館の空間 ― 卓・照明・キャンドル・水晶玉・漂う塵
// ============================================================

import * as THREE from "three";

const TABLE_Y = 0.95;
const TABLE_R = 0.85;

// ---------- Canvas テクスチャ ----------

function makeClothTexture() {
  const S = 1024;
  const cv = document.createElement("canvas");
  cv.width = S; cv.height = S;
  const ctx = cv.getContext("2d");

  // ベルベット地
  const bg = ctx.createRadialGradient(S / 2, S / 2, 40, S / 2, S / 2, S / 2);
  bg.addColorStop(0, "#331a66");
  bg.addColorStop(0.55, "#200f48");
  bg.addColorStop(1, "#120830");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  // 布の織りムラ
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * S, y = Math.random() * S;
    ctx.fillStyle = `rgba(${90 + Math.random() * 40}, ${60 + Math.random() * 30}, ${140 + Math.random() * 50}, ${Math.random() * 0.05})`;
    ctx.fillRect(x, y, 2.2, 2.2);
  }

  const cx = S / 2, cy = S / 2;
  ctx.strokeStyle = "rgba(201, 168, 106, 0.78)";
  ctx.fillStyle = "rgba(201, 168, 106, 0.85)";

  // 外周の環
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(cx, cy, S * 0.462, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(cx, cy, S * 0.443, 0, Math.PI * 2); ctx.stroke();

  // 中央の魔法円
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, S * 0.30, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(cx, cy, S * 0.272, 0, Math.PI * 2); ctx.stroke();

  // 目盛りと星
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const r1 = S * 0.30, r2 = S * (i % 3 === 0 ? 0.325 : 0.312);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }

  // 星位記号
  ctx.font = `44px "Hiragino Mincho ProN", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const glyphs = ["✦", "☽", "✧", "★", "☾", "✶", "✧", "✦"];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = S * 0.385;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(glyphs[i], 0, 0);
    ctx.restore();
  }

  // 中央の三日月と目
  ctx.font = `90px "Hiragino Mincho ProN", serif`;
  ctx.globalAlpha = 0.55;
  ctx.fillText("☽", cx, cy);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeFloorTexture() {
  const S = 1024;
  const cv = document.createElement("canvas");
  cv.width = S; cv.height = S;
  const ctx = cv.getContext("2d");
  const bg = ctx.createRadialGradient(S / 2, S / 2, 50, S / 2, S / 2, S * 0.7);
  bg.addColorStop(0, "#17102a");
  bg.addColorStop(1, "#060310");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  // 石畳風の亀裂
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  for (let i = 0; i < 60; i++) {
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    let x = Math.random() * S, y = Math.random() * S;
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (Math.random() - 0.5) * 160;
      y += (Math.random() - 0.5) * 160;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // 淡い模様
  ctx.strokeStyle = "rgba(120, 90, 190, 0.08)";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.4, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.28, 0, Math.PI * 2); ctx.stroke();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function softGlowTexture(inner, mid, outer) {
  const cv = document.createElement("canvas");
  cv.width = 128; cv.height = 128;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, inner);
  g.addColorStop(0.4, mid);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- 環境構築 ----------

export function buildEnvironment(scene) {
  scene.background = new THREE.Color(0x04020a);
  scene.fog = new THREE.FogExp2(0x05030c, 0.30);

  // ベース照明
  const hemi = new THREE.HemisphereLight(0x2a2046, 0x0a0614, 0.55);
  scene.add(hemi);

  // 頭上のランタン(主光源)
  const spot = new THREE.SpotLight(0xffd3a0, 24, 7.5, 0.62, 0.55, 1.8);
  spot.position.set(0, 3.1, 0.15);
  spot.target.position.set(0, TABLE_Y, -0.05);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.002;
  scene.add(spot, spot.target);

  // ランタン本体
  const lanternGroup = new THREE.Group();
  lanternGroup.position.set(0, 3.15, 0.15);
  const lanternGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softGlowTexture("rgba(255, 214, 150, 0.95)", "rgba(255, 170, 80, 0.35)", "rgba(255, 150, 60, 0)"),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  lanternGlow.scale.setScalar(0.55);
  lanternGroup.add(lanternGlow);
  const lanternBody = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.16, 6, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x28180a, roughness: 0.8, metalness: 0.7, side: THREE.DoubleSide })
  );
  lanternBody.position.y = 0.12;
  lanternGroup.add(lanternBody);
  // 吊り鎖
  const chain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 1.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.9, metalness: 0.6 })
  );
  chain.position.y = 0.95;
  lanternGroup.add(chain);
  scene.add(lanternGroup);

  // 床
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(7, 48),
    new THREE.MeshStandardMaterial({ map: makeFloorTexture(), roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // 円卓
  const table = new THREE.Group();
  const clothTex = makeClothTexture();
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(TABLE_R, TABLE_R, 0.045, 48),
    [
      new THREE.MeshStandardMaterial({ color: 0x160b2c, roughness: 0.92 }),
      new THREE.MeshStandardMaterial({ map: clothTex, roughness: 0.94 }),
      new THREE.MeshStandardMaterial({ color: 0x0d0620, roughness: 0.95 }),
    ]
  );
  top.position.y = TABLE_Y - 0.0225;
  top.receiveShadow = true;
  table.add(top);

  // 垂れ布
  const drape = new THREE.Mesh(
    new THREE.CylinderGeometry(TABLE_R + 0.012, TABLE_R - 0.06, 0.34, 48, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x120826, roughness: 0.96, side: THREE.DoubleSide })
  );
  drape.position.y = TABLE_Y - 0.21;
  table.add(drape);

  // 脚
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.16, TABLE_Y - 0.05, 16),
    new THREE.MeshStandardMaterial({ color: 0x0e081c, roughness: 0.9 })
  );
  leg.position.y = (TABLE_Y - 0.05) / 2;
  table.add(leg);
  scene.add(table);

  // 水晶玉(卓の左奥)
  const crystalGroup = new THREE.Group();
  crystalGroup.position.set(-0.52, TABLE_Y, -0.38);
  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.075, 0.05, 20),
    new THREE.MeshStandardMaterial({ color: 0x3a2a12, roughness: 0.5, metalness: 0.85 })
  );
  stand.position.y = 0.025;
  crystalGroup.add(stand);
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 32, 24),
    new THREE.MeshPhysicalMaterial({
      color: 0xbfaaff, roughness: 0.06, metalness: 0,
      transmission: 0.92, thickness: 0.12, ior: 1.5,
      transparent: true, opacity: 0.98,
    })
  );
  orb.position.y = 0.125;
  crystalGroup.add(orb);
  const orbGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softGlowTexture("rgba(190, 160, 255, 0.7)", "rgba(130, 90, 230, 0.25)", "rgba(90, 50, 200, 0)"),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  orbGlow.position.y = 0.125;
  orbGlow.scale.setScalar(0.34);
  crystalGroup.add(orbGlow);
  const orbLight = new THREE.PointLight(0x8a66e8, 0.9, 1.4, 2);
  orbLight.position.y = 0.16;
  crystalGroup.add(orbLight);
  scene.add(crystalGroup);

  // 蝋燭(卓の左右)
  const candles = [];
  const flameTex = softGlowTexture("rgba(255, 240, 200, 1)", "rgba(255, 176, 70, 0.55)", "rgba(255, 120, 30, 0)");
  for (const [cx, cz] of [[0.68, 0.10], [-0.66, 0.16]]) {
    const g = new THREE.Group();
    g.position.set(cx, TABLE_Y, cz);
    const wax = new THREE.Mesh(
      new THREE.CylinderGeometry(0.021, 0.026, 0.11, 12),
      new THREE.MeshStandardMaterial({ color: 0xd8cbb2, roughness: 0.65 })
    );
    wax.position.y = 0.055;
    g.add(wax);
    const dish = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.05, 0.012, 16),
      new THREE.MeshStandardMaterial({ color: 0x3a2a12, roughness: 0.5, metalness: 0.8 })
    );
    dish.position.y = 0.006;
    g.add(dish);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flameTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    flame.position.y = 0.145;
    flame.scale.set(0.05, 0.085, 1);
    g.add(flame);
    const light = new THREE.PointLight(0xffb264, 1.6, 2.2, 2);
    light.position.y = 0.16;
    g.add(light);
    scene.add(g);
    candles.push({ flame, light, seed: Math.random() * 100 });
  }

  // 背景の柱(霧の中の気配)
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x0d0820, roughness: 0.9 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 5.4, 10), pillarMat);
    p.position.set(Math.cos(a) * 4.1, 2.7, Math.sin(a) * 4.1);
    scene.add(p);
  }

  // 宙に浮く灯(遠景の妖精灯)
  const floatingLights = [];
  const fairyTex = softGlowTexture("rgba(255, 226, 170, 0.9)", "rgba(230, 170, 90, 0.3)", "rgba(200, 130, 60, 0)");
  for (let i = 0; i < 10; i++) {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: fairyTex, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, opacity: 0.5 + Math.random() * 0.4,
    }));
    const a = Math.random() * Math.PI * 2;
    const r = 2.2 + Math.random() * 1.8;
    spr.position.set(Math.cos(a) * r, 1.3 + Math.random() * 1.8, Math.sin(a) * r);
    spr.scale.setScalar(0.1 + Math.random() * 0.12);
    spr.userData = { baseY: spr.position.y, phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.5 };
    scene.add(spr);
    floatingLights.push(spr);
  }

  // 漂う塵
  const DUST = 220;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(DUST * 3);
  const dustData = [];
  for (let i = 0; i < DUST; i++) {
    dustData.push({
      x: (Math.random() - 0.5) * 3.4,
      y: 0.6 + Math.random() * 2.2,
      z: (Math.random() - 0.5) * 3.4,
      p: Math.random() * Math.PI * 2,
      s: 0.02 + Math.random() * 0.05,
    });
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.011,
    map: softGlowTexture("rgba(255, 235, 200, 0.9)", "rgba(255, 220, 170, 0.3)", "rgba(255, 200, 140, 0)"),
    transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }));
  scene.add(dust);

  // ---------- 毎フレーム更新 ----------
  return {
    update(t, dt) {
      // 蝋燭の揺らめき
      for (const c of candles) {
        const n = Math.sin(t * 9.1 + c.seed) * 0.5 + Math.sin(t * 23.7 + c.seed * 2) * 0.3 + Math.sin(t * 4.3 + c.seed * 3) * 0.2;
        c.light.intensity = 1.5 + n * 0.45;
        c.flame.scale.set(0.05 + n * 0.006, 0.085 + n * 0.014, 1);
        c.flame.position.x = Math.sin(t * 7.7 + c.seed) * 0.004;
      }
      // ランタンのゆったりした明滅
      spot.intensity = 24 + Math.sin(t * 1.7) * 1.5 + Math.sin(t * 5.3) * 0.8;

      // 水晶玉の内なる光
      orbLight.intensity = 0.9 + Math.sin(t * 1.1) * 0.25;
      orbGlow.material.opacity = 0.75 + Math.sin(t * 1.1) * 0.2;

      // 妖精灯の浮遊
      for (const f of floatingLights) {
        f.position.y = f.userData.baseY + Math.sin(t * f.userData.speed + f.userData.phase) * 0.12;
      }

      // 塵の漂い
      const arr = dustGeo.attributes.position.array;
      for (let i = 0; i < dustData.length; i++) {
        const d = dustData[i];
        arr[i * 3] = d.x + Math.sin(t * d.s * 8 + d.p) * 0.12;
        arr[i * 3 + 1] = d.y + Math.sin(t * d.s * 5 + d.p * 2) * 0.1;
        arr[i * 3 + 2] = d.z + Math.cos(t * d.s * 6 + d.p) * 0.12;
      }
      dustGeo.attributes.position.needsUpdate = true;
    },
  };
}
