const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sceneRail = document.querySelector("[data-scene-rail]");
const sceneNav = document.querySelector("[data-scene-nav]");
const progressBar = document.querySelector("[data-scene-progress]");
const cues = sceneNav ? [...sceneNav.querySelectorAll(".scene-cue")] : [];

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

if (!window.location.hash) {
  window.scrollTo(0, 0);
}

const revealTargets = [...document.querySelectorAll("[data-reveal]")];
if (reduceMotion || !("IntersectionObserver" in window)) {
  revealTargets.forEach((target) => target.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8%", threshold: 0.12 });
  revealTargets.forEach((target) => revealObserver.observe(target));
}

if (sceneRail && sceneNav) {
  const scenePrev = sceneRail.querySelector("[data-scene-prev]");
  const sceneNext = sceneRail.querySelector("[data-scene-next]");
  const moveRail = (direction) => {
    const cue = sceneNav.querySelector(".scene-cue");
    const step = (cue?.getBoundingClientRect().width || 120) + 8;
    sceneNav.scrollBy({ left: direction * step, behavior: reduceMotion ? "auto" : "smooth" });
  };
  scenePrev?.addEventListener("click", () => moveRail(-1));
  sceneNext?.addEventListener("click", () => moveRail(1));
}

const resolveCueTarget = (cue) => {
  const href = cue.getAttribute("href") || "";
  if (!href.startsWith("#")) return null;
  return document.getElementById(decodeURIComponent(href.slice(1)));
};

let activeCueIndex = -1;
let scrollTicking = false;

const setActiveCue = (nextIndex) => {
  if (!cues[nextIndex] || nextIndex === activeCueIndex) return;
  activeCueIndex = nextIndex;
  cues.forEach((cue, index) => {
    const active = index === nextIndex;
    cue.classList.toggle("active", active);
    if (active) cue.setAttribute("aria-current", "true");
    else cue.removeAttribute("aria-current");
  });

  const activeCue = cues[nextIndex];
  const left = Math.max(0, activeCue.offsetLeft - (sceneNav.clientWidth - activeCue.offsetWidth) / 2);
  sceneNav.scrollTo({ left, behavior: reduceMotion ? "auto" : "smooth" });
};

const syncPageTimeline = () => {
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
  const progressValue = `${progress * 100}%`;
  document.documentElement.style.setProperty("--space-progress", progressValue);
  if (progressBar) progressBar.style.width = progressValue;

  const playhead = window.scrollY + Math.min(window.innerHeight * 0.36, 320);
  let nextIndex = 0;
  cues.forEach((cue, index) => {
    const target = resolveCueTarget(cue);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY;
    if (top <= playhead) nextIndex = index;
  });
  setActiveCue(nextIndex);
  scrollTicking = false;
};

const requestTimelineSync = () => {
  if (scrollTicking) return;
  scrollTicking = true;
  window.requestAnimationFrame(syncPageTimeline);
};

window.addEventListener("scroll", requestTimelineSync, { passive: true });
window.addEventListener("resize", requestTimelineSync);
cues.forEach((cue, index) => cue.addEventListener("click", () => setActiveCue(index)));
requestTimelineSync();

const faqRoot = document.querySelector("[data-faq]");
faqRoot?.addEventListener("click", (event) => {
  const button = event.target.closest(".faq-item > button");
  if (!button) return;
  const item = button.closest(".faq-item");
  const answer = item.querySelector(".faq-answer");
  const willOpen = !item.classList.contains("is-open");

  item.classList.toggle("is-open", willOpen);
  button.setAttribute("aria-expanded", String(willOpen));
  if (answer) answer.hidden = !willOpen;
});

// The Three.js module normally reveals the page after the opening warp.
// This fallback guarantees access when WebGL or module loading is unavailable.
window.setTimeout(() => {
  if (!document.body.classList.contains("is-intro-running")) return;
  document.body.classList.remove("is-intro-running");
  document.body.classList.add("is-hero-revealed", "no-space-background");
  revealTargets.forEach((target) => target.classList.add("is-visible"));
}, 7000);
