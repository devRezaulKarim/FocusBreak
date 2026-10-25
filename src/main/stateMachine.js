const EventEmitter = require('events');

const States = {
  IDLE: 'IDLE',
  WORKING: 'WORKING',
  WARNING: 'WARNING',
  BREAK_LOCKED: 'BREAK_LOCKED',
  BREAK_UNLOCKED: 'BREAK_UNLOCKED',
  PAUSED: 'PAUSED'
};

class StateMachine extends EventEmitter {
  constructor(configManager) {
    super();
    this.configManager = configManager;
    this.state = States.IDLE;
    this.previousState = States.IDLE;

    // Timing markers (timestamps in ms)
    this.targetEndTime = 0;
    this.warningStartTime = 0;
    this.lockoutEndTime = 0;

    // Saved state for pause/resume
    this.savedRemainingMs = 0;
    this.savedLockoutMs = 0;

    // Heartbeat ticker
    this.timerInterval = null;
  }

  getConfig() {
    return this.configManager.get();
  }

  start() {
    this.startWork();
    this._startHeartbeat();
  }

  _startHeartbeat() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => this._tick(), 500);
  }

  _stopHeartbeat() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  _transition(newState, payload = {}) {
    const oldState = this.state;
    this.state = newState;
    this.emit('state-changed', {
      previousState: oldState,
      currentState: newState,
      payload
    });
  }

  startWork() {
    const config = this.getConfig();
    const workDurationMs = config.workMinutes * 60 * 1000;
    const warningMs = config.warningSeconds * 1000;

    const now = Date.now();
    this.targetEndTime = now + workDurationMs;
    // Warning triggers warningSeconds before work timer ends
    this.warningStartTime = warningMs > 0 ? (this.targetEndTime - warningMs) : this.targetEndTime;

    this._transition(States.WORKING, {
      totalDurationSeconds: config.workMinutes * 60
    });
  }

  startWarning() {
    const remainingSeconds = Math.max(0, Math.ceil((this.targetEndTime - Date.now()) / 1000));
    this._transition(States.WARNING, {
      remainingSeconds
    });
  }

  startBreak() {
    const config = this.getConfig();
    const breakDurationMs = config.breakMinutes * 60 * 1000;
    const lockoutMs = config.skipLockoutSeconds * 1000;

    const now = Date.now();
    this.targetEndTime = now + breakDurationMs;
    this.lockoutEndTime = now + lockoutMs;

    if (config.skipLockoutSeconds > 0) {
      this._transition(States.BREAK_LOCKED, {
        totalBreakSeconds: config.breakMinutes * 60,
        lockoutSeconds: config.skipLockoutSeconds
      });
    } else {
      this._transition(States.BREAK_UNLOCKED, {
        totalBreakSeconds: config.breakMinutes * 60,
        lockoutSeconds: 0
      });
    }
  }

  skipWarning() {
    // User clicked "Skip Break" on the pre-break warning banner
    this.startWork();
  }

  postpone(minutes = 5) {
    // User clicked "Postpone (5m)" on the pre-break warning banner
    const addMs = minutes * 60 * 1000;
    const config = this.getConfig();
    const warningMs = config.warningSeconds * 1000;

    const now = Date.now();
    this.targetEndTime = now + addMs;
    this.warningStartTime = warningMs > 0 ? (this.targetEndTime - warningMs) : this.targetEndTime;

    this._transition(States.WORKING, {
      postponed: true,
      totalDurationSeconds: minutes * 60
    });
  }

  takeBreakNow() {
    this.startBreak();
  }

  skipBreak() {
    if (this.state === States.BREAK_UNLOCKED) {
      this.startWork();
    }
  }

  emergencyDismiss() {
    // Bypass shortcut invoked
    this.startWork();
  }

  togglePause() {
    if (this.state === States.PAUSED) {
      // Resume
      const now = Date.now();
      this.targetEndTime = now + this.savedRemainingMs;
      if (this.savedLockoutMs > 0) {
        this.lockoutEndTime = now + this.savedLockoutMs;
      }
      const resumeTo = this.previousState || States.WORKING;
      this._transition(resumeTo);
    } else {
      // Pause
      this.previousState = this.state;
      const now = Date.now();
      this.savedRemainingMs = Math.max(0, this.targetEndTime - now);
      this.savedLockoutMs = Math.max(0, this.lockoutEndTime - now);
      this._transition(States.PAUSED);
    }
  }

  reset() {
    this.startWork();
  }

  _tick() {
    if (this.state === States.IDLE || this.state === States.PAUSED) {
      return;
    }

    const now = Date.now();

    switch (this.state) {
      case States.WORKING: {
        const remainingMs = this.targetEndTime - now;
        const config = this.getConfig();

        // Check if it's time for the warning banner
        if (config.warningSeconds > 0 && now >= this.warningStartTime) {
          this.startWarning();
          return;
        }

        // If warning is disabled, check if work time finished directly
        if (remainingMs <= 0) {
          this.startBreak();
          return;
        }

        const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
        this.emit('tick', {
          state: this.state,
          remainingSeconds,
          lockoutRemainingSeconds: 0
        });
        break;
      }

      case States.WARNING: {
        const remainingMs = this.targetEndTime - now;
        if (remainingMs <= 0) {
          this.startBreak();
          return;
        }

        const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
        this.emit('tick', {
          state: this.state,
          remainingSeconds,
          lockoutRemainingSeconds: 0
        });
        break;
      }

      case States.BREAK_LOCKED: {
        const remainingBreakMs = this.targetEndTime - now;
        const remainingLockoutMs = this.lockoutEndTime - now;

        if (remainingBreakMs <= 0) {
          // Full break finished
          this.startWork();
          return;
        }

        if (remainingLockoutMs <= 0) {
          // Lockout duration finished, unlock skip button
          this._transition(States.BREAK_UNLOCKED);
          return;
        }

        const remainingSeconds = Math.max(0, Math.ceil(remainingBreakMs / 1000));
        const lockoutRemainingSeconds = Math.max(0, Math.ceil(remainingLockoutMs / 1000));

        this.emit('tick', {
          state: this.state,
          remainingSeconds,
          lockoutRemainingSeconds
        });
        break;
      }

      case States.BREAK_UNLOCKED: {
        const remainingBreakMs = this.targetEndTime - now;
        if (remainingBreakMs <= 0) {
          this.startWork();
          return;
        }

        const remainingSeconds = Math.max(0, Math.ceil(remainingBreakMs / 1000));
        this.emit('tick', {
          state: this.state,
          remainingSeconds,
          lockoutRemainingSeconds: 0
        });
        break;
      }
    }
  }

  getStatus() {
    const now = Date.now();
    const remainingMs = Math.max(0, this.targetEndTime - now);
    const lockoutRemainingMs = Math.max(0, this.lockoutEndTime - now);

    return {
      state: this.state,
      remainingSeconds: Math.ceil(remainingMs / 1000),
      lockoutRemainingSeconds: Math.ceil(lockoutRemainingMs / 1000)
    };
  }
}

module.exports = { StateMachine, States };
