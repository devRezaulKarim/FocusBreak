const countdownEl = document.getElementById('countdown');
const progressFill = document.getElementById('progressFill');
const closeBtn = document.getElementById('closeBtn');
const skipBtn = document.getElementById('skipBtn');
const postponeBtn = document.getElementById('postponeBtn');
const breakNowBtn = document.getElementById('breakNowBtn');

let maxWarningSeconds = 60; // Initial default, dynamic from first tick

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

if (window.bannerAPI) {
  window.bannerAPI.onTick((data) => {
    if (data.remainingSeconds !== undefined) {
      const remaining = data.remainingSeconds;
      countdownEl.textContent = formatTime(remaining);

      if (remaining > maxWarningSeconds) {
        maxWarningSeconds = remaining;
      }

      if (progressFill && maxWarningSeconds > 0) {
        const pct = Math.max(0, Math.min(100, (remaining / maxWarningSeconds) * 100));
        progressFill.style.width = `${pct}%`;
      }
    }
  });

  closeBtn.addEventListener('click', () => {
    window.bannerAPI.close();
  });

  skipBtn.addEventListener('click', () => {
    window.bannerAPI.skip();
  });

  postponeBtn.addEventListener('click', () => {
    window.bannerAPI.postpone(5);
  });

  breakNowBtn.addEventListener('click', () => {
    window.bannerAPI.breakNow();
  });
}
