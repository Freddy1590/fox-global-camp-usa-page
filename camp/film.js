'use strict';

const film = document.querySelector('.camp-film');
if (film) {
  const chapters = Array.from(film.querySelectorAll('.film-chapter'));
  const stage = film.querySelector('.film-stage');
  const links = Array.from(film.querySelectorAll('.film-rail a'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const images = chapters.map(chapter => {
    const image = chapter.querySelector('.chapter-visual img').cloneNode();
    image.alt = '';
    image.loading = 'eager';
    image.removeAttribute('fetchpriority');
    stage.append(image);
    return image;
  });
  let activeIndex = -1;
  let frame;
  let wheelTimer;
  let wheelDirection = 0;
  let wheelDistance = 0;
  let wheelConsumed = false;
  let wheelTarget = null;
  function activate(chapter) {
    const index = chapters.indexOf(chapter);
    if (index < 0 || index === activeIndex) return;
    activeIndex = index;
    chapters.forEach((item, i) => item.classList.toggle('is-active', i === index));
    images.forEach((image, i) => image.classList.toggle('is-active', i === index));
    links.forEach(link => {
      if (link.hash === `#${chapter.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function syncScene() {
    frame = null;
    if (wheelTarget !== null && Math.abs(window.scrollY - wheelTarget) < 2) {
      finishWheelSnap();
    }
    if (reducedMotion.matches) return;
    const header = document.querySelector('.site-header').offsetHeight;
    const line = header + (window.innerHeight - header) * .72;
    let current = chapters[0];
    // Read the current position so fast jumps cannot skip a scene trigger.
    chapters.forEach(chapter => {
      if (chapter.getBoundingClientRect().top <= header + 2 || chapter.querySelector('.chapter-copy').getBoundingClientRect().top <= line) current = chapter;
    });
    activate(current);
  }
  function queueScene() {
    if (!frame) frame = requestAnimationFrame(syncScene);
  }
  function cancelWheelSnap() {
    clearTimeout(wheelTimer);
    wheelTimer = null;
    if (wheelTarget !== null) window.scrollTo({top:window.scrollY, behavior:'instant'});
    wheelTarget = null;
    wheelConsumed = false;
    wheelDirection = 0;
    wheelDistance = 0;
    root.style.removeProperty('scroll-snap-type');
  }
  function finishWheelSnap() {
    if (wheelTarget === null) return;
    wheelTarget = null;
    clearTimeout(wheelTimer);
    // Pause at the stop without extending the pause on every wheel event.
    wheelTimer = setTimeout(cancelWheelSnap, 280);
  }
  function readingStops() {
    const available = window.innerHeight - header.offsetHeight;
    if (available <= 0) return [];
    const stops = [];
    chapters.forEach(chapter => {
      const bounds = chapter.getBoundingClientRect();
      const start = bounds.top + window.scrollY - header.offsetHeight;
      const end = start + Math.max(0, bounds.height - available);
      stops.push(start);
      // Overlapping reading positions keep long sections readable in narrow windows.
      for (let top = start + available * .85; top < end - 2; top += available * .85) stops.push(top);
      if (end > start + 2) stops.push(end);
    });
    stops.push(root.scrollHeight - window.innerHeight);
    return stops;
  }
  function refreshSnap() {
    const availableHeight = window.innerHeight - header.offsetHeight;
    root.style.setProperty('--film-scroll-offset', `${header.offsetHeight}px`);
    root.classList.toggle('camp-snap', !reducedMotion.matches);
    // Long scenes must remain readable, including on short desktop screens.
    root.classList.toggle('camp-snap-fit', !reducedMotion.matches && chapters.every(chapter =>
      chapter.getBoundingClientRect().height <= availableHeight + .5
    ));
  }
  function refresh() {
    cancelWheelSnap();
    film.classList.toggle('film-ready', !reducedMotion.matches);
    refreshSnap();
    if (reducedMotion.matches) return;
    images.forEach((image, i) => {
      image.style.setProperty('--photo-position', getComputedStyle(chapters[i]).getPropertyValue('--photo-position') || '50% 45%');
    });
    syncScene();
  }
  film.addEventListener('focusin', event => {
    const chapter = event.target.closest('.film-chapter');
    if (chapter) activate(chapter);
  });
  window.addEventListener('scroll', queueScene, {passive:true});
  window.addEventListener('scrollend', finishWheelSnap);
  // Move one reading position at a time, with a brief pause before more input.
  window.addEventListener('wheel', event => {
    if (reducedMotion.matches || event.ctrlKey || event.metaKey || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const direction = Math.sign(event.deltaY);
    if (wheelDirection && direction !== wheelDirection) cancelWheelSnap();
    wheelDirection = direction;
    const stops = readingStops();
    const target = direction > 0
      ? stops.find(top => top > window.scrollY + 2)
      : stops.findLast(top => top < window.scrollY - 2);
    if (!wheelConsumed && target === undefined) {
      cancelWheelSnap();
      return;
    }
    event.preventDefault();
    root.style.scrollSnapType = 'none';
    if (wheelConsumed) return;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(cancelWheelSnap, 220);
    wheelDistance += Math.abs(event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
    if (wheelDistance < 24) return;
    wheelConsumed = true;
    wheelTarget = target;
    clearTimeout(wheelTimer);
    // Release even if the browser interrupts motion without reporting its end.
    wheelTimer = setTimeout(cancelWheelSnap, 1500);
    window.scrollTo({top:target, behavior:'smooth'});
  }, {passive:false});
  window.addEventListener('keydown', cancelWheelSnap);
  window.addEventListener('pointerdown', cancelWheelSnap);
  window.addEventListener('pagehide', cancelWheelSnap);
  window.addEventListener('resize', refresh);
  window.addEventListener('pageshow', refresh);
  reducedMotion.addEventListener('change', refresh);
  const sizeObserver = new ResizeObserver(refreshSnap);
  [header, ...chapters].forEach(element => sizeObserver.observe(element));
  document.fonts.ready.then(refresh);
  refresh();
}
