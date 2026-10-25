const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');

class TrayManager {
  constructor(stateMachine, windowManager) {
    this.stateMachine = stateMachine;
    this.windowManager = windowManager;
    this.tray = null;
  }

  init() {
    const iconPath = path.join(__dirname, '../../assets/icon.png');
    let icon;
    try {
      icon = nativeImage.createFromPath(iconPath);
      if (icon.isEmpty()) {
        icon = this.createDefaultIcon();
      }
    } catch (e) {
      icon = this.createDefaultIcon();
    }

    this.tray = new Tray(icon);
    this.tray.setToolTip('FocusBreak: Starting...');

    this.tray.on('double-click', () => {
      this.windowManager.showSettings();
    });

    this.updateMenu();
  }

  createDefaultIcon() {
    // Fallback: 16x16 minimalist blue clock icon using data URL
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="#3b82f6" stroke="#ffffff" stroke-width="1.5"/>
        <polyline points="8,4 8,8 11,8" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `;
    return nativeImage.createFromDataURL('data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'));
  }

  updateTooltip(status) {
    if (!this.tray) return;

    let text = 'FocusBreak';
    const mins = Math.floor(status.remainingSeconds / 60);
    const secs = status.remainingSeconds % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    switch (status.state) {
      case 'WORKING':
        text = `FocusBreak: Working (${timeStr} remaining)`;
        break;
      case 'WARNING':
        text = `FocusBreak: Break starting in ${timeStr}!`;
        break;
      case 'BREAK_LOCKED':
        text = `FocusBreak: On Break (${timeStr} left, locked)`;
        break;
      case 'BREAK_UNLOCKED':
        text = `FocusBreak: On Break (${timeStr} left)`;
        break;
      case 'PAUSED':
        text = 'FocusBreak: Paused';
        break;
      default:
        text = 'FocusBreak';
    }

    this.tray.setToolTip(text);
  }

  updateMenu() {
    if (!this.tray) return;

    const { state } = this.stateMachine.getStatus();
    const isPaused = state === 'PAUSED';
    const isBreak = state === 'BREAK_LOCKED' || state === 'BREAK_UNLOCKED';

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Status: ${state.replace('_', ' ')}`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Take Break Now',
        enabled: !isBreak,
        click: () => this.stateMachine.takeBreakNow()
      },
      {
        label: isPaused ? 'Resume Timer' : 'Pause Timer',
        click: () => {
          this.stateMachine.togglePause();
          this.updateMenu();
        }
      },
      {
        label: 'Reset Work Session',
        click: () => this.stateMachine.reset()
      },
      { type: 'separator' },
      {
        label: 'Settings...',
        click: () => this.windowManager.showSettings()
      },
      { type: 'separator' },
      {
        label: 'Quit FocusBreak',
        click: () => app.quit()
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

module.exports = TrayManager;
