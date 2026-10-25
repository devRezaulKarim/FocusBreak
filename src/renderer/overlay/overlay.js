const countdownEl = document.getElementById('countdown');
const skipBtn = document.getElementById('skipBtn');
const skipBtnText = document.getElementById('skipBtnText');
const lockIcon = document.getElementById('lockIcon');
const actionArea = document.getElementById('actionArea');

// Check URL param if this is the primary monitor or secondary
const urlParams = new URLSearchParams(window.location.search);
const isPrimary = urlParams.get('primary') !== '0';

if (!isPrimary && actionArea) {
  // Hide the skip button on secondary monitors so user controls it on primary
  actionArea.style.display = 'none';
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

let isUnlocked = false;

if (window.overlayAPI) {
  window.overlayAPI.onTick((data) => {
    if (data.remainingSeconds !== undefined) {
      countdownEl.textContent = formatTime(data.remainingSeconds);
    }

    if (!isPrimary) return;

    const lockoutLeft = data.lockoutRemainingSeconds || 0;

    if (lockoutLeft > 0) {
      isUnlocked = false;
      skipBtn.disabled = true;
      skipBtn.className = 'skip-btn locked';
      lockIcon.style.display = 'inline';
      skipBtnText.textContent = `Skip locked (Available in ${lockoutLeft}s)`;
    } else {
      if (!isUnlocked) {
        isUnlocked = true;
        skipBtn.disabled = false;
        skipBtn.className = 'skip-btn unlocked';
        lockIcon.style.display = 'none';
        skipBtnText.textContent = 'Skip Break & Resume Work';
      }
    }
  });

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      if (isUnlocked) {
        window.overlayAPI.skip();
      }
    });
  }
}
