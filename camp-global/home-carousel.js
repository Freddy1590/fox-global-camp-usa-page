(() => {
  const gallery = document.getElementById('camp-gallery');
  const controls = document.querySelector('.carousel-controls');
  const toggle = document.getElementById('carousel-toggle');
  const previous = document.getElementById('carousel-previous');
  const next = document.getElementById('carousel-next');
  const status = document.getElementById('carousel-status');
  const pictures = [...(gallery?.querySelectorAll('.cover-picture') || [])]
    .sort((a, b) => Number(a.dataset.order) - Number(b.dataset.order));
  if (!gallery || !controls || !toggle || !previous || !next || pictures.length !== 15) return;
  if (pictures.some((picture, index) => Number(picture.dataset.order) !== index || !picture.querySelector('img'))) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 820px)');
  const loads = new Map();
  let center = 2;
  let userPaused = false;
  let explicitResume = false;
  let hovered = matchMedia('(hover: hover) and (pointer: fine)').matches && gallery.matches(':hover');
  let visible = false;
  let busy = false;
  let request = 0;
  let timer;
  let animations = [];
  let gesture = null;
  let dragged = [];
  let dragOffset = 0;
  let suppressClickUntil = 0;

  const indexOf = index => (index + pictures.length) % pictures.length;
  const windowAt = index => [-2, -1, 0, 1, 2].map(offset => pictures[indexOf(index + offset)]);
  const centerImage = () => pictures[center].querySelector('img');

  function stopAnimations() {
    animations.forEach(animation => animation.cancel());
    animations = [];
  }

  function releasePointer() {
    const pointer = gesture;
    gesture = null;
    if (pointer && gallery.hasPointerCapture(pointer.id)) gallery.releasePointerCapture(pointer.id);
    gallery.classList.remove('is-dragging');
  }

  function resetDrag(snapBack = false) {
    releasePointer();
    const offset = dragOffset;
    dragged.forEach(picture => {
      picture.style.removeProperty('transform');
      if (snapBack && offset && !reducedMotion.matches) {
        animations.push(picture.animate([
          { transform: `translateX(${offset}px)` }, { transform: 'none' }
        ], { duration: 220, easing: 'cubic-bezier(.22,1,.36,1)' }));
      }
    });
    dragged = [];
    dragOffset = 0;
  }

  function cancelPending() {
    request += 1;
    if (busy && !gesture && dragged.length) resetDrag();
    busy = false;
    clearTimeout(timer);
  }

  function canPlay() {
    const focused = gallery.contains(document.activeElement) &&
      !(explicitResume && document.activeElement === toggle);
    return visible && !userPaused && !reducedMotion.matches && !document.hidden && !hovered && !focused;
  }

  function schedule() {
    clearTimeout(timer);
    if (!busy && !gesture && canPlay()) timer = setTimeout(() => advance(1, false, false), 5000);
  }

  function updateToggle() {
    toggle.hidden = reducedMotion.matches;
    toggle.dataset.paused = String(userPaused || reducedMotion.matches);
    toggle.setAttribute('aria-label', userPaused ? '사진 자동 재생' : '사진 자동 재생 일시정지');
    toggle.title = userPaused ? '자동 재생' : '일시정지';
  }

  function pause() {
    userPaused = true;
    explicitResume = false;
    cancelPending();
    updateToggle();
  }

  function prepare(picture) {
    if (loads.has(picture)) return loads.get(picture);
    const img = picture.querySelector('img');
    img.loading = 'eager';
    if (img.complete && !img.naturalWidth) img.src = img.getAttribute('src');
    const loading = (async () => {
      if (typeof img.decode === 'function') {
        await img.decode();
      } else if (!img.complete) {
        await new Promise((resolve, reject) => {
          const cleanup = () => {
            img.removeEventListener('load', loaded);
            img.removeEventListener('error', failed);
          };
          const loaded = () => { cleanup(); resolve(); };
          const failed = () => { cleanup(); reject(new Error('Photo unavailable')); };
          img.addEventListener('load', loaded);
          img.addEventListener('error', failed);
        });
      }
      if (!img.naturalWidth) throw new Error('Photo unavailable');
    })();
    loads.set(picture, loading);
    loading.catch(() => loads.delete(picture));
    return loading;
  }

  function prefetch() {
    [-3, 3].forEach(offset => prepare(pictures[indexOf(center + offset)]).catch(() => {}));
  }

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    const entry = entries.find(item => item.target === centerImage());
    if (!entry) return;
    const inView = entry.isIntersecting && entry.intersectionRatio >= 0.15;
    if (visible !== inView) {
      visible = inView;
      if (!visible) cancelPending();
      schedule();
    }
  }, { threshold: [0, 0.15] }) : null;

  function checkVisibility() {
    const rect = centerImage().getBoundingClientRect();
    const inView = rect.top < innerHeight && rect.bottom > 0 && rect.left < innerWidth && rect.right > 0;
    if (visible !== inView) {
      visible = inView;
      if (!visible) cancelPending();
      schedule();
    }
  }

  function observeCenter() {
    if (observer) {
      visible = false;
      observer.disconnect();
      observer.observe(centerImage());
    } else checkVisibility();
  }

  async function prepareInitial() {
    const currentRequest = ++request;
    busy = true;
    clearTimeout(timer);
    try {
      await Promise.all(windowAt(center).map(prepare));
      if (currentRequest !== request) return;
      gallery.classList.add('is-carousel');
      prefetch();
    } catch {
      // Keep the current five photos; the next attempt retries failed images.
    } finally {
      if (currentRequest === request) {
        busy = false;
        schedule();
      }
    }
  }

  async function advance(direction, immediate, manual, fromDrag = false) {
    const currentRequest = ++request;
    const target = indexOf(center + direction);
    const incoming = windowAt(target);
    busy = true;
    clearTimeout(timer);
    try {
      await Promise.all([...new Set([...windowAt(center), ...incoming])].map(prepare));
      if (currentRequest !== request || document.hidden || (!manual && !canPlay())) return;
      if (pictures.some(picture => picture.contains(document.activeElement) && !incoming.includes(picture))) return;
      stopAnimations();
      const before = new Map(windowAt(center).map(picture => [picture, picture.getBoundingClientRect()]));
      resetDrag();
      pictures.forEach(picture => {
        const slot = incoming.indexOf(picture);
        picture.hidden = slot < 0;
        if (slot < 0) delete picture.dataset.slot;
        else picture.dataset.slot = String(slot);
      });
      center = target;
      gallery.classList.add('is-carousel');

      if (!immediate && !reducedMotion.matches && typeof gallery.animate === 'function') {
        incoming.forEach(picture => {
          const old = before.get(picture);
          const after = picture.getBoundingClientRect();
          const duration = fromDrag ? 420 : mobile.matches ? 240 : 650;
          const frames = mobile.matches && !fromDrag
            ? [{ opacity: 0 }, { opacity: 1 }]
            : old
              ? [
                  { transformOrigin: 'top left', transform: `translate(${old.left - after.left}px, ${old.top - after.top}px) scale(${old.width / after.width}, ${old.height / after.height})` },
                  { transformOrigin: 'top left', transform: 'none' }
                ]
              : [{ opacity: 0, transform: `translateX(${direction * 16}px)` }, { opacity: 1, transform: 'none' }];
          animations.push(picture.animate(frames, { duration, easing: 'cubic-bezier(.22,1,.36,1)' }));
          const caption = picture.querySelector('figcaption');
          if (caption && !mobile.matches) {
            animations.push(caption.animate([
              { opacity: 0 }, { opacity: 0, offset: 0.75 }, { opacity: 1 }
            ], { duration, easing: 'linear' }));
          }
        });
      }
      if (manual && status) {
        const caption = pictures[center].querySelector('figcaption');
        status.textContent = `현재 사진: ${caption.querySelector('strong').textContent.trim()}, ${caption.querySelector('span').textContent.trim()}`;
      }
      observeCenter();
      prefetch();
    } catch {
      // A failed decode leaves every current photo and link in place.
    } finally {
      if (currentRequest === request) {
        if (fromDrag && dragged.length) resetDrag(true);
        busy = false;
        schedule();
      }
    }
  }

  [[previous, -1], [next, 1]].forEach(([button, direction]) => {
    button.addEventListener('click', event => {
      resetDrag();
      pause();
      advance(direction, event.detail === 0, true);
    });
  });
  toggle.addEventListener('click', () => {
    resetDrag();
    cancelPending();
    userPaused = !userPaused;
    explicitResume = !userPaused;
    updateToggle();
    schedule();
  });
  gallery.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    hovered = true;
    schedule();
  });
  gallery.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'mouse') return;
    hovered = false;
    schedule();
  });
  gallery.addEventListener('focusin', event => {
    if (event.target.matches(':focus-visible')) pause();
    schedule();
  });
  gallery.addEventListener('focusout', event => {
    if (event.target === toggle) explicitResume = false;
    queueMicrotask(schedule);
  });
  gallery.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && !toggle.contains(event.target)) pause();
    suppressClickUntil = 0;
    if (event.button !== 0 || event.isPrimary === false || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const picture = event.target.closest('.cover-picture');
    if (!picture || picture.hidden || !gallery.classList.contains('is-carousel')) return;
    cancelPending();
    stopAnimations();
    resetDrag();
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false };
  });
  gallery.addEventListener('dragstart', event => {
    if (event.target.closest('.cover-picture')) event.preventDefault();
  });
  gallery.addEventListener('click', event => {
    if (event.detail && Date.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClickUntil = 0;
    }
  }, true);
  window.addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.horizontal) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        resetDrag();
        schedule();
        return;
      }
      gesture.horizontal = true;
      pause();
      gallery.setPointerCapture(gesture.id);
      gallery.classList.add('is-dragging');
      dragged = windowAt(center);
    }
    event.preventDefault();
    const limit = Math.min(gallery.getBoundingClientRect().width * 0.2, 160);
    dragOffset = Math.max(-limit, Math.min(limit, dx));
    dragged.forEach(picture => { picture.style.transform = `translateX(${dragOffset}px)`; });
  }, { passive: false });
  window.addEventListener('pointerup', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const horizontal = gesture.horizontal;
    releasePointer();
    if (horizontal) suppressClickUntil = Date.now() + 700;
    const threshold = Math.max(24, Math.min(64, centerImage().getBoundingClientRect().width * 0.12));
    if (horizontal && Math.abs(dragOffset) >= threshold) {
      const direction = dragOffset < 0 ? 1 : -1;
      const incoming = windowAt(indexOf(center + direction));
      // A pointer drag can move its focused edge link out of the visible five.
      if (pictures.some(picture => picture.contains(document.activeElement) && !incoming.includes(picture))) {
        (direction > 0 ? next : previous).focus({ preventScroll: true });
      }
      advance(direction, false, true, true);
    } else {
      resetDrag(true);
      schedule();
    }
  });
  const cancelGesture = event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (gesture.horizontal) suppressClickUntil = Date.now() + 700;
    resetDrag(true);
    schedule();
  };
  window.addEventListener('pointercancel', cancelGesture);
  gallery.addEventListener('lostpointercapture', event => {
    if (event.target === gallery) cancelGesture(event);
  });
  window.addEventListener('blur', () => {
    cancelPending();
    resetDrag();
  });
  window.addEventListener('focus', schedule);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelPending();
      stopAnimations();
      resetDrag();
    }
    schedule();
  });
  reducedMotion.addEventListener('change', () => {
    cancelPending();
    stopAnimations();
    resetDrag();
    updateToggle();
    schedule();
  });
  window.addEventListener('resize', () => {
    cancelPending();
    stopAnimations();
    resetDrag();
    observeCenter();
    schedule();
  });
  if (!observer) window.addEventListener('scroll', checkVisibility, { passive: true });
  controls.hidden = false;
  updateToggle();
  observeCenter();
  prepareInitial();
})();
