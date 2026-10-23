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

// Keyboard actions stay immediate, including native disclosure controls.
document.addEventListener('keydown', () => document.documentElement.classList.add('keyboard-input'));
document.addEventListener('pointerdown', () => document.documentElement.classList.remove('keyboard-input'));
