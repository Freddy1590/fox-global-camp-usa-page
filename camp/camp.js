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

const copyKakao = document.getElementById('copy-kakao-id');
if (copyKakao) {
  copyKakao.addEventListener('click', async () => {
    const status = document.getElementById('copy-kakao-status');
    try {
      await navigator.clipboard.writeText('FOX_LC');
      status.textContent = '카카오톡 ID를 복사했습니다.';
    } catch {
      status.textContent = '복사하지 못했습니다. 카카오톡에서 FOX_LC를 검색해주세요.';
    }
  });
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
