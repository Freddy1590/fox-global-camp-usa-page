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
  let wheelStart = 0;
  let wheelDirection = 0;
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
      if (chapter.querySelector('.chapter-copy').getBoundingClientRect().top <= line) current = chapter;
    });
    activate(current);
  }
  function queueScene() {
    if (!frame) frame = requestAnimationFrame(syncScene);
  }
  function cancelWheelSnap() {
    clearTimeout(wheelTimer);
    wheelTimer = null;
    root.style.removeProperty('scroll-snap-type');
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
  // Let small wheel steps accumulate before the browser settles on a scene.
  window.addEventListener('wheel', event => {
    if (!event.deltaY || event.ctrlKey) return;
    const direction = Math.sign(event.deltaY);
    if (!wheelTimer || direction !== wheelDirection) wheelStart = window.scrollY;
    wheelDirection = direction;
    root.style.scrollSnapType = 'none';
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => {
      wheelTimer = null;
      const position = window.scrollY;
      root.style.removeProperty('scroll-snap-type');
      if (!root.classList.contains('camp-snap-fit') || Math.abs(position - wheelStart) < 24) return;
      // A slow mouse notch should advance rather than snap back to its origin.
      const stops = chapters.map(chapter => chapter.getBoundingClientRect().top + window.scrollY - header.offsetHeight);
      stops.push(root.scrollHeight - window.innerHeight);
      const ahead = stops.filter(top => wheelDirection * (top - wheelStart) > 1);
      if (ahead.length) {
        const target = ahead.reduce((nearest, top) => Math.abs(top - position) < Math.abs(nearest - position) ? top : nearest);
        window.scrollTo({top:target, behavior:'smooth'});
      }
    }, 180);
  }, {passive:false}); // Read the origin before default scrolling; never cancel input.
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
