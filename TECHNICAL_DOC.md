# Focus & Break Timer: Technical Architecture & Implementation Documentation

**Document:** Technical Specification & System Design  
**Target Environment:** Windows 10 / Windows 11 (64-bit)  
**Primary Framework:** Electron + Node.js  
**Distribution Target:** Standalone Windows Executable / NSIS Installer (`.exe`)  
**Status:** Ready for Implementation

---

## 1. System Architecture Overview

The application follows Electron's multi-process architecture, decoupling background business logic, operating system hooks, and graphical user interfaces into specialized layers.

```
                      ┌──────────────────────────────────────┐
                      │          MAIN PROCESS (Node.js)      │
                      │  • State Machine & Drift-free Timer  │
                      │  • System Tray Controller            │
                      │  • Windows Media Pause Controller    │
                      │  • Windows Autostart Manager         │
                      │  • Multi-Monitor Display Manager     │
                      │  • Config Store (JSON)               │
                      └──────────────────┬───────────────────┘
                                         │
                   IPC (Inter-Process Communication Channels)
           ┌─────────────────────────────┼────────────────────────────┐
           ▼                             ▼                            ▼
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│   WARNING BANNER     │     │    BREAK OVERLAY     │     │   SETTINGS WINDOW    │
│  • Non-blocking      │     │  • Fullscreen/Kiosk  │     │  • Configuration GUI │
│  • Floating card     │     │  • Always-on-top     │     │  • Stored in JSON    │
│  • [X], Skip, Snooze │     │  • Locked Skip UI    │     │  • Tray-accessible   │
└──────────────────────┘     └──────────────────────┘     └──────────────────────┘
```

### Security & Process Isolation Standards
- **Context Isolation:** `contextIsolation: true` enabled across all renderer windows.
- **Node Integration:** `nodeIntegration: false` enforced to prevent remote code execution or DOM-level script tampering.
- **IPC Bridges:** Strictly exposed via dedicated `preload.js` scripts utilizing Electron's `contextBridge.exposeInMainWorld()`.
- **Content Security Policy (CSP):** Configured to prevent unsafe inline scripts and untrusted external resource loading.

---

## 2. Directory & Source Structure

```
D:\timer\
├── assets/
│   ├── icon.ico                  # Application icon (multi-resolution for Windows)
│   ├── icon.png                  # High-resolution PNG for UI assets
│   └── chime.mp3                 # Subtle sound cue for breaks & warnings
├── src/
│   ├── main/
│   │   ├── index.js              # Application entry point & lifecycle bootstrap
│   │   ├── stateMachine.js       # Central state machine & drift-free timer engine
│   │   ├── mediaController.js    # Windows Media API & keystroke pause dispatcher
│   │   ├── windowManager.js      # Creates & manages Overlay, Banner, & Settings windows
│   │   ├── trayManager.js        # System tray icon, tooltip, and context menu
│   │   ├── autostart.js          # Windows Registry & startup registration
│   │   └── config.js             # Configuration schema, defaults & atomic disk storage
│   ├── preload/
│   │   ├── overlayPreload.js     # IPC bridge for Fullscreen Break Overlay
│   │   ├── bannerPreload.js      # IPC bridge for Pre-Break Warning Banner
│   │   └── settingsPreload.js    # IPC bridge for Settings Dialog
│   └── renderer/
│       ├── overlay/
│       │   ├── overlay.html      # Minimalist black screen HTML
│       │   ├── overlay.css       # Fullscreen dark layout & typographic hierarchy
│       │   └── overlay.js        # Countdown presentation & lockout button logic
│       ├── banner/
│       │   ├── banner.html       # Floating warning card HTML
│       │   ├── banner.css       # Non-intrusive floating card styles
│       │   └── banner.js         # Banner actions: [X], Skip, Postpone, Break Now
│       └── settings/
│           ├── settings.html     # Settings UI
│           ├── settings.css      # Modern dark-mode controls and form inputs
│           └── settings.js       # Real-time validation and configuration updates
├── package.json                  # NPM dependencies, build metadata, electron-builder config
├── REQUIREMENTS.md               # Product Requirements Document
└── TECHNICAL_DOC.md              # Technical Specification Document
```

---

## 3. Core Subsystems

### 3.1 State Machine & Drift-Free Timer Engine (`stateMachine.js`)

#### 3.1.1 State Definitions
The timer operates as a finite-state machine (FSM) to prevent conflicting states:

```
           ┌──────────┐
           │   IDLE   │
           └────┬─────┘
                │ start()
                ▼
        ┌───────────────┐
   ┌───►│    WORKING    │◄─────────────────────────────┐
   │    └───────┬───────┘                              │
   │            │ targetTime - warningTime reached     │
   │            ▼                                      │
   │    ┌───────────────┐                              │
   │    │    WARNING    ├─── [Skip Clicked] ───────────┤
   │    └───────┬───────┘                              │
   │            │ warning time expires                 │
   │            ▼                                      │
   │    ┌───────────────┐                              │
   │    │ BREAK_LOCKED  │ (Skip button locked)         │
   │    └───────┬───────┘                              │
   │            │ lockout duration expires             │
   │            ▼                                      │
   │    ┌───────────────┐                              │
   │    │BREAK_UNLOCKED ├─── [Skip Clicked] ───────────┤
   │    └───────┬───────┘                              │
   │            │ full break finishes                  │
   └────────────┴──────────────────────────────────────┘
```

#### 3.1.2 Drift-Free Time Calculation
JavaScript's standard `setInterval(fn, 1000)` suffers from cumulative timer drift when the CPU is under load or when the system enters low-power states.

**Solution:**
- The engine calculates target timestamps:
  $$\text{targetTimestamp} = \text{Date.now()} + (\text{durationSeconds} \times 1000)$$
- A 500ms heartbeat interval calculates remaining time as:
  $$\text{remainingSeconds} = \max\left(0, \left\lceil \frac{\text{targetTimestamp} - \text{Date.now()}}{1000} \right\rceil\right)$$
- If the system suspends (sleep/hibernate), Electron's `powerMonitor` detects the resume event and recalculates the schedule cleanly without UI freezes.

---

### 3.2 Pre-Break Warning Banner Subsystem (`banner/`)

1. **Window Specifications:**
   - `width`: 380px, `height`: 110px.
   - `frame`: `false`, `transparent`: `true`, `resizable`: `false`.
   - `alwaysOnTop`: `true` with level `'floating'`.
   - `skipTaskbar`: `true`.
   - `focusable`: `false` (does not steal keyboard focus from typing, gaming, or calls).
2. **Dynamic Screen Placement:**
   - Positioned in the bottom-right corner of the primary display, safely above the Windows Taskbar:
     $$\text{x} = \text{display.workArea.x} + \text{display.workArea.width} - \text{windowWidth} - 20$$
     $$\text{y} = \text{display.workArea.y} + \text{display.workArea.height} - \text{windowHeight} - 20$$
3. **Interactive Actions:**
   - **`[X]` Close Button:** Sends `banner:close` IPC. Main process calls `bannerWindow.hide()`. **Crucial:** State machine timer continues without interruption.
   - **`[Skip]` Button:** Sends `banner:skip` IPC. Main process closes banner, resets state to `WORKING`, and starts a fresh work cycle.
   - **`[Postpone 5m]` Button:** Sends `banner:postpone` IPC. Adds 5 minutes (300 seconds) to the current work target timestamp, hides the banner, and schedules re-alert.
   - **`[Take Break Now]` Button:** Sends `banner:break-now` IPC. Main process closes banner and immediately transitions to the break screen.

---

### 3.3 Fullscreen Break Overlay Subsystem (`overlay/`)

1. **Multi-Monitor Display Coverage:**
   - Uses `screen.getAllDisplays()` to enumerate all connected screens.
   - Creates a dedicated frameless, black `BrowserWindow` on each display:
     ```javascript
     displays.forEach((display) => {
       const win = new BrowserWindow({
         x: display.bounds.x,
         y: display.bounds.y,
         width: display.bounds.width,
         height: display.bounds.height,
         frame: false,
         fullscreen: true,
         alwaysOnTop: true,
         kiosk: true,
         backgroundColor: '#000000',
         skipTaskbar: true,
         webPreferences: {
           preload: path.join(__dirname, '../preload/overlayPreload.js')
         }
       });
       win.setAlwaysOnTop(true, 'screen-saver');
     });
     ```
   - Primary display runs the active countdown and locked skip button. Secondary displays render an elegant, soothing dark screen with a synchronized clock.
2. **Lockout Button Mechanism:**
   - State machine maintains `lockoutRemainingSeconds`.
   - While `lockoutRemainingSeconds > 0`:
     - Skip button has HTML attribute `disabled`.
     - Button label updates dynamically: `🔒 Skip locked (Available in 42s)`.
     - Button visual style is semi-transparent (`opacity: 0.4`, `cursor: not-allowed`).
   - When `lockoutRemainingSeconds == 0`:
     - Button attribute `disabled` is removed.
     - Button label transforms to: `Skip Break & Resume Work`.
     - Button lights up with an accent color and clickable hover effects.
3. **Emergency Bypass Shortcut:**
   - Registered using Electron's `globalShortcut`:
     - Shortcut: `CommandOrControl+Alt+Shift+Escape`.
     - Immediately dismisses all overlays and resets the timer to `WORKING`.

---

### 3.4 Windows Media Controller Subsystem (`mediaController.js`)

Pausing browser playback (YouTube, Netflix, Twitch) and desktop media players (Spotify, VLC) without third-party dependencies is achieved through a dual-strategy implementation:

#### Strategy A: Windows System Media Transport Controls (GSMTC) via PowerShell
Windows 10/11 includes the native `Windows.Media.Control` WinRT API. We invoke a non-blocking background PowerShell command:
```powershell
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media,ContentType=WindowsRuntime] | Out-Null
$asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
$manager = $asyncOp.GetResults()
$sessions = $manager.GetSessions()
foreach ($s in $sessions) {
    $info = $s.GetPlaybackInfo()
    if ($info.PlaybackStatus -eq 'Playing') {
        $s.TryPauseAsync() | Out-Null
    }
}
```

#### Strategy B: Virtual Key Fallback (`VK_MEDIA_PLAY_PAUSE`)
As an ultra-fast secondary fallback, the application can simulate the standard hardware media key (`0xCD` / `VK_MEDIA_PLAY_PAUSE`) using a single native Windows user32 `keybd_event` call via PowerShell:
```powershell
$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys([char]179)
```
- Both methods run asynchronously without freezing the Electron main process event loop.

---

### 3.5 Windows Autostart Subsystem (`autostart.js`)

Registers the application into the Windows startup registry without needing third-party libraries:

```javascript
const { app } = require('electron');

function configureAutostart(enable) {
  app.setLoginItemSettings({
    openAtLogin: enable,
    openAsHidden: true,
    path: process.execPath,
    args: ['--hidden']
  });
}
```
- When the computer reboots, the app starts with the `--hidden` argument, meaning it initiates directly in the Windows System Tray without showing any setup windows.

---

### 3.6 Configuration Store (`config.js`)

Configuration is stored in `config.json` inside the standard Windows application data directory (`%APPDATA%\focus-break-timer\config.json`).

```json
{
  "workMinutes": 30,
  "warningSeconds": 60,
  "breakMinutes": 5,
  "skipLockoutSeconds": 60,
  "pauseMedia": true,
  "autoStart": true,
  "multiMonitor": true,
  "chimeSound": true
}
```
- Uses atomic file writing (`fs.writeFileSync` to a temp file, followed by `fs.renameSync`) to eliminate corruption risks during unexpected power cuts.

---

### 3.7 Inter-Process Communication (IPC) Protocol

| Channel | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `timer:tick` | Main $\rightarrow$ Renderers | `{ state, remaining, lockoutRemaining }` | Broadcasts real-time timer ticks |
| `timer:state-changed` | Main $\rightarrow$ Renderers | `{ previousState, newState }` | Fired on state transitions |
| `banner:close` | Banner $\rightarrow$ Main | *None* | Hides warning banner (timer keeps running) |
| `banner:skip` | Banner $\rightarrow$ Main | *None* | Skips upcoming break & restarts work timer |
| `banner:postpone`| Banner $\rightarrow$ Main | `{ minutes: 5 }` | Extends current work timer by 5 minutes |
| `banner:break-now`| Banner $\rightarrow$ Main | *None* | Skips remaining warning and starts break immediately |
| `overlay:skip` | Overlay $\rightarrow$ Main | *None* | Triggered when user clicks unlocked skip button |
| `config:get` | Settings $\rightarrow$ Main | *None* | Retrieves active configuration |
| `config:save` | Settings $\rightarrow$ Main | `Partial<Config>` | Validates, saves to disk, & reloads timers |

---

## 4. Packaging & Standalone Distribution Pipeline

To fulfill the requirement that **end-users need zero technical tools (no Node, no Python)**:

### 4.1 Bundling with `electron-builder`
The project uses `electron-builder` to package the complete Node.js runtime and Chromium engine into a single executable:

```json
"build": {
  "appId": "com.focusbreak.timer",
  "productName": "FocusBreak",
  "win": {
    "target": ["nsis", "portable"],
    "icon": "assets/icon.ico"
  },
  "nsis": {
    "oneClick": true,
    "perMachine": false,
    "allowToChangeInstallationDirectory": false,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "FocusBreak"
  }
}
```

### 4.2 Resulting Artifacts
1. **`dist/FocusBreak Setup 1.0.0.exe`**:
   - One-click installer for consumers.
   - Installs to `%LOCALAPPDATA%\Programs\FocusBreak`.
   - Creates Start Menu & Desktop shortcuts.
   - Supports clean uninstallation via Windows Control Panel / Settings.
2. **`dist/FocusBreak 1.0.0.exe` (Portable)**:
   - Standalone executable requiring no installation.

---

## 5. Non-Functional & Reliability Engineering

1. **System Resource Usage:**
   - Idling in tray: `< 0.1% CPU` and `< 40MB RAM`.
   - Active overlay rendering: Uses hardware-accelerated CSS transforms (`translate3d`, `opacity`) to guarantee 60 FPS without high CPU usage.
2. **Fault Tolerance (Crash Recovery):**
   - Uncaught exception handlers (`process.on('uncaughtException')`) ensure that if an overlay crashes, the screen is automatically released so the user is never locked out of their PC.
3. **Multi-DPI / Mixed Monitor Support:**
   - Coordinates are calculated based on Windows physical and virtual display bounds to prevent black screen misalignment across mixed 4K and 1080p monitors.
