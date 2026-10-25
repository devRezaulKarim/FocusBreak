const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULT_CONFIG = {
  workMinutes: 30,
  warningSeconds: 60,
  breakMinutes: 5,
  skipLockoutSeconds: 60,
  pauseMedia: true,
  autoStart: true,
  multiMonitor: true,
  chimeSound: true
};

class ConfigManager {
  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'config.json');
    this.config = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(data);
        return this.validate({ ...DEFAULT_CONFIG, ...parsed });
      }
    } catch (err) {
      console.error('Failed to load config, falling back to defaults:', err);
    }
    return { ...DEFAULT_CONFIG };
  }

  validate(cfg) {
    const validated = { ...DEFAULT_CONFIG };

    if (typeof cfg.workMinutes === 'number' && cfg.workMinutes >= 1 && cfg.workMinutes <= 480) {
      validated.workMinutes = Math.floor(cfg.workMinutes);
    }
    if (typeof cfg.warningSeconds === 'number' && cfg.warningSeconds >= 0 && cfg.warningSeconds <= 300) {
      validated.warningSeconds = Math.floor(cfg.warningSeconds);
    }
    if (typeof cfg.breakMinutes === 'number' && cfg.breakMinutes >= 1 && cfg.breakMinutes <= 120) {
      validated.breakMinutes = Math.floor(cfg.breakMinutes);
    }
    if (typeof cfg.skipLockoutSeconds === 'number' && cfg.skipLockoutSeconds >= 0) {
      // Ensure skip lockout does not exceed the total break time in seconds
      const maxLockout = validated.breakMinutes * 60;
      validated.skipLockoutSeconds = Math.min(Math.floor(cfg.skipLockoutSeconds), maxLockout);
    }
    if (typeof cfg.pauseMedia === 'boolean') {
      validated.pauseMedia = cfg.pauseMedia;
    }
    if (typeof cfg.autoStart === 'boolean') {
      validated.autoStart = cfg.autoStart;
    }
    if (typeof cfg.multiMonitor === 'boolean') {
      validated.multiMonitor = cfg.multiMonitor;
    }
    if (typeof cfg.chimeSound === 'boolean') {
      validated.chimeSound = cfg.chimeSound;
    }

    return validated;
  }

  save(newConfig) {
    try {
      this.config = this.validate({ ...this.config, ...newConfig });
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${this.configPath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.config, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.configPath);
      return { success: true, config: this.config };
    } catch (err) {
      console.error('Failed to save config:', err);
      return { success: false, error: err.message };
    }
  }

  get() {
    return { ...this.config };
  }
}

module.exports = ConfigManager;
