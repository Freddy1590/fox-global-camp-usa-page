(() => {
'use strict';

const yearLinks = Array.from(document.querySelectorAll('.year-nav a'));
if (yearLinks.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      yearLinks.forEach(link => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-25% 0px -60% 0px', threshold: 0 });
  document.querySelectorAll('.history-year').forEach(year => observer.observe(year));
}

const photoDialog = document.getElementById('photo-dialog');
const photos = Array.from(document.querySelectorAll('.lightbox-trigger'));
if (photoDialog && photos.length && typeof photoDialog.showModal === 'function') {
  const image = document.getElementById('dialog-photo');
  const caption = document.getElementById('photo-caption');
  let current = 0;
  let returnFocus = null;
  const show = index => {
    current = (index + photos.length) % photos.length;
    image.src = photos[current].href;
    image.alt = photos[current].querySelector('img').alt;
    caption.textContent = photos[current].dataset.caption;
  };
  photos.forEach((link, index) => link.addEventListener('click', event => {
    event.preventDefault();
    returnFocus = link;
    show(index);
    photoDialog.showModal();
    document.body.style.overflow = 'hidden';
    document.getElementById('photo-close').focus();
  }));
  document.getElementById('photo-close').addEventListener('click', () => photoDialog.close());
  document.getElementById('photo-prev').addEventListener('click', () => show(current - 1));
  document.getElementById('photo-next').addEventListener('click', () => show(current + 1));
  photoDialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  photoDialog.addEventListener('close', () => {
    document.body.style.overflow = '';
    returnFocus?.focus();
  });
  photoDialog.addEventListener('click', event => {
    if (event.target === photoDialog) photoDialog.close();
  });
}

let activeVideo = null;
const stopVideo = () => {
  if (!activeVideo) return;
  activeVideo.querySelector('iframe')?.remove();
  activeVideo.parentElement.querySelector('.video-close')?.remove();
  activeVideo.querySelector('.video-preview').hidden = false;
  activeVideo = null;
};
document.querySelectorAll('.video-preview[data-youtube]').forEach(preview => {
  if (!/^[A-Za-z0-9_-]{11}$/.test(preview.dataset.youtube)) return;
  preview.addEventListener('click', event => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    stopVideo();
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${preview.dataset.youtube}?autoplay=1&playsinline=1&rel=0`;
    iframe.title = preview.dataset.title;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    activeVideo = preview.parentElement;
    preview.hidden = true;
    activeVideo.append(iframe);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'video-close';
    close.textContent = '영상 닫기';
    close.setAttribute('aria-label', `${preview.dataset.title} 영상 닫기`);
    close.addEventListener('click', () => {
      stopVideo();
      preview.focus();
    });
    activeVideo.after(close);
    iframe.focus();
  });
});
document.querySelectorAll('details').forEach(details => {
  details.addEventListener('toggle', () => {
    if (!details.open && activeVideo && details.contains(activeVideo)) stopVideo();
  });
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !activeVideo || photoDialog?.open) return;
  const preview = activeVideo.querySelector('.video-preview');
  stopVideo();
  preview.focus();
});

// Deep links also reveal records kept inside optional photo and video sections.
const revealHash = () => {
  let id;
  try { id = decodeURIComponent(window.location.hash.slice(1)); }
  catch { return; }
  const target = document.getElementById(id);
  if (!target) return;
  let parent = target.parentElement;
  while (parent) {
    if (parent.tagName === 'DETAILS') parent.open = true;
    parent = parent.parentElement;
  }
  requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'instant' }));
};
window.addEventListener('hashchange', revealHash);
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', () => {
    if (link.hash === window.location.hash) revealHash();
  });
});
if (window.location.hash) revealHash();

})();
