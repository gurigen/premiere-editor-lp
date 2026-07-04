// ============================================================
// 書き出しワープ ― フルスクリーンGLSLトンネル
//   「素材(raw)が完成映像に変わる瞬間」を光のトンネルで描く。
//   前半: ノイズ・色ズレだらけの荒い素材
//   後半: ティール&オレンジ+バイオレットの完成グレード
// ============================================================

import * as THREE from "three";

const VERT = /* glsl */`
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */`
  precision highp float;

  uniform vec2  uRes;
  uniform float uTime;      // ワープ内の経過秒
  uniform float uSpeed;     // 走行速度(0-1)
  uniform float uGrade;     // 0=荒い素材 → 1=完成グレード
  uniform float uAlpha;     // 全体の不透明度(フェードアウト用)

  // ---- ノイズユーティリティ ----
  float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.1 + vec2(13.7, 7.3);
      a *= 0.5;
    }
    return v;
  }

  // ---- トンネル1サンプル(色ズレ用にオフセット付きで呼ぶ) ----
  vec3 tunnel(vec2 uv, float aShift) {
    float r = length(uv);
    float ang = atan(uv.y, uv.x) + aShift;

    // 奥行き。中心ほど遠い
    float z = 0.55 / (r + 0.06) + uTime * (2.0 + uSpeed * 14.0);

    // 放射状の光の筋
    float streaks = fbm(vec2(ang * 5.2, z * 0.9));
    streaks = pow(smoothstep(0.42, 0.95, streaks), 2.2);

    // 細く鋭い高速ライン
    float lines = fbm(vec2(ang * 14.0, z * 2.4));
    lines = pow(smoothstep(0.62, 0.98, lines), 3.0) * uSpeed;

    // リング(タイムラインの目盛りが飛んでいくイメージ)
    float rings = smoothstep(0.75, 1.0, sin(z * 3.0) * 0.5 + 0.5) * 0.4;

    // --- 荒い素材フェーズの色(濁ったグレー緑) ---
    vec3 rawCol = vec3(0.45, 0.48, 0.44) * streaks
                + vec3(0.30, 0.32, 0.30) * rings;

    // --- 完成グレードの色(ティール→バイオレット→オレンジ) ---
    vec3 teal   = vec3(0.16, 0.85, 0.82);
    vec3 violet = vec3(0.58, 0.48, 1.00);
    vec3 orange = vec3(1.00, 0.62, 0.28);
    float bandPos = fract(ang / 6.28318 + z * 0.02);
    vec3 grade = mix(teal, violet, smoothstep(0.0, 0.5, bandPos));
    grade = mix(grade, orange, smoothstep(0.55, 1.0, bandPos));
    vec3 gradedCol = grade * (streaks * 1.5 + lines * 2.2) + violet * rings * 0.8;

    vec3 col = mix(rawCol * (streaks + lines), gradedCol, uGrade);

    // 中心の吸い込まれる光(グレードが進むほど輝く)
    float core = pow(smoothstep(0.5, 0.0, r), 3.0);
    vec3 coreCol = mix(vec3(0.5), mix(teal, vec3(1.0), 0.6), uGrade);
    col += coreCol * core * (0.5 + uGrade * 1.6) * (0.6 + uSpeed);

    return col;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y);

    // 色収差: 荒いフェーズほど大きくRGBがズレる
    float ca = (1.0 - uGrade) * 0.045 + 0.006;
    vec3 col;
    col.r = tunnel(uv * (1.0 + ca), 0.0).r;
    col.g = tunnel(uv, 0.002).g;
    col.b = tunnel(uv * (1.0 - ca), -0.002).b;

    // 荒いフェーズ: 走査線 + ブロックノイズ + 大粒グレイン
    float scan = sin(gl_FragCoord.y * 1.7 + uTime * 30.0) * 0.5 + 0.5;
    col *= mix(0.82 + scan * 0.18, 1.0, uGrade);

    float blockN = step(0.82, hash(floor(uv * vec2(9.0, 5.0)) + floor(uTime * 9.0)));
    col += vec3(blockN) * (1.0 - uGrade) * 0.10;

    float grain = hash(gl_FragCoord.xy + uTime * 60.0);
    col += (grain - 0.5) * mix(0.22, 0.05, uGrade);

    // ビネット
    float vig = smoothstep(1.55, 0.35, length(uv));
    col *= vig;

    gl_FragColor = vec4(col, uAlpha);
  }
`;

export function createWarp(renderer) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uRes:   { value: new THREE.Vector2(1, 1) },
    uTime:  { value: 0 },
    uSpeed: { value: 0 },
    uGrade: { value: 0 },
    uAlpha: { value: 1 },
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  scene.add(quad);

  function resize() {
    const size = renderer.getSize(new THREE.Vector2());
    uniforms.uRes.value.set(
      size.x * renderer.getPixelRatio(),
      size.y * renderer.getPixelRatio()
    );
  }
  resize();

  return {
    scene,
    camera,
    uniforms,
    resize,
    dispose() {
      quad.geometry.dispose();
      mat.dispose();
    },
  };
}
