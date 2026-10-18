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
  let wheelPaused = false;
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
    wheelPaused = false;
    wheelDirection = 0;
    root.style.removeProperty('scroll-snap-type');
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
    root.style.setProperty('--film-scroll-offset', `${header.offsetHeight}px`);
    root.classList.toggle('camp-snap', !reducedMotion.matches);
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
  // Follow wheel distance, pausing only when a reading boundary is reached.
  window.addEventListener('wheel', event => {
    if (reducedMotion.matches || event.ctrlKey || event.metaKey || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const direction = Math.sign(event.deltaY);
    if (wheelDirection && direction !== wheelDirection) cancelWheelSnap();
    wheelDirection = direction;
    const stops = readingStops();
    const target = direction > 0
      ? stops.find(top => top > window.scrollY + 2)
      : stops.findLast(top => top < window.scrollY - 2);
    if (target === undefined) return;
    event.preventDefault();
    // Keep native snapping off for wheel input so small moves stay small.
    root.style.scrollSnapType = 'none';
    if (wheelPaused) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
    const position = direction > 0 ? Math.min(window.scrollY + delta, target) : Math.max(window.scrollY + delta, target);
    window.scrollTo({top:position, behavior:'instant'});
    if (Math.abs(position - target) < 1) {
      wheelPaused = true;
      wheelTimer = setTimeout(() => { wheelPaused = false; wheelTimer = null; }, 200);
    }
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
