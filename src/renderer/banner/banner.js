const countdownEl = document.getElementById('countdown');
const closeBtn = document.getElementById('closeBtn');
const skipBtn = document.getElementById('skipBtn');
const postponeBtn = document.getElementById('postponeBtn');
const breakNowBtn = document.getElementById('breakNowBtn');

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

if (window.bannerAPI) {
  window.bannerAPI.onTick((data) => {
    if (data.remainingSeconds !== undefined) {
      countdownEl.textContent = formatTime(data.remainingSeconds);
    }
  });

  // Close button hides the banner only (does NOT skip or reset timer)
  closeBtn.addEventListener('click', () => {
    window.bannerAPI.close();
  });

  // Skip button skips this break entirely
  skipBtn.addEventListener('click', () => {
    window.bannerAPI.skip();
  });

  // Postpone button delays break by 5 minutes
  postponeBtn.addEventListener('click', () => {
    window.bannerAPI.postpone(5);
  });

  // Break now button triggers break immediately
  breakNowBtn.addEventListener('click', () => {
    window.bannerAPI.breakNow();
  });
}
