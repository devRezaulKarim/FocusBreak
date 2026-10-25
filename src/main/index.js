const { app, globalShortcut, ipcMain, powerMonitor } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const ConfigManager = require('./config');
const { StateMachine, States } = require('./stateMachine');
const WindowManager = require('./windowManager');
const TrayManager = require('./trayManager');
const AutostartManager = require('./autostart');
const mediaController = require('./mediaController');

// Ensure single instance only
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let configManager;
let stateMachine;
let windowManager;
let trayManager;

function playChime() {
  const chimePath = path.join(__dirname, '../../assets/chime.wav');
  try {
    spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `(New-Object Media.SoundPlayer '${chimePath}').Play()`
    ], { detached: true, stdio: 'ignore' }).unref();
  } catch (err) {
    // Non-fatal
  }
}

app.whenReady().then(() => {
  // Initialize managers
  configManager = new ConfigManager();
  stateMachine = new StateMachine(configManager);
  windowManager = new WindowManager(configManager);
  trayManager = new TrayManager(stateMachine, windowManager);

  trayManager.init();

  const currentConfig = configManager.get();
  // Sync autostart considering termination state
  AutostartManager.sync(currentConfig.autoStart, currentConfig.isTerminated);

  // Hook up State Machine events
  stateMachine.on('state-changed', async ({ previousState, currentState }) => {
    const config = configManager.get();

    // Check if transitioning into a break from a non-break state
    const isEnteringBreak = (currentState === States.BREAK_LOCKED || currentState === States.BREAK_UNLOCKED) &&
                            previousState !== States.BREAK_LOCKED &&
                            previousState !== States.BREAK_UNLOCKED;

    if (currentState === States.WARNING) {
      windowManager.showBanner();
      if (config.chimeSound) playChime();
    } else if (isEnteringBreak) {
      // Pause active media once per break session
      if (config.pauseMedia) {
        mediaController.pauseMedia();
      }
      windowManager.showOverlay();
      if (config.chimeSound) playChime();
    } else if (currentState === States.WORKING) {
      mediaController.resetPauseState();
      windowManager.destroyOverlay();
      windowManager.hideBanner();
    } else if (currentState === States.TERMINATED) {
      mediaController.resetPauseState();
      windowManager.destroyOverlay();
      windowManager.hideBanner();
      AutostartManager.sync(false, true);
    }

    trayManager.updateMenu();
    windowManager.broadcast('timer:state-changed', { previousState, currentState });
  });

  stateMachine.on('tick', (data) => {
    windowManager.broadcast('timer:tick', data);
    trayManager.updateTooltip(data);
  });

  // Emergency exit shortcut
  globalShortcut.register('CommandOrControl+Alt+Shift+Escape', () => {
    console.log('Emergency exit shortcut triggered');
    stateMachine.emergencyDismiss();
  });

  // System power resume handling
  powerMonitor.on('resume', () => {
    stateMachine._tick();
  });

  // Pre-break banner IPCs
  ipcMain.on('banner:close', () => {
    windowManager.hideBanner();
  });

  ipcMain.on('banner:skip', () => {
    stateMachine.skipWarning();
  });

  ipcMain.on('banner:postpone', (_event, minutes) => {
    stateMachine.postpone(minutes || 5);
  });

  ipcMain.on('banner:break-now', () => {
    stateMachine.takeBreakNow();
  });

  // Overlay IPCs
  ipcMain.on('overlay:skip', () => {
    stateMachine.skipBreak();
  });

  // Timer Control IPCs (Terminate & Start)
  ipcMain.handle('timer:terminate', () => {
    stateMachine.terminate();
    return stateMachine.getStatus();
  });

  ipcMain.handle('timer:start', () => {
    stateMachine.startTimer();
    const cfg = configManager.get();
    AutostartManager.sync(cfg.autoStart, false);
    return stateMachine.getStatus();
  });

  ipcMain.handle('timer:status', () => {
    return stateMachine.getStatus();
  });

  // Settings IPCs
  ipcMain.handle('config:get', () => {
    return configManager.get();
  });

  ipcMain.handle('config:save', (_event, newConfig) => {
    // Once saved from GUI, mark as configured
    const res = configManager.save({ ...newConfig, isConfigured: true });
    if (res.success) {
      AutostartManager.sync(res.config.autoStart, res.config.isTerminated);
      if (stateMachine.state === States.WORKING) {
        stateMachine.startWork();
      }
    }
    return res;
  });

  ipcMain.on('settings:close', () => {
    windowManager.closeSettings();
  });

  // Second instance launched: open settings
  app.on('second-instance', () => {
    windowManager.showSettings();
  });

  // Start the background timer engine
  stateMachine.start();

  // If this is an interactive run (not launched with --hidden on Windows boot),
  // OR if this is the first run (not yet configured), open the GUI!
  const isHiddenBoot = process.argv.includes('--hidden');
  if (!isHiddenBoot || !currentConfig.isConfigured) {
    windowManager.showSettings();
  }
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (trayManager) trayManager.destroy();
});
