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
const saveStatus = document.getElementById('saveStatus');

async function loadSettings() {
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
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!window.settingsAPI) return;

  const newConfig = {
    workMinutes: parseInt(workMinutesInput.value, 10),
    warningSeconds: parseInt(warningSecondsInput.value, 10),
    breakMinutes: parseInt(breakMinutesInput.value, 10),
    skipLockoutSeconds: parseInt(skipLockoutSecondsInput.value, 10),
    pauseMedia: pauseMediaInput.checked,
    autoStart: autoStartInput.checked,
    multiMonitor: multiMonitorInput.checked,
    chimeSound: chimeSoundInput.checked
  };

  try {
    const res = await window.settingsAPI.saveConfig(newConfig);
    if (res.success) {
      saveStatus.textContent = 'Settings saved!';
      setTimeout(() => {
        saveStatus.textContent = '';
        window.settingsAPI.close();
      }, 700);
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

loadSettings();
