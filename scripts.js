const faqRoot = document.querySelector("[data-tape-faq]");
const sceneRail = document.querySelector("[data-scene-rail]");
const sceneNav = document.querySelector("[data-scene-nav]");
const worksFocus = document.querySelector("[data-works-focus]");
const courseTimeline = document.querySelector("[data-course-timeline]");
const voiceDeck = document.querySelector("[data-voice-deck]");
const recommendedCard = document.querySelector(".recommended-card");
const priceBoard = document.querySelector("[data-price-board]");
const cutBadge = document.querySelector("[data-cut-slasher]");
const lineTyping = document.querySelector("[data-line-typing]");
const trustReel = document.querySelector("[data-trust-check]");
const loadIntro = document.querySelector("[data-load-intro]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const revealOnView = (target, className, options = {}) => {
  if (!target) return;

  if (reduceMotion) {
    target.classList.add(className);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      target.classList.add(className);
      observer.disconnect();
    });
  }, {
    threshold: 0.44,
    ...options,
  });

  observer.observe(target);
};

revealOnView(cutBadge, "is-slashed", { threshold: 0.52 });
revealOnView(priceBoard, "is-playing", { threshold: 0.46 });
revealOnView(lineTyping, "is-typing", { threshold: 0.4 });
revealOnView(trustReel, "is-lit", { threshold: 0.48 });

if (recommendedCard) {
  const recommendedObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      recommendedCard.classList.add("is-approved");
      recommendedObserver.disconnect();
    });
  }, {
    threshold: 0.48,
  });

  recommendedObserver.observe(recommendedCard);
}

if (loadIntro) {
  const introVideo = loadIntro.querySelector("[data-load-intro-video]");
  const totalFrame = 121;
  const fadeLeadFrames = 10;
  const sourceFrameRate = 24;
  const fadeStartTime = (totalFrame - fadeLeadFrames) / sourceFrameRate;
  const fadeMs = 420;
  let introTimer = 0;
  let introRaf = 0;
  let introFinished = false;
  let introPlayAttempts = 0;

  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  const snapIntroToTop = () => {
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;

    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.scrollTop = 0;
    document.body.scrollTop = 0;

    window.requestAnimationFrame(() => {
      root.style.scrollBehavior = previousScrollBehavior;
    });
  };

  const revealHero = () => {
    snapIntroToTop();
    document.body.classList.remove("is-intro-running");
    document.body.classList.add("is-hero-revealed");
    loadIntro.classList.add("is-done");
    if (introVideo) introVideo.pause();
  };

  const finishIntro = () => {
    if (introFinished) return;
    introFinished = true;

    if (introTimer) window.clearTimeout(introTimer);
    if (introRaf) window.cancelAnimationFrame(introRaf);

    snapIntroToTop();
    loadIntro.classList.add("is-fading");
    window.setTimeout(revealHero, fadeMs);
  };

  const watchIntroCutoff = () => {
    if (!introVideo || introFinished) return;

    if (introVideo.currentTime >= fadeStartTime) {
      finishIntro();
      return;
    }

    introRaf = window.requestAnimationFrame(watchIntroCutoff);
  };

  const startLoadIntro = () => {
    snapIntroToTop();

    if (!introVideo || reduceMotion) {
      finishIntro();
      return;
    }

    if (introPlayAttempts === 0) {
      introVideo.pause();
      introVideo.currentTime = 0;
      introVideo.playbackRate = 1;
    }

    introPlayAttempts += 1;

    const playPromise = introVideo.play();
    if (playPromise) {
      playPromise
        .then(() => {
          watchIntroCutoff();
        })
        .catch(() => {
          if (introPlayAttempts < 3) {
            window.setTimeout(startLoadIntro, 180);
            return;
          }

          finishIntro();
        });
    } else {
      watchIntroCutoff();
    }

    if (!introTimer) {
      introTimer = window.setTimeout(finishIntro, (fadeStartTime * 1000) + 700);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startLoadIntro, { once: true });
  } else {
    startLoadIntro();
  }
}

if (sceneRail && sceneNav) {
  const moveSceneStrip = (direction) => {
    const cue = sceneNav.querySelector(".scene-cue");
    const step = cue ? cue.getBoundingClientRect().width + 4 : 113;
    sceneNav.scrollBy({ left: step * direction, behavior: reduceMotion ? "auto" : "smooth" });
  };
  sceneRail.querySelector("[data-scene-prev]")?.addEventListener("click", () => moveSceneStrip(-1));
  sceneRail.querySelector("[data-scene-next]")?.addEventListener("click", () => moveSceneStrip(1));
}

if (worksFocus) {
  const preview = worksFocus.querySelector("[data-work-preview]");
  const screen = worksFocus.querySelector(".work-focus-screen");
  const tag = worksFocus.querySelector("[data-work-tag]");
  const title = worksFocus.querySelector("[data-work-title]");
  const copy = worksFocus.querySelector("[data-work-copy]");
  const corner = worksFocus.querySelector(".work-focus-corner");
  const thumbs = [...worksFocus.querySelectorAll(".focus-thumb")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const loadWork = (thumb) => {
    if (!thumb || !preview) return;

    thumbs.forEach((item) => item.classList.toggle("is-active", item === thumb));

    const index = thumb.dataset.index || "01";
    const image = thumb.dataset.image || "";

    if (screen) {
      screen.classList.remove("is-switching");
      void screen.offsetWidth;
      screen.classList.add("is-switching");
    }

    preview.src = image;
    preview.alt = `${thumb.dataset.title || "実績"}のサムネイル`;
    if (tag) tag.textContent = thumb.dataset.tag || "";
    if (title) title.textContent = thumb.dataset.title || "";
    if (copy) copy.textContent = thumb.dataset.copy || "";
    if (corner) corner.textContent = `SELECTED ${index}`;

  };

  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      loadWork(thumb);
    });
  });
}

if (courseTimeline) {
  const monitor = courseTimeline.querySelector(".course-monitor");
  const scroller = courseTimeline.querySelector(".course-scroll");
  const counter = courseTimeline.querySelector("[data-course-counter]");
  const track = courseTimeline.querySelector("[data-course-track]");
  const title = courseTimeline.querySelector("[data-course-title]");
  const copy = courseTimeline.querySelector("[data-course-copy]");
  const clips = [...courseTimeline.querySelectorAll(".course-clip")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const loadCourseClip = (clip, shouldReveal = false) => {
    if (!clip) return;

    clips.forEach((item) => {
      item.classList.toggle("is-active", item === clip);
      item.setAttribute("aria-pressed", String(item === clip));
    });

    const index = clip.dataset.index || "01";

    if (monitor) {
      monitor.classList.remove("is-loading");
      void monitor.offsetWidth;
      monitor.classList.add("is-loading");
    }

    if (counter) counter.textContent = `NOW ${index}`;
    if (track) track.textContent = clip.dataset.track || "";
    if (title) title.textContent = clip.dataset.title || "";
    if (copy) copy.textContent = clip.dataset.copy || "";


    if (shouldReveal && scroller) {
      const clipCenter = clip.offsetLeft + clip.offsetWidth / 2;
      const targetLeft = Math.max(0, clipCenter - scroller.clientWidth / 2);
      scroller.scrollTo({
        left: targetLeft,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }
  };

  clips.forEach((clip) => {
    clip.addEventListener("click", () => {
      loadCourseClip(clip, true);
    });
  });
  clips.forEach((clip) => clip.setAttribute("aria-pressed", String(clip.classList.contains("is-active"))));

}

if (voiceDeck) {
  const tickets = [...voiceDeck.querySelectorAll(".voice-ticket")];
  const monitor = voiceDeck.querySelector(".voice-monitor");
  const counter = voiceDeck.querySelector("[data-voice-counter]");
  const focus = voiceDeck.querySelector("[data-voice-focus]");
  const title = voiceDeck.querySelector("[data-voice-title]");
  const copy = voiceDeck.querySelector("[data-voice-copy]");
  const person = voiceDeck.querySelector("[data-voice-person]");
  const status = voiceDeck.querySelector("[data-voice-status]");
  let activeIndex = Math.max(0, tickets.findIndex((ticket) => ticket.classList.contains("is-active")));
  let voiceTimer = null;

  const loadVoice = (ticket) => {
    if (!ticket) return;

    tickets.forEach((item) => item.classList.toggle("is-active", item === ticket));

    if (monitor) {
      monitor.classList.remove("is-loading");
      void monitor.offsetWidth;
      monitor.classList.add("is-loading");
    }

    if (counter) counter.textContent = `VOICE ${ticket.dataset.index || "01"}`;
    if (focus) focus.textContent = ticket.dataset.focus || "";
    if (title) title.textContent = ticket.dataset.title || "";
    if (copy) copy.textContent = ticket.dataset.copy || "";
    if (person) person.textContent = ticket.dataset.person || "";
    if (status) status.textContent = ticket.dataset.status || "";

    activeIndex = tickets.indexOf(ticket);
  };

  const moveNextVoice = () => {
    if (!tickets.length) return;
    loadVoice(tickets[(activeIndex + 1) % tickets.length]);
  };

  const restartVoiceTimer = () => {
    if (reduceMotion || tickets.length < 2) return;

    if (voiceTimer) {
      window.clearInterval(voiceTimer);
    }

    voiceTimer = window.setInterval(moveNextVoice, 3600);
  };

  tickets.forEach((ticket) => {
    ticket.addEventListener("click", () => {
      loadVoice(ticket);
      restartVoiceTimer();
    });
  });

  restartVoiceTimer();
}

if (faqRoot) {
  faqRoot.addEventListener("click", (event) => {
    const button = event.target.closest(".faq-question");
    if (!button) return;

    const item = button.closest(".faq-item");
    const answer = document.getElementById(button.getAttribute("aria-controls"));
    const isOpen = item.classList.contains("is-open");

    item.classList.toggle("is-open", !isOpen);
    button.setAttribute("aria-expanded", String(!isOpen));

    if (answer) {
      answer.hidden = false;

      if (isOpen) {
        window.setTimeout(() => {
          if (!item.classList.contains("is-open")) {
            answer.hidden = true;
          }
        }, 360);
      }
    }
  });
}

// Keep the header timecode rail in sync with the page, like a video playhead.
(() => {
  if (!sceneNav) return;

  const cues = [...sceneNav.querySelectorAll(".scene-cue")];
  const progressBar = document.querySelector("[data-scene-progress]");
  let activeCueIndex = -1;
  let ticking = false;

  const getCueTarget = (cue) => {
    const href = cue.getAttribute("href") || "";
    if (!href.startsWith("#")) return null;
    const targetId = decodeURIComponent(href.slice(1));
    return targetId === "top" ? document.querySelector(".hero") : document.getElementById(targetId);
  };

  const setActiveCue = (nextIndex) => {
    if (nextIndex === activeCueIndex || !cues[nextIndex]) return;
    activeCueIndex = nextIndex;

    cues.forEach((cue, index) => {
      const isActive = index === nextIndex;
      cue.classList.toggle("active", isActive);
      if (isActive) cue.setAttribute("aria-current", "true");
      else cue.removeAttribute("aria-current");
    });

    const activeCue = cues[nextIndex];
    const targetLeft = Math.max(0, activeCue.offsetLeft - (sceneNav.clientWidth - activeCue.offsetWidth) / 2);
    sceneNav.scrollTo({ left: targetLeft, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const syncTimeline = () => {
    const scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, window.scrollY / scrollMax));
    document.documentElement.style.setProperty("--space-progress", `${progress * 100}%`);
    if (progressBar) progressBar.style.width = `${progress * 100}%`;

    const playheadY = window.scrollY + Math.min(window.innerHeight * 0.36, 320);
    let nextIndex = 0;
    cues.forEach((cue, index) => {
      const target = getCueTarget(cue);
      const targetTop = target ? target.getBoundingClientRect().top + window.scrollY : Infinity;
      if (targetTop <= playheadY) nextIndex = index;
    });
    setActiveCue(nextIndex);
    ticking = false;
  };

  const requestSync = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(syncTimeline);
  };

  window.addEventListener("scroll", requestSync, { passive: true });
  window.addEventListener("resize", requestSync);
  requestSync();
})();

// The space module normally unlocks the page. This also keeps the content usable
// if WebGL or an ES module import is blocked by the browser.
window.setTimeout(() => {
  if (!document.body.classList.contains("is-intro-running")) return;
  document.body.classList.remove("is-intro-running");
  document.body.classList.add("is-hero-revealed", "no-space-background");
}, 7000);
