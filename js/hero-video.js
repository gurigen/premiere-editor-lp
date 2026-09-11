(() => {
  const video = document.querySelector('.hero-background-video');
  const toggle = document.querySelector('.hero-video-toggle');
  if (!video || !toggle) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let userPaused = motion.matches || Boolean(navigator.connection?.saveData);
  let inView = false;
  let failed = false;
  video.muted = true;
  toggle.hidden = false;
  const label = () => {
    toggle.textContent = video.paused ? '背景動画を再生' : '背景動画を一時停止';
  };
  const update = () => {
    const introRunning = document.body.classList.contains('is-intro-running');
    if (failed || userPaused || !inView || document.hidden || introRunning) {
      video.pause();
      return;
    }
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    video.play().catch(label); // Autoplay may be blocked; retain the poster and play button.
  };
  toggle.addEventListener('click', () => {
    userPaused = !video.paused;
    update();
  });
  video.addEventListener('play', label);
  video.addEventListener('pause', label);
  video.addEventListener('error', () => {
    failed = true;
    video.hidden = true;
    toggle.hidden = true;
  });
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    update();
  }, { threshold: 0 }).observe(video.closest('.hero'));
  new MutationObserver(update).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', update);
  motion.addEventListener('change', () => {
    userPaused = motion.matches || Boolean(navigator.connection?.saveData);
    update();
  });
})();
