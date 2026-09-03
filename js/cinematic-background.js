import * as THREE from "three";
import { createWarp } from "./warp.js";

const canvas = document.querySelector("#cinematic-space");
const flash = document.querySelector("[data-warp-flash]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
const pixelRatio = Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.35 : 1.8);

const revealPage = () => {
  document.body.classList.remove("is-intro-running");
  document.body.classList.add("is-hero-revealed", "is-space-ready");
};

if (!canvas) {
  revealPage();
} else {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !coarsePointer,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03040a);
    scene.fog = new THREE.FogExp2(0x05060d, 0.014);

    const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 320);
    camera.position.set(0, 0.5, 7);

    const makeStars = (count, color, size, spreadX, spreadY, startZ, depth) => {
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) {
        const radiusBias = Math.pow(Math.random(), 0.72);
        const angle = Math.random() * Math.PI * 2;
        positions[i * 3] = Math.cos(angle) * spreadX * radiusBias;
        positions[i * 3 + 1] = Math.sin(angle) * spreadY * radiusBias;
        positions[i * 3 + 2] = startZ - Math.random() * depth;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        color,
        size,
        transparent: true,
        opacity: 0.82,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const points = new THREE.Points(geometry, material);
      scene.add(points);
      return points;
    };

    const starsWhite = makeStars(coarsePointer ? 720 : 1450, 0xf2efff, 0.036, 22, 13, 3, 245);
    const starsViolet = makeStars(coarsePointer ? 170 : 360, 0x9689ff, 0.055, 20, 11, 0, 245);
    const starsTeal = makeStars(coarsePointer ? 100 : 220, 0x47e1df, 0.048, 19, 10, -8, 235);
    const starsRed = makeStars(coarsePointer ? 65 : 130, 0xd71920, 0.064, 18, 9, -5, 225);

    const makeGlowTexture = (inner, middle) => {
      const image = document.createElement("canvas");
      image.width = 256;
      image.height = 256;
      const context = image.getContext("2d");
      const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
      gradient.addColorStop(0, inner);
      gradient.addColorStop(0.28, middle);
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(image);
    };

    const nebulae = [];
    const glowDefinitions = [
      ["rgba(255,255,255,.78)", "rgba(81,214,220,.24)", -28, 1.2, 9.2],
      ["rgba(255,255,255,.68)", "rgba(117,83,255,.28)", -68, -0.8, 11.8],
      ["rgba(255,238,235,.6)", "rgba(215,25,32,.24)", -112, 1.8, 10.5],
      ["rgba(255,255,255,.7)", "rgba(48,203,207,.22)", -158, -1.4, 13.2],
      ["rgba(255,242,245,.55)", "rgba(134,76,255,.25)", -205, 1.1, 12.4],
    ];

    glowDefinitions.forEach(([inner, middle, z, y, scale], index) => {
      const material = new THREE.SpriteMaterial({
        map: makeGlowTexture(inner, middle),
        transparent: true,
        opacity: index === 0 ? 0.52 : 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(index % 2 === 0 ? 2.1 : -2.4, y, z);
      sprite.scale.set(scale * 1.55, scale, 1);
      scene.add(sprite);
      nebulae.push(sprite);
    });

    const shardCount = coarsePointer ? 34 : 72;
    const shardGeometry = new THREE.PlaneGeometry(0.055, 0.055);
    const shardMaterial = new THREE.MeshBasicMaterial({
      color: 0xd9d3ff,
      transparent: true,
      opacity: 0.68,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const shards = new THREE.InstancedMesh(shardGeometry, shardMaterial, shardCount);
    const shardMatrix = new THREE.Matrix4();
    const shardQuaternion = new THREE.Quaternion();
    const shardScale = new THREE.Vector3();
    for (let i = 0; i < shardCount; i += 1) {
      const z = -8 - Math.random() * 220;
      const x = (Math.random() - 0.5) * 17;
      const y = (Math.random() - 0.5) * 9;
      const s = 0.45 + Math.random() * 1.8;
      shardQuaternion.setFromEuler(new THREE.Euler(Math.random(), Math.random(), Math.random()));
      shardScale.set(s, s, s);
      shardMatrix.compose(new THREE.Vector3(x, y, z), shardQuaternion, shardScale);
      shards.setMatrixAt(i, shardMatrix);
    }
    scene.add(shards);

    const warp = createWarp(renderer);
    const intro = {
      active: !reduceMotion,
      startedAt: performance.now(),
      duration: 3650,
    };
    let targetZ = 7;
    let currentZ = 7;
    let pointerX = 0;
    let pointerY = 0;
    let previous = performance.now();

    const updateScrollTarget = () => {
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(Math.max(window.scrollY / max, 0), 1);
      targetZ = 7 - progress * 205;
      document.documentElement.style.setProperty("--space-progress", `${progress * 100}%`);
    };

    const finishIntro = () => {
      if (!intro.active) return;
      intro.active = false;
      warp.uniforms.uAlpha.value = 0;
      flash?.classList.add("is-fired");
      revealPage();
      updateScrollTarget();
    };

    const renderFrame = (now) => {
      requestAnimationFrame(renderFrame);
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;

      const movement = 1 - Math.exp(-dt * 3.1);
      currentZ += (targetZ - currentZ) * movement;

      const scrollSpeed = Math.abs(targetZ - currentZ);
      camera.fov = 62 + Math.min(scrollSpeed * 0.24, 8);
      camera.updateProjectionMatrix();
      camera.position.set(pointerX * 0.42, 0.5 + pointerY * 0.24, currentZ);
      camera.lookAt(pointerX * 0.7, pointerY * 0.35, currentZ - 16);

      const t = now * 0.001;
      starsWhite.rotation.z = Math.sin(t * 0.08) * 0.018;
      starsViolet.rotation.z = -Math.sin(t * 0.06) * 0.016;
      starsTeal.rotation.z = Math.sin(t * 0.05 + 1) * 0.012;
      starsRed.rotation.z = -Math.sin(t * 0.07 + 0.5) * 0.014;
      nebulae.forEach((sprite, index) => {
        sprite.material.opacity = (index === 0 ? 0.46 : 0.3) + Math.sin(t * 0.42 + index) * 0.055;
      });

      renderer.render(scene, camera);

      if (intro.active) {
        const elapsed = now - intro.startedAt;
        const progress = Math.min(elapsed / intro.duration, 1);
        const accelerate = Math.min(progress / 0.55, 1);
        const ease = accelerate * accelerate * (3 - 2 * accelerate);
        const fade = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
        warp.uniforms.uTime.value = elapsed / 1000;
        warp.uniforms.uSpeed.value = 0.12 + ease * 0.92;
        warp.uniforms.uGrade.value = Math.min(1, 0.16 + progress * 1.1);
        warp.uniforms.uAlpha.value = Math.max(0, fade);
        renderer.autoClear = false;
        renderer.render(warp.scene, warp.camera);
        renderer.autoClear = true;
        if (progress >= 1) finishIntro();
      }
    };

    window.addEventListener("scroll", updateScrollTarget, { passive: true });
    window.addEventListener("pointermove", (event) => {
      if (coarsePointer) return;
      pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointerY = -(event.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    window.addEventListener("resize", () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      warp.resize();
      updateScrollTarget();
    });

    window.scrollTo(0, 0);
    updateScrollTarget();
    if (reduceMotion) {
      intro.active = false;
      revealPage();
    }
    requestAnimationFrame(renderFrame);
  } catch (error) {
    console.warn("Cinematic space fallback enabled.", error);
    document.body.classList.add("no-space-background");
    revealPage();
  }
}
