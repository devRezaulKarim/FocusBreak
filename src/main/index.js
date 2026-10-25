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
  // Play asynchronously via Windows Media.SoundPlayer
  try {
    spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `(New-Object Media.SoundPlayer '${chimePath}').Play()`
    ], { detached: true, stdio: 'ignore' }).unref();
  } catch (err) {
    // Non-fatal if audio fails
  }
}

app.whenReady().then(() => {
  // Initialize managers
  configManager = new ConfigManager();
  stateMachine = new StateMachine(configManager);
  windowManager = new WindowManager(configManager);
  trayManager = new TrayManager(stateMachine, windowManager);

  trayManager.init();

  // Sync Windows autostart setting
  const initialConfig = configManager.get();
  AutostartManager.sync(initialConfig.autoStart);

  // Hook up State Machine events
  stateMachine.on('state-changed', async ({ previousState, currentState }) => {
    const config = configManager.get();

    if (currentState === States.WARNING) {
      windowManager.showBanner();
      if (config.chimeSound) playChime();
    } else if (currentState === States.BREAK_LOCKED || currentState === States.BREAK_UNLOCKED) {
      if (config.pauseMedia) {
        mediaController.pauseMedia();
      }
      windowManager.showOverlay();
      if (config.chimeSound) playChime();
    } else if (currentState === States.WORKING) {
      windowManager.destroyOverlay();
      windowManager.hideBanner();
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

  // System power resume handling (sleep/wake)
  powerMonitor.on('resume', () => {
    stateMachine._tick();
  });

  // IPC handlers: Pre-break warning banner
  ipcMain.on('banner:close', () => {
    // Dismisses banner visually only; timer continues running quietly
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

  // IPC handlers: Break overlay
  ipcMain.on('overlay:skip', () => {
    stateMachine.skipBreak();
  });

  // IPC handlers: Settings
  ipcMain.handle('config:get', () => {
    return configManager.get();
  });

  ipcMain.handle('config:save', (_event, newConfig) => {
    const res = configManager.save(newConfig);
    if (res.success) {
      AutostartManager.sync(res.config.autoStart);
      // Restart current work session with updated intervals if idling or working
      if (stateMachine.state === States.WORKING) {
        stateMachine.startWork();
      }
    }
    return res;
  });

  ipcMain.on('settings:close', () => {
    windowManager.closeSettings();
  });

  // Second instance launched (e.g. clicked desktop icon while running)
  app.on('second-instance', () => {
    windowManager.showSettings();
  });

  // Start the background timer engine immediately
  stateMachine.start();
});

app.on('window-all-closed', (e) => {
  // Prevent app from quitting when windows close (app lives in system tray)
  e.preventDefault();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (trayManager) trayManager.destroy();
});
