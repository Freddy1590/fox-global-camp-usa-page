'use strict';

const film = document.querySelector('.camp-film');
if (film) {
  const chapters = Array.from(film.querySelectorAll('.film-chapter'));
  const stage = film.querySelector('.film-stage');
  const links = Array.from(film.querySelectorAll('.film-rail a'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
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
  function refresh() {
    film.classList.toggle('film-ready', !reducedMotion.matches);
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
  window.addEventListener('resize', refresh);
  window.addEventListener('pageshow', refresh);
  reducedMotion.addEventListener('change', refresh);
  refresh();
}
