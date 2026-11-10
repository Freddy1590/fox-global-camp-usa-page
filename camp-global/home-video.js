(() => {
  const video = document.getElementById('camp-hero-video');
  const toggle = document.getElementById('hero-video-toggle');
  if (!video || !toggle) return;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let wantsPlayback = !motion.matches;
  let failed = false;

  function showState() {
    const label = video.paused ? '캠프 영상 재생' : '캠프 영상 멈추기';
    toggle.dataset.paused = String(video.paused);
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
  }

  async function play() {
    if (failed || !wantsPlayback || document.hidden) return;
    try {
      await video.play();
      if (!wantsPlayback || document.hidden) video.pause();
    } catch (error) {
      if (error.name !== 'AbortError') wantsPlayback = false;
      showState();
    }
  }

  video.muted = true;
  toggle.hidden = false;
  showState();
  toggle.addEventListener('click', () => {
    wantsPlayback = video.paused;
    if (wantsPlayback) play();
    else video.pause();
  });
  video.addEventListener('playing', () => {
    video.parentElement.classList.add('has-video-frame');
    showState();
  });
  video.addEventListener('pause', showState);
  video.addEventListener('error', () => {
    failed = true;
    wantsPlayback = false;
    video.pause();
    video.hidden = true;
    toggle.hidden = true;
    video.parentElement.classList.remove('has-video-frame');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause();
    else play();
  });
  motion.addEventListener('change', () => {
    if (motion.matches) {
      wantsPlayback = false;
      video.pause();
    }
  });
  play();
})();
