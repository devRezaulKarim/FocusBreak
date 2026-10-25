const { BrowserWindow, screen } = require('electron');
const path = require('path');

class WindowManager {
  constructor(configManager) {
    this.configManager = configManager;
    this.bannerWindow = null;
    this.overlayWindows = [];
    this.settingsWindow = null;
  }

  /* -------------------------------------------------------------
   * PRE-BREAK WARNING BANNER WINDOW
   * ------------------------------------------------------------- */
  showBanner() {
    if (this.bannerWindow && !this.bannerWindow.isDestroyed()) {
      this.positionBanner();
      this.bannerWindow.show();
      return;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { workArea } = primaryDisplay;

    const width = 420;
    const height = 150;
    const x = workArea.x + workArea.width - width - 24;
    const y = workArea.y + workArea.height - height - 24;

    this.bannerWindow = new BrowserWindow({
      width,
      height,
      x,
      y,
      frame: false,
      transparent: true,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false, // Prevents stealing keyboard focus during typing/gaming/calls
      hasShadow: true,
      webPreferences: {
        preload: path.join(__dirname, '../preload/bannerPreload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    this.bannerWindow.setAlwaysOnTop(true, 'floating');
    this.bannerWindow.loadFile(path.join(__dirname, '../renderer/banner/banner.html'));

    this.bannerWindow.on('closed', () => {
      this.bannerWindow = null;
    });
  }

  positionBanner() {
    if (!this.bannerWindow || this.bannerWindow.isDestroyed()) return;
    const primaryDisplay = screen.getPrimaryDisplay();
    const { workArea } = primaryDisplay;
    const width = 420;
    const height = 150;
    const x = workArea.x + workArea.width - width - 24;
    const y = workArea.y + workArea.height - height - 24;
    this.bannerWindow.setBounds({ x, y, width, height });
  }

  hideBanner() {
    if (this.bannerWindow && !this.bannerWindow.isDestroyed()) {
      this.bannerWindow.hide();
    }
  }

  /* -------------------------------------------------------------
   * FULLSCREEN BREAK OVERLAY WINDOWS (MULTI-MONITOR)
   * ------------------------------------------------------------- */
  showOverlay() {
    this.hideBanner();
    this.destroyOverlay();

    const config = this.configManager.get();
    const allDisplays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();
    const targetDisplays = config.multiMonitor ? allDisplays : [primaryDisplay];

    targetDisplays.forEach((display) => {
      const isPrimary = display.id === primaryDisplay.id;
      const win = new BrowserWindow({
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
        frame: false,
        fullscreen: true,
        kiosk: true,
        alwaysOnTop: true,
        backgroundColor: '#000000',
        skipTaskbar: true,
        webPreferences: {
          preload: path.join(__dirname, '../preload/overlayPreload.js'),
          contextIsolation: true,
          nodeIntegration: false
        }
      });

      win.setAlwaysOnTop(true, 'screen-saver');
      const urlQuery = isPrimary ? '?primary=1' : '?primary=0';
      win.loadFile(path.join(__dirname, '../renderer/overlay/overlay.html'), {
        search: urlQuery
      });

      this.overlayWindows.push(win);
    });
  }

  destroyOverlay() {
    if (this.overlayWindows.length > 0) {
      this.overlayWindows.forEach((win) => {
        try {
          if (!win.isDestroyed()) {
            win.setKiosk(false);
            win.close();
          }
        } catch (e) {
          // ignore
        }
      });
      this.overlayWindows = [];
    }
  }

  /* -------------------------------------------------------------
   * SETTINGS WINDOW
   * ------------------------------------------------------------- */
  showSettings() {
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.focus();
      return;
    }

    this.settingsWindow = new BrowserWindow({
      width: 520,
      height: 720,
      resizable: false,
      minimizable: true,
      maximizable: false,
      title: 'FocusBreak Control Center',
      autoHideMenuBar: true,
      backgroundColor: '#0a0d14',
      webPreferences: {
        preload: path.join(__dirname, '../preload/settingsPreload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    this.settingsWindow.loadFile(path.join(__dirname, '../renderer/settings/settings.html'));

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });
  }

  closeSettings() {
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.close();
    }
  }

  /* -------------------------------------------------------------
   * BROADCAST IPC TO ALL ACTIVE RENDERERS
   * ------------------------------------------------------------- */
  broadcast(channel, data) {
    if (this.bannerWindow && !this.bannerWindow.isDestroyed()) {
      this.bannerWindow.webContents.send(channel, data);
    }
    this.overlayWindows.forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data);
      }
    });
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.webContents.send(channel, data);
    }
  }
}

module.exports = WindowManager;
