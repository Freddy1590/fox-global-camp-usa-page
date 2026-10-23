(() => {
  const gallery = document.getElementById('camp-gallery');
  const controls = document.querySelector('.carousel-controls');
  const toggle = document.getElementById('carousel-toggle');
  const next = document.getElementById('carousel-next');
  const position = document.getElementById('carousel-position');
  const pictures = [...(gallery?.querySelectorAll('.cover-picture') || [])];
  if (!gallery || !controls || !toggle || !next || !position || pictures.length !== 5) return;
  if (new Set(pictures.map(picture => picture.dataset.slot)).size !== 5 ||
      pictures.some(picture => !/^[0-4]$/.test(picture.dataset.slot))) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 820px)');
  const hovered = new Set();
  let userPaused = false;
  let explicitResume = false;
  let visible = false;
  let ready = false;
  let timer;
  let turn = 0;
  let animations = [];

  function stopAnimations() {
    animations.forEach(animation => animation.cancel());
    animations = [];
  }

  function schedule() {
    clearTimeout(timer);
    const focused = gallery.contains(document.activeElement) &&
      !(explicitResume && document.activeElement === toggle);
    if (ready && visible && !userPaused && !reducedMotion.matches &&
        !document.hidden && !hovered.size && !focused) {
      timer = setTimeout(() => advance(false), 7000);
    }
  }

  function updateToggle() {
    toggle.hidden = reducedMotion.matches;
    toggle.textContent = userPaused ? '자동 재생' : '일시정지';
  }

  function centerImage() {
    return pictures.find(picture => picture.dataset.slot === '2').querySelector('img');
  }

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    const entry = entries.find(item => item.target === centerImage());
    if (!entry) return;
    const inView = entry.isIntersecting && entry.intersectionRatio >= 0.15;
    if (visible !== inView) {
      visible = inView;
      schedule();
    }
  }, { threshold: [0, 0.15] }) : null;

  function checkVisibility() {
    const rect = centerImage().getBoundingClientRect();
    const inView = rect.top < innerHeight && rect.bottom > 0 && rect.left < innerWidth && rect.right > 0;
    if (visible !== inView) {
      visible = inView;
      schedule();
    }
  }

  function observeCenter() {
    if (observer) {
      visible = false;
      observer.disconnect();
      observer.observe(centerImage());
    } else {
      checkVisibility();
    }
  }

  function advance(immediate) {
    stopAnimations();
    const before = pictures.map(picture => picture.getBoundingClientRect());
    pictures.forEach(picture => {
      picture.dataset.slot = String((Number(picture.dataset.slot) + 4) % 5);
    });
    turn = (turn + 1) % 5;
    position.textContent = `${turn + 1} / 5`;

    if (!immediate && !reducedMotion.matches && typeof gallery.animate === 'function') {
      pictures.forEach((picture, index) => {
        const after = picture.getBoundingClientRect();
        const duration = mobile.matches ? 240 : 550;
        const frames = mobile.matches || picture.dataset.slot === '4'
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { transformOrigin: 'top left', transform: `translate(${before[index].left - after.left}px, ${before[index].top - after.top}px) scale(${before[index].width / after.width}, ${before[index].height / after.height})` },
              { transformOrigin: 'top left', transform: 'none' }
            ];
        animations.push(picture.animate(frames, { duration, easing: 'cubic-bezier(.22,1,.36,1)' }));
        const caption = picture.querySelector('figcaption');
        if (caption && !mobile.matches) {
          animations.push(caption.animate([
            { opacity: 0 }, { opacity: 0, offset: 0.75 }, { opacity: 1 }
          ], { duration, easing: 'linear' }));
        }
      });
    }
    observeCenter();
    schedule();
  }

  async function start() {
    try {
      await Promise.all(pictures.map(async picture => {
        const img = picture.querySelector('img');
        img.loading = 'eager';
        if (typeof img.decode === 'function') {
          await img.decode();
        } else if (!img.complete) {
          await new Promise((resolve, reject) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', reject, { once: true });
          });
        }
        if (!img.naturalWidth) throw new Error('Photo unavailable');
      }));
    } catch {
      // Keep the original gallery when a photo cannot be prepared.
      return;
    }

    gallery.classList.add('is-carousel');
    controls.hidden = false;
    ready = true;
    updateToggle();

    next.addEventListener('click', event => {
      userPaused = true;
      updateToggle();
      advance(event.detail === 0);
    });
    toggle.addEventListener('click', () => {
      userPaused = !userPaused;
      explicitResume = !userPaused;
      updateToggle();
      schedule();
    });

    [gallery, controls].forEach(surface => {
      if (matchMedia('(hover: hover) and (pointer: fine)').matches && surface.matches(':hover')) hovered.add(surface);
      surface.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'mouse') return;
        hovered.add(surface);
        schedule();
      });
      surface.addEventListener('pointerleave', event => {
        if (event.pointerType !== 'mouse') return;
        hovered.delete(surface);
        schedule();
      });
      surface.addEventListener('focusin', event => {
        if (event.target !== toggle) explicitResume = false;
        schedule();
      });
      surface.addEventListener('focusout', event => {
        if (event.target === toggle) explicitResume = false;
        queueMicrotask(schedule);
      });
      surface.addEventListener('pointerdown', event => {
        if (event.pointerType !== 'touch' || toggle.contains(event.target)) return;
        userPaused = true;
        updateToggle();
        schedule();
      });
    });

    document.addEventListener('visibilitychange', schedule);
    reducedMotion.addEventListener('change', () => {
      stopAnimations();
      updateToggle();
      schedule();
    });
    window.addEventListener('resize', () => {
      stopAnimations();
      observeCenter();
      schedule();
    });
    if (!observer) window.addEventListener('scroll', checkVisibility, { passive: true });
    observeCenter();
    schedule();
  }

  start();
})();
