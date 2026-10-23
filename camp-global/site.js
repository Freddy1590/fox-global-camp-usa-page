// 신청 URL은 사용자에게 받은 뒤 이 값에 넣습니다.
const applicationUrl = '';
const applicationButton = document.getElementById('apply-button');
applicationButton?.addEventListener('click', () => {
  if (applicationUrl) {
    window.location.assign(applicationUrl);
    return;
  }
  document.getElementById('application-status').hidden = false;
  applicationButton.setAttribute('aria-expanded', 'true');
});
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

// Keyboard actions stay immediate, including native disclosure controls.
document.addEventListener('keydown', () => document.documentElement.classList.add('keyboard-input'));
document.addEventListener('pointerdown', () => document.documentElement.classList.remove('keyboard-input'));
