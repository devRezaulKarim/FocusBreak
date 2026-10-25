const countdownEl = document.getElementById('countdown');
const ringProgress = document.getElementById('ringProgress');
const skipBtn = document.getElementById('skipBtn');
const skipBtnText = document.getElementById('skipBtnText');
const btnIcon = document.getElementById('btnIcon');
const actionArea = document.getElementById('actionArea');
const wellnessTip = document.getElementById('wellnessTip');

// Check URL param if primary monitor
const urlParams = new URLSearchParams(window.location.search);
const isPrimary = urlParams.get('primary') !== '0';

if (!isPrimary && actionArea) {
  actionArea.style.display = 'none';
}

// Absorb keyboard events so background browser windows/apps don't receive accidental keypresses
window.addEventListener('keydown', (e) => {
  e.stopPropagation();
});

const CIRCUMFERENCE = 2 * Math.PI * 105; // 659.73
if (ringProgress) {
  ringProgress.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
  ringProgress.style.strokeDashoffset = '0';
}

let totalBreakSeconds = 300; // Will adjust dynamically from first tick

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Rotating wellness tips
const TIPS = [
  'Look at something 20 feet away to relax your eye muscles.',
  'Roll your shoulders back and gently stretch your neck.',
  'Hydrate: Take a relaxing sip of water.',
  'Take three slow, deep belly breaths.',
  'Stand up, shake out your hands, and loosen your wrists.',
  'Adjust your posture and uncross your legs.'
];

let tipIndex = 0;
setInterval(() => {
  if (wellnessTip) {
    wellnessTip.style.opacity = '0';
    setTimeout(() => {
      tipIndex = (tipIndex + 1) % TIPS.length;
      wellnessTip.textContent = TIPS[tipIndex];
      wellnessTip.style.opacity = '1';
    }, 300);
  }
}, 8000);

let isUnlocked = false;

if (window.overlayAPI) {
  window.overlayAPI.onTick((data) => {
    if (data.remainingSeconds !== undefined) {
      const remaining = data.remainingSeconds;
      countdownEl.textContent = formatTime(remaining);

      if (remaining > totalBreakSeconds) {
        totalBreakSeconds = remaining;
      }

      if (ringProgress && totalBreakSeconds > 0) {
        const fraction = remaining / totalBreakSeconds;
        const offset = CIRCUMFERENCE * (1 - fraction);
        ringProgress.style.strokeDashoffset = String(offset);
      }
    }

    if (!isPrimary) return;

    const lockoutLeft = data.lockoutRemainingSeconds || 0;

    if (lockoutLeft > 0) {
      isUnlocked = false;
      skipBtn.disabled = true;
      skipBtn.className = 'skip-btn locked';
      btnIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      `;
      skipBtnText.textContent = `Skip locked (Available in ${lockoutLeft}s)`;
    } else {
      if (!isUnlocked) {
        isUnlocked = true;
        skipBtn.disabled = false;
        skipBtn.className = 'skip-btn unlocked';
        btnIcon.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polygon points="5 4 15 12 5 20 5 4"></polygon>
            <line x1="19" y1="5" x2="19" y2="19"></line>
          </svg>
        `;
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
