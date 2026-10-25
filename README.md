# FocusBreak — Windows Focus & Break Timer

An intelligent, non-intrusive break enforcement application for Windows 10 and Windows 11 designed to improve productivity, eye comfort, and ergonomic health.

---

## 📥 Download & Installation (For Everyday Users)

You **do not need Node.js or any developer tools** to use FocusBreak.

1. Go to the latest release on the [**GitHub Releases Page**](https://github.com/devRezaulKarim/FocusBreak/releases/latest).
2. Under **Assets**, download:
   - **`FocusBreak Setup 1.0.0.exe`** (Recommended Windows Installer with Start Menu and Desktop shortcuts)
   - Or **`FocusBreak 1.0.0.exe`** (Portable zero-install standalone version)
3. Run the installer, allow Windows Administrator permission, and the FocusBreak Control Center will launch immediately!

---

## ✨ Features

- **Drift-Free Work & Break Cycle:**
  - Configurable focus sessions (default: 30 minutes).
  - Configurable break intervals (default: 5 minutes).
  - Automatically loops through work and rest periods.

- **Pre-Break Warning Banner (Meeting & Call Protection):**
  - Appears 1 minute before your break with a subtle countdown.
  - **`[X]` Close Button:** Dismisses the banner from your view while the timer continues smoothly in the background.
  - **`[Skip Break]` Button:** Skips the upcoming break entirely so ongoing calls or urgent tasks are never interrupted.
  - **`[Postpone 5m]` Button:** Gives you an extra 5 minutes to finish what you are doing.
  - **`[Break Now]` Button:** Starts the break immediately if you are ready.

- **Distraction-Free Black Screen Overlay:**
  - Fullscreen pure black overlay covering all connected monitors.
  - Large real-time countdown clock.

- **Lockout Protected Skip Button:**
  - Prevents impulsive skipping while still maintaining user control.
  - Locked for a mandatory minimum break time (default: 1 minute).
  - Displays dynamic countdown: `🔒 Skip locked (Available in 48s)`.
  - Once lockout ends, transforms into `Skip Break & Resume Work`.

- **Automatic Media Pausing:**
  - Pauses active sound & video playback when the break starts:
    - Web browsers (YouTube, Netflix, Twitch in Chrome, Edge, Firefox, Brave, etc.)
    - Media players (Spotify, VLC, Apple Music, Windows Media Player)

- **Windows Autostart & System Tray Integration:**
  - Starts automatically when Windows boots.
  - Lives quietly in the Taskbar System Tray near the clock with real-time status tooltips.
  - Right-click tray menu for quick actions: *Take Break Now*, *Pause/Resume*, *Reset*, and *Settings*.

- **Zero Technical Dependencies for End Users:**
  - Non-technical users do **not** need Node.js, Python, or command-line tools.
  - Distributed as a standard Windows installer (`.exe`) with desktop and Start Menu shortcuts.

- **Emergency Bypass:**
  - Press <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>Esc</kbd> anytime to immediately dismiss overlays.

---

## 🚀 Development & Building

### Prerequisites (For Developers Building from Source)
- [Node.js](https://nodejs.org/) (v18+)

### Running in Development
```bash
# Clone or navigate to the folder
cd D:\timer

# Install dependencies (already installed)
npm install

# Start the application
npm start
```

### Packaging Standalone Windows Installer
```bash
# Pack standalone directory
npm run pack

# Build standard Windows Setup installer (.exe) and portable executable
npm run dist
```
The output files will be created in the `dist/` directory:
- `dist/FocusBreak Setup 1.0.0.exe` (Single-click installer for any Windows PC)
- `dist/win-unpacked/FocusBreak.exe` (Standalone unpacked executable)

---

## ⚙️ Configuration & Settings

Access Settings by double-clicking the tray icon or right-clicking and selecting **Settings...**:

| Option | Default | Description |
| :--- | :--- | :--- |
| **Work Session** | `30 min` | Time working before a break |
| **Pre-Break Warning** | `60 sec` | Warning banner duration with Skip & Postpone |
| **Break Duration** | `5 min` | Full black screen duration |
| **Skip Lockout Delay** | `60 sec` | Mandatory wait before Skip button unlocks |
| **Auto-Pause Media** | `Enabled` | Pause YouTube & music players on break |
| **Start with Windows** | `Enabled` | Launch silently on system startup |
| **Cover All Monitors** | `Enabled` | Blank all connected displays |
| **Chime Sound** | `Enabled` | Gentle audio prompt on warning & break |

Settings are automatically saved to `%APPDATA%\focus-break-timer\config.json`.
