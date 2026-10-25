const { app } = require('electron');

class AutostartManager {
  static sync(enabled) {
    try {
      app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: true,
        path: process.execPath,
        args: ['--hidden']
      });
      return true;
    } catch (err) {
      console.error('Failed to set login item settings:', err);
      return false;
    }
  }

  static isEnabled() {
    try {
      const settings = app.getLoginItemSettings();
      return settings.openAtLogin;
    } catch (err) {
      return false;
    }
  }
}

module.exports = AutostartManager;
