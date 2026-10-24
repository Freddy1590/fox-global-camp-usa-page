// 신청 URL은 사용자에게 받은 뒤 이 값에 넣습니다.
const applicationUrl = '';
const applicationButton = document.getElementById('apply-button');
if (applicationButton && applicationUrl) {
  applicationButton.disabled = false;
  applicationButton.textContent = '참가 신청';
  document.getElementById('application-status').textContent = '신청 페이지에서 참가 정보를 입력해주세요.';
  applicationButton.addEventListener('click', () => window.location.assign(applicationUrl));
}
const copyButton = document.getElementById('copy-kakao');
copyButton?.addEventListener('click', async () => {
  const status = document.getElementById('copy-status');
  try {
    await navigator.clipboard.writeText('FOX_LC');
    status.textContent = 'FOX_LC를 복사했습니다. 카카오톡에서 검색해주세요.';
  } catch {
    status.textContent = '복사하지 못했습니다. 카카오톡에서 FOX_LC를 검색해주세요.';
  }
});

// Show the mobile shortcut only when an existing inquiry action is off screen.
const mobileContact = document.querySelector('.mobile-contact');
if (mobileContact && 'IntersectionObserver' in window) {
  const visibleContacts = new Set();
  const inquiryObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visibleContacts.add(entry.target);
      else visibleContacts.delete(entry.target);
    });
    mobileContact.hidden = visibleContacts.size > 0;
  });
  document.querySelectorAll('a.btn[href="#contact"], #contact').forEach(target => inquiryObserver.observe(target));
}

// Keyboard actions stay immediate, including native disclosure controls.
document.addEventListener('keydown', () => document.documentElement.classList.add('keyboard-input'));
document.addEventListener('pointerdown', () => document.documentElement.classList.remove('keyboard-input'));

// Preserve native navigation; only the requested pointer journey gets a brief arrival fade.
const introTransitionKey = 'fox-camp-intro-transition';
try {
  const startedAt = Number(sessionStorage.getItem(introTransitionKey));
  sessionStorage.removeItem(introTransitionKey);
  if (document.body.classList.contains('about-page') && startedAt > 0 &&
      Date.now() - startedAt < 5000 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelector('main')?.animate([{ opacity: .65 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
  }
} catch { /* File previews can block session storage; links still navigate normally. */ }
document.querySelector('[data-camp-intro]')?.addEventListener('click', event => {
  if (event.defaultPrevented || event.detail === 0 || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  try { sessionStorage.setItem(introTransitionKey, String(Date.now())); } catch {}
});
