const assert = require('assert');

console.log('--- Testing FocusBreak Modules ---');

// 1. Config Manager
const ConfigManager = require('../src/main/config');
// Mock app.getPath for isolated testing if needed
const { app } = require('electron');

app.whenReady().then(async () => {
  try {
    const configMgr = new ConfigManager();
    const cfg = configMgr.get();
    console.log('[OK] ConfigManager loaded with defaults:', cfg);
    assert.strictEqual(typeof cfg.workMinutes, 'number');
    assert.strictEqual(typeof cfg.warningSeconds, 'number');
    assert.strictEqual(typeof cfg.breakMinutes, 'number');
    assert.strictEqual(typeof cfg.skipLockoutSeconds, 'number');

    // Test validation
    const saved = configMgr.save({ workMinutes: 45, warningSeconds: 30 });
    assert.strictEqual(saved.success, true);
    assert.strictEqual(configMgr.get().workMinutes, 45);
    assert.strictEqual(configMgr.get().warningSeconds, 30);
    // Restore default
    configMgr.save({ workMinutes: 30, warningSeconds: 60 });
    console.log('[OK] ConfigManager validation and saving passed');

    // 2. State Machine
    const { StateMachine, States } = require('../src/main/stateMachine');
    const sm = new StateMachine(configMgr);
    assert.strictEqual(sm.state, States.IDLE);

    sm.start();
    assert.strictEqual(sm.state, States.WORKING);
    console.log('[OK] StateMachine initialized to WORKING state');

    // Test warning transition
    sm.startWarning();
    assert.strictEqual(sm.state, States.WARNING);
    console.log('[OK] StateMachine transitioned to WARNING');

    // Test postpone
    sm.postpone(5);
    assert.strictEqual(sm.state, States.WORKING);
    console.log('[OK] StateMachine postpone works and returns to WORKING');

    // Test break start
    sm.startBreak();
    assert.strictEqual(sm.state, States.BREAK_LOCKED);
    console.log('[OK] StateMachine break start works with BREAK_LOCKED');

    // Test status method
    const status = sm.getStatus();
    assert.strictEqual(status.state, States.BREAK_LOCKED);
    assert.ok(status.remainingSeconds > 0);
    assert.ok(status.lockoutRemainingSeconds > 0);
    console.log('[OK] StateMachine getStatus:', status);

    // Test pause/resume
    sm.togglePause();
    assert.strictEqual(sm.state, States.PAUSED);
    sm.togglePause();
    assert.strictEqual(sm.state, States.BREAK_LOCKED);
    console.log('[OK] StateMachine pause and resume passed');

    // 3. Media Controller
    const mediaController = require('../src/main/mediaController');
    assert.strictEqual(typeof mediaController.pauseMedia, 'function');
    console.log('[OK] MediaController loaded with pauseMedia function');

    console.log('\n>>> ALL MODULE UNIT TESTS PASSED SUCCESSFULLY! <<<');
  } catch (err) {
    console.error('Test Failed:', err);
    process.exit(1);
  } finally {
    app.quit();
  }
});
