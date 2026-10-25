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

// Timer Card Elements
const timerCard = document.getElementById('timerCard');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const timerTime = document.getElementById('timerTime');
const timerSubtext = document.getElementById('timerSubtext');
const toggleTimerBtn = document.getElementById('toggleTimerBtn');

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

function checkDirty() {
  if (!savedConfig) {
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
    timerCard.className = 'timer-card terminated';
    statusDot.className = 'status-indicator red';
    statusText.textContent = 'Terminated (Inactive)';
    timerTime.textContent = '--:--';
    timerSubtext.textContent = 'Timer is stopped and will not start on PC boot';
    toggleTimerBtn.className = 'btn-timer btn-start';
    toggleTimerBtn.innerHTML = '▶️ Start Timer';
  } else if (state === 'WORKING') {
    timerCard.className = 'timer-card active';
    statusDot.className = 'status-indicator';
    statusText.textContent = 'Active (Working)';
    timerTime.textContent = formatTime(remainingSeconds);
    timerSubtext.textContent = 'Focus session in progress';
    toggleTimerBtn.className = 'btn-timer btn-terminate';
    toggleTimerBtn.innerHTML = '🛑 Terminate Timer';
  } else if (state === 'WARNING') {
    timerCard.className = 'timer-card active';
    statusDot.className = 'status-indicator yellow';
    statusText.textContent = 'Warning (Break Soon)';
    timerTime.textContent = formatTime(remainingSeconds);
    timerSubtext.textContent = 'Pre-break warning active';
    toggleTimerBtn.className = 'btn-timer btn-terminate';
    toggleTimerBtn.innerHTML = '🛑 Terminate Timer';
  } else if (state === 'BREAK_LOCKED' || state === 'BREAK_UNLOCKED') {
    timerCard.className = 'timer-card active';
    statusDot.className = 'status-indicator yellow';
    statusText.textContent = 'On Break';
    timerTime.textContent = formatTime(remainingSeconds);
    timerSubtext.textContent = 'Break in progress';
    toggleTimerBtn.className = 'btn-timer btn-terminate';
    toggleTimerBtn.innerHTML = '🛑 Terminate Timer';
  } else if (state === 'PAUSED') {
    timerCard.className = 'timer-card';
    statusDot.className = 'status-indicator yellow';
    statusText.textContent = 'Paused';
    timerTime.textContent = formatTime(remainingSeconds);
    timerSubtext.textContent = 'Timer temporarily paused';
    toggleTimerBtn.className = 'btn-timer btn-terminate';
    toggleTimerBtn.innerHTML = '🛑 Terminate Timer';
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

// Track any changes made by the user to enable/disable Save & Apply button
['input', 'change'].forEach((eventName) => {
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

  const newConfig = getCurrentFormValues();

  try {
    const res = await window.settingsAPI.saveConfig(newConfig);
    if (res.success) {
      savedConfig = getCurrentFormValues();
      checkDirty(); // Disables button again until another change is made

      saveStatus.style.color = '#10b981';
      saveStatus.textContent = '✓ Settings saved and applied!';
      setTimeout(() => {
        saveStatus.textContent = '';
      }, 2500);
      // NOTE: GUI stays open so user can continue monitoring or managing
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
