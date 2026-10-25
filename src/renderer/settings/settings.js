const form = document.getElementById('settingsForm');
const workMinutesInput = document.getElementById('workMinutes');
const warningSecondsInput = document.getElementById('warningSeconds');
const breakMinutesInput = document.getElementById('breakMinutes');
const skipLockoutSecondsInput = document.getElementById('skipLockoutSeconds');
const pauseMediaInput = document.getElementById('pauseMedia');
const autoStartInput = document.getElementById('autoStart');
const multiMonitorInput = document.getElementById('multiMonitor');
const chimeSoundInput = document.getElementById('chimeSound');
const cancelBtn = document.getElementById('cancelBtn');
const saveBtn = document.getElementById('saveBtn');
const saveStatus = document.getElementById('saveStatus');

// Timer Hero Card Elements
const timerCard = document.getElementById('timerCard');
const statusPill = document.getElementById('statusPill');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const timerTime = document.getElementById('timerTime');
const timerSubtext = document.getElementById('timerSubtext');
const toggleTimerBtn = document.getElementById('toggleTimerBtn');
const toggleBtnIcon = document.getElementById('toggleBtnIcon');
const toggleBtnText = document.getElementById('toggleBtnText');

let currentState = 'IDLE';
let savedConfig = null;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getCurrentFormValues() {
  return {
    workMinutes: parseInt(workMinutesInput.value, 10),
    warningSeconds: parseInt(warningSecondsInput.value, 10),
    breakMinutes: parseInt(breakMinutesInput.value, 10),
    skipLockoutSeconds: parseInt(skipLockoutSecondsInput.value, 10),
    pauseMedia: pauseMediaInput.checked,
    autoStart: autoStartInput.checked,
    multiMonitor: multiMonitorInput.checked,
    chimeSound: chimeSoundInput.checked
  };
}

function showError(field, message) {
  const group = document.getElementById(`group${field}`);
  const errEl = document.getElementById(`error${field}`);
  if (group) group.classList.add('has-error');
  if (errEl) {
    errEl.innerHTML = `
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>${message}</span>
    `;
    errEl.classList.add('visible');
  }
}

function clearError(field) {
  const group = document.getElementById(`group${field}`);
  const errEl = document.getElementById(`error${field}`);
  if (group) group.classList.remove('has-error');
  if (errEl) {
    errEl.textContent = '';
    errEl.classList.remove('visible');
  }
}

function validateInputs() {
  let isValid = true;

  const rawWork = workMinutesInput.value.trim();
  const rawWarning = warningSecondsInput.value.trim();
  const rawBreak = breakMinutesInput.value.trim();
  const rawLockout = skipLockoutSecondsInput.value.trim();

  const work = parseInt(rawWork, 10);
  const warning = parseInt(rawWarning, 10);
  const breakMin = parseInt(rawBreak, 10);
  const lockout = parseInt(rawLockout, 10);

  // 1. Work Session (1 to 240 mins)
  if (!rawWork || isNaN(work) || work < 1 || work > 240) {
    showError('WorkMinutes', 'Work session must be between 1 and 240 minutes.');
    isValid = false;
  } else {
    clearError('WorkMinutes');
  }

  // 2. Break Duration (1 to 60 mins - prevents e.g. 1000 min)
  if (!rawBreak || isNaN(breakMin) || breakMin < 1 || breakMin > 60) {
    showError('BreakMinutes', 'Break duration must be between 1 and 60 minutes.');
    isValid = false;
  } else {
    clearError('BreakMinutes');
  }

  // 3. Pre-Break Warning (0 to 300 sec, less than work time)
  if (!rawWarning || isNaN(warning) || warning < 0 || warning > 300) {
    showError('WarningSeconds', 'Pre-break warning must be between 0 and 300 seconds.');
    isValid = false;
  } else if (!isNaN(work) && work > 0 && warning >= work * 60) {
    showError('WarningSeconds', `Warning must be less than total work time (${work * 60}s).`);
    isValid = false;
  } else {
    clearError('WarningSeconds');
  }

  // 4. Skip Lockout (0 to total break seconds)
  const maxLockout = (!isNaN(breakMin) && breakMin > 0) ? (breakMin * 60) : 3600;
  if (!rawLockout || isNaN(lockout) || lockout < 0) {
    showError('SkipLockout', 'Lockout delay must be 0 or more seconds.');
    isValid = false;
  } else if (!isNaN(breakMin) && lockout > maxLockout) {
    showError('SkipLockout', `Lockout delay cannot exceed total break duration (${maxLockout}s).`);
    isValid = false;
  } else {
    clearError('SkipLockout');
  }

  return isValid;
}

function checkDirty() {
  const isValid = validateInputs();

  if (!savedConfig || !isValid) {
    saveBtn.disabled = true;
    return;
  }

  const current = getCurrentFormValues();
  const isDirty = (
    current.workMinutes !== savedConfig.workMinutes ||
    current.warningSeconds !== savedConfig.warningSeconds ||
    current.breakMinutes !== savedConfig.breakMinutes ||
    current.skipLockoutSeconds !== savedConfig.skipLockoutSeconds ||
    current.pauseMedia !== savedConfig.pauseMedia ||
    current.autoStart !== savedConfig.autoStart ||
    current.multiMonitor !== savedConfig.multiMonitor ||
    current.chimeSound !== savedConfig.chimeSound
  );

  saveBtn.disabled = !isDirty;
}

function updateUIState(state, remainingSeconds = 0) {
  currentState = state;

  if (state === 'TERMINATED') {
    timerCard.className = 'timer-hero-card terminated';
    statusPill.className = 'status-pill red';
    statusText.textContent = 'Terminated';
    timerTime.textContent = '--:--';
    timerSubtext.textContent = 'Timer is stopped and will not autostart on PC boot';
    toggleTimerBtn.className = 'btn-hero-action btn-start';
    toggleBtnIcon.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
    `;
    toggleBtnText.textContent = 'Start Timer';
  } else if (state === 'WORKING') {
    timerCard.className = 'timer-hero-card active';
    statusPill.className = 'status-pill';
    statusText.textContent = 'Active (Working)';
    timerTime.textContent = formatTime(remainingSeconds);
    timerSubtext.textContent = 'Focus session in progress';
    toggleTimerBtn.className = 'btn-hero-action btn-terminate';
    toggleBtnIcon.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="2"></rect>
      </svg>
    `;
    toggleBtnText.textContent = 'Terminate Timer';
  } else if (state === 'WARNING') {
    timerCard.className = 'timer-hero-card active';
    statusPill.className = 'status-pill yellow';
    statusText.textContent = 'Break Soon';
    timerTime.textContent = formatTime(remainingSeconds);
    timerSubtext.textContent = 'Pre-break warning active';
    toggleTimerBtn.className = 'btn-hero-action btn-terminate';
    toggleBtnIcon.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="2"></rect>
      </svg>
    `;
    toggleBtnText.textContent = 'Terminate Timer';
  } else if (state === 'BREAK_LOCKED' || state === 'BREAK_UNLOCKED') {
    timerCard.className = 'timer-hero-card active';
    statusPill.className = 'status-pill yellow';
    statusText.textContent = 'On Break';
    timerTime.textContent = formatTime(remainingSeconds);
    timerSubtext.textContent = 'Resting eyes & body';
    toggleTimerBtn.className = 'btn-hero-action btn-terminate';
    toggleBtnIcon.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="2"></rect>
      </svg>
    `;
    toggleBtnText.textContent = 'Terminate Timer';
  } else if (state === 'PAUSED') {
    timerCard.className = 'timer-hero-card';
    statusPill.className = 'status-pill yellow';
    statusText.textContent = 'Paused';
    timerTime.textContent = formatTime(remainingSeconds);
    timerSubtext.textContent = 'Timer temporarily paused';
    toggleTimerBtn.className = 'btn-hero-action btn-terminate';
    toggleBtnIcon.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="2"></rect>
      </svg>
    `;
    toggleBtnText.textContent = 'Terminate Timer';
  }
}

async function init() {
  if (!window.settingsAPI) return;

  try {
    const config = await window.settingsAPI.getConfig();
    workMinutesInput.value = config.workMinutes;
    warningSecondsInput.value = config.warningSeconds;
    breakMinutesInput.value = config.breakMinutes;
    skipLockoutSecondsInput.value = config.skipLockoutSeconds;
    pauseMediaInput.checked = !!config.pauseMedia;
    autoStartInput.checked = !!config.autoStart;
    multiMonitorInput.checked = !!config.multiMonitor;
    chimeSoundInput.checked = !!config.chimeSound;

    // Cache initial saved configuration & set Save button disabled
    savedConfig = getCurrentFormValues();
    checkDirty();

    const status = await window.settingsAPI.getStatus();
    updateUIState(status.state, status.remainingSeconds);
  } catch (err) {
    console.error('Failed to initialize settings:', err);
  }

  window.settingsAPI.onTick((data) => {
    updateUIState(data.state, data.remainingSeconds);
  });

  window.settingsAPI.onStateChange((data) => {
    updateUIState(data.currentState, 0);
  });
}

// Track input changes to dynamically validate and toggle Save & Apply
['input', 'change', 'keyup'].forEach((eventName) => {
  form.addEventListener(eventName, checkDirty);
});

toggleTimerBtn.addEventListener('click', async () => {
  if (!window.settingsAPI) return;

  if (currentState === 'TERMINATED') {
    const status = await window.settingsAPI.startTimer();
    updateUIState(status.state, status.remainingSeconds);
  } else {
    const status = await window.settingsAPI.terminateTimer();
    updateUIState(status.state, 0);
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!window.settingsAPI) return;

  if (!validateInputs()) {
    saveBtn.disabled = true;
    return;
  }

  const newConfig = getCurrentFormValues();

  try {
    const res = await window.settingsAPI.saveConfig(newConfig);
    if (res.success) {
      savedConfig = getCurrentFormValues();
      checkDirty(); // Disables button until next change

      saveStatus.style.color = '#10b981';
      saveStatus.textContent = '✓ Settings saved and applied!';
      setTimeout(() => {
        saveStatus.textContent = '';
      }, 2500);
    } else {
      saveStatus.style.color = '#ef4444';
      saveStatus.textContent = 'Error: ' + res.error;
    }
  } catch (err) {
    saveStatus.style.color = '#ef4444';
    saveStatus.textContent = 'Failed to save settings';
  }
});

cancelBtn.addEventListener('click', () => {
  if (window.settingsAPI) {
    window.settingsAPI.close();
  }
});

init();
