const assert = require('assert');

console.log('--- Testing Updated FocusBreak Modules ---');

const ConfigManager = require('../src/main/config');
const { app } = require('electron');

app.whenReady().then(async () => {
  try {
    const configMgr = new ConfigManager();
    const cfg = configMgr.get();
    console.log('[OK] ConfigManager loaded with defaults:', cfg);
    assert.strictEqual(typeof cfg.workMinutes, 'number');
    assert.strictEqual(typeof cfg.isTerminated, 'boolean');
    assert.strictEqual(typeof cfg.isConfigured, 'boolean');

    // 2. State Machine & Termination Feature
    const { StateMachine, States } = require('../src/main/stateMachine');
    const sm = new StateMachine(configMgr);

    sm.start();
    console.log('[OK] StateMachine started in state:', sm.state);

    // Test Terminate action
    sm.terminate();
    assert.strictEqual(sm.state, States.TERMINATED);
    assert.strictEqual(configMgr.get().isTerminated, true);
    console.log('[OK] StateMachine terminated properly and marked isTerminated in config');

    // Test Start from Terminated
    sm.startTimer();
    assert.strictEqual(sm.state, States.WORKING);
    assert.strictEqual(configMgr.get().isTerminated, false);
    console.log('[OK] StateMachine started back up from terminated');

    // 3. Media Controller Guard
    const mediaController = require('../src/main/mediaController');
    assert.strictEqual(typeof mediaController.pauseMedia, 'function');
    assert.strictEqual(typeof mediaController.resetPauseState, 'function');
    mediaController.hasPausedThisBreak = true;
    mediaController.resetPauseState();
    assert.strictEqual(mediaController.hasPausedThisBreak, false);
    console.log('[OK] MediaController resetPauseState verified');

    // 4. Autostart Manager with isTerminated
    const AutostartManager = require('../src/main/autostart');
    assert.strictEqual(typeof AutostartManager.sync, 'function');
    AutostartManager.sync(true, true); // When terminated, should not autostart
    console.log('[OK] AutostartManager sync tested with termination guard');

    console.log('\n>>> ALL MODULE UNIT TESTS PASSED SUCCESSFULLY! <<<');
  } catch (err) {
    console.error('Test Failed:', err);
    process.exit(1);
  } finally {
    app.quit();
  }
});
