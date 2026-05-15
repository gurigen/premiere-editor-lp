const faqRoot = document.querySelector("[data-tape-faq]");
const sceneRail = document.querySelector("[data-scene-rail]");
const sceneNav = document.querySelector("[data-scene-nav]");
const diagnosis = document.querySelector("[data-diagnosis]");
const strengthSuite = document.querySelector("[data-strength-suite]");
const worksFocus = document.querySelector("[data-works-focus]");
const courseTimeline = document.querySelector("[data-course-timeline]");
const voiceDeck = document.querySelector("[data-voice-deck]");
const recommendedCard = document.querySelector(".recommended-card");
const priceBoard = document.querySelector("[data-price-board]");
const cutBadge = document.querySelector("[data-cut-slasher]");
const lineTyping = document.querySelector("[data-line-typing]");
const trustReel = document.querySelector("[data-trust-check]");
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

if (sceneRail && sceneNav) {
  const scenePrev = sceneRail.querySelector("[data-scene-prev]");
  const sceneNext = sceneRail.querySelector("[data-scene-next]");
  let sceneAutoTimer = null;
  let nowPlayingTimer = null;

  const getSceneStep = () => {
    const cue = sceneNav.querySelector(".scene-cue");
    if (!cue) return 160;

    const styles = window.getComputedStyle(sceneNav);
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 10;
    return cue.getBoundingClientRect().width + gap;
  };

  const moveSceneStrip = (direction) => {
    sceneNav.scrollBy({
      left: getSceneStep() * direction,
      behavior: "smooth",
    });
  };

  const stopSceneAuto = () => {
    if (sceneAutoTimer) {
      window.clearInterval(sceneAutoTimer);
      sceneAutoTimer = null;
    }
  };

  const startSceneAuto = () => {
    if (sceneAutoTimer) return;

    sceneAutoTimer = window.setInterval(() => {
      const isAtEnd = sceneNav.scrollLeft + sceneNav.clientWidth >= sceneNav.scrollWidth - 4;
      if (isAtEnd) {
        stopSceneAuto();
        return;
      }

      moveSceneStrip(1);
    }, 300);
  };

  const showNowPlaying = (link) => {
    const href = link.getAttribute("href") || "";
    if (!href.startsWith("#")) return;

    const targetId = decodeURIComponent(href.slice(1));
    let target = targetId === "top" ? document.querySelector(".hero") : document.getElementById(targetId);
    if (!target) return;

    if (!target.matches("section")) {
      target = target.querySelector("section") || target;
    }

    document.querySelectorAll(".now-playing-label").forEach((label) => label.remove());
    document.querySelectorAll(".is-now-playing").forEach((section) => section.classList.remove("is-now-playing"));

    const label = document.createElement("span");
    const sceneName = link.querySelector("strong")?.textContent?.trim() || "SCENE";
    label.className = "now-playing-label";
    label.textContent = `NOW PLAYING / ${sceneName}`;
    target.classList.add("is-now-playing");
    target.append(label);

    if (nowPlayingTimer) {
      window.clearTimeout(nowPlayingTimer);
    }

    nowPlayingTimer = window.setTimeout(() => {
      label.remove();
      target.classList.remove("is-now-playing");
    }, reduceMotion ? 120 : 1350);
  };

  const showNowPlayingFromHash = () => {
    const hash = window.location.hash || "#top";
    const link = [...sceneNav.querySelectorAll(".scene-cue")].find((cue) => cue.getAttribute("href") === hash);
    if (link) showNowPlaying(link);
  };

  scenePrev?.addEventListener("click", () => {
    stopSceneAuto();
    moveSceneStrip(-1);
  });

  sceneNext?.addEventListener("click", () => {
    stopSceneAuto();
    moveSceneStrip(1);
  });

  sceneNav.addEventListener("click", (event) => {
    const link = event.target.closest(".scene-cue");
    if (!link) return;
    showNowPlaying(link);

    sceneNav.querySelectorAll(".scene-cue").forEach((cell) => {
      const isActive = cell === link;
      cell.classList.toggle("active", isActive);

      if (isActive) {
        cell.setAttribute("aria-current", "true");
      } else {
        cell.removeAttribute("aria-current");
      }
    });
  });

  window.addEventListener("hashchange", () => {
    window.setTimeout(showNowPlayingFromHash, 80);
  });

  if (window.location.hash && window.location.hash !== "#top") {
    window.setTimeout(showNowPlayingFromHash, 350);
  }

  sceneNav.addEventListener("pointermove", (event) => {
    const cue = event.target.closest(".scene-cue");
    if (!cue) {
      stopSceneAuto();
      return;
    }

    const navRect = sceneNav.getBoundingClientRect();
    const cueRect = cue.getBoundingClientRect();
    const isRightEdgeCue = cueRect.right > navRect.right - Math.min(54, cueRect.width * 0.45);
    const canMoveRight = sceneNav.scrollLeft + sceneNav.clientWidth < sceneNav.scrollWidth - 4;

    if (isRightEdgeCue && canMoveRight) {
      startSceneAuto();
    } else {
      stopSceneAuto();
    }
  });

  sceneNav.addEventListener("pointerleave", stopSceneAuto);
}

if (diagnosis) {
  const counter = diagnosis.querySelector("[data-diagnosis-counter]");
  const label = diagnosis.querySelector("[data-diagnosis-label]");
  const title = diagnosis.querySelector("[data-diagnosis-title]");
  const copy = diagnosis.querySelector("[data-diagnosis-copy]");
  const clips = [...diagnosis.querySelectorAll(".diagnosis-clip")];

  const loadDiagnosis = (clip) => {
    if (!clip) return;

    clips.forEach((item) => item.classList.toggle("is-active", item === clip));

    if (counter) counter.textContent = `CHECK ${clip.dataset.index || "01"}`;
    if (label) label.textContent = clip.dataset.label || "";
    if (title) title.textContent = clip.dataset.title || "";
    if (copy) copy.textContent = clip.dataset.copy || "";
  };

  clips.forEach((clip) => {
    clip.addEventListener("click", () => {
      loadDiagnosis(clip);
    });
  });
}

if (strengthSuite) {
  const consolePanel = strengthSuite.querySelector(".strength-console");
  const counter = strengthSuite.querySelector("[data-strength-counter]");
  const label = strengthSuite.querySelector("[data-strength-label]");
  const title = strengthSuite.querySelector("[data-strength-title]");
  const copy = strengthSuite.querySelector("[data-strength-copy]");
  const checks = [...strengthSuite.querySelectorAll(".strength-checks span")];
  const gates = [...strengthSuite.querySelectorAll(".strength-gate")];
  let activeIndex = Math.max(0, gates.findIndex((gate) => gate.classList.contains("is-active")));
  let strengthTimer = null;

  const loadStrengthGate = (gate) => {
    if (!gate) return;

    gates.forEach((item) => item.classList.toggle("is-active", item === gate));

    if (consolePanel) {
      consolePanel.classList.remove("is-loading");
      void consolePanel.offsetWidth;
      consolePanel.classList.add("is-loading");
    }

    if (counter) counter.textContent = `GATE ${gate.dataset.index || "01"}`;
    if (label) label.textContent = gate.dataset.label || "";
    if (title) title.textContent = gate.dataset.title || "";
    if (copy) copy.textContent = gate.dataset.copy || "";

    const activeChecks = (gate.dataset.on || "").split(",").map((item) => item.trim()).filter(Boolean);
    checks.forEach((item) => {
      item.classList.toggle("is-on", activeChecks.includes(item.textContent.trim()));
    });

    activeIndex = gates.indexOf(gate);
  };

  const moveNextStrengthGate = () => {
    if (!gates.length) return;
    loadStrengthGate(gates[(activeIndex + 1) % gates.length]);
  };

  const restartStrengthTimer = () => {
    if (reduceMotion || gates.length < 2) return;

    if (strengthTimer) {
      window.clearInterval(strengthTimer);
    }

    strengthTimer = window.setInterval(moveNextStrengthGate, 3000);
  };

  gates.forEach((gate) => {
    gate.addEventListener("click", () => {
      loadStrengthGate(gate);
      restartStrengthTimer();
    });
  });

  restartStrengthTimer();
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
  let activeIndex = Math.max(0, thumbs.findIndex((thumb) => thumb.classList.contains("is-active")));
  let worksTimer = null;

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

    activeIndex = thumbs.indexOf(thumb);
  };

  const moveNextWork = () => {
    if (!thumbs.length) return;
    const nextIndex = (activeIndex + 1) % thumbs.length;
    loadWork(thumbs[nextIndex]);
  };

  const restartWorksTimer = () => {
    if (reduceMotion || thumbs.length < 2) return;

    if (worksTimer) {
      window.clearInterval(worksTimer);
    }

    worksTimer = window.setInterval(moveNextWork, 3200);
  };

  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      loadWork(thumb);
      restartWorksTimer();
    });
  });

  restartWorksTimer();
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
  let activeIndex = Math.max(0, clips.findIndex((clip) => clip.classList.contains("is-active")));
  let courseTimer = null;

  const loadCourseClip = (clip, shouldReveal = false) => {
    if (!clip) return;

    clips.forEach((item) => item.classList.toggle("is-active", item === clip));

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

    activeIndex = clips.indexOf(clip);

    if (shouldReveal && scroller) {
      const clipCenter = clip.offsetLeft + clip.offsetWidth / 2;
      const targetLeft = Math.max(0, clipCenter - scroller.clientWidth / 2);
      scroller.scrollTo({
        left: targetLeft,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }
  };

  const moveNextCourseClip = () => {
    if (!clips.length) return;
    const nextIndex = (activeIndex + 1) % clips.length;
    loadCourseClip(clips[nextIndex], true);
  };

  const restartCourseTimer = () => {
    if (reduceMotion || clips.length < 2) return;

    if (courseTimer) {
      window.clearInterval(courseTimer);
    }

    courseTimer = window.setInterval(moveNextCourseClip, 1900);
  };

  clips.forEach((clip) => {
    clip.addEventListener("click", () => {
      loadCourseClip(clip, true);
      restartCourseTimer();
    });
  });

  restartCourseTimer();
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
