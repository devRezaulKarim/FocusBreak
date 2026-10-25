# Windows Focus & Break Timer Application
## Product Requirements Document (PRD) & Specification

**Document Version:** 1.3.0  
**Status:** Approved with Modifications  
**Target Audience:** Non-technical everyday users (students, professionals, social media & media consumers)  
**Target Platform:** Windows 10 / Windows 11 (64-bit)  
**Packaging Target:** Standalone Windows Installer (`.exe`) & Portable Executable (Zero Dependencies Required)

---

## 1. Executive Summary & Objective

The objective is to create a polished, ready-to-use Windows desktop application for everyday non-technical users. 

**Zero Dependency Guarantee:**  
End users **do not need Node.js, Python, or any developer tools** installed on their computer. The application is distributed as a standard, self-contained Windows installer (e.g., `FocusBreakSetup.exe`) that installs with one click, creates desktop and Start Menu shortcuts, runs silently in the background from system boot, and is completely managed through an intuitive graphical user interface (GUI).

---

## 2. End-User Installation & Experience

### 2.1 Installation Experience for Everyday Users
- **Standard Windows Installer (`.exe`):**
  - Download and double-click the setup file (just like Chrome, Spotify, or Discord).
  - Automatically installs into `AppData\Local\Programs` without requiring administrator privileges or technical configuration.
  - Automatically adds a desktop shortcut and a Start Menu item.
  - Includes a standard Uninstaller accessible from Windows **Settings > Apps > Installed apps**.
- **Portable Version (Optional alternative):**
  - A single standalone `.exe` that runs immediately from a USB flash drive or any folder without running an installer.

### 2.2 First Run & Windows Startup
- Automatically launches immediately after installation.
- Seamlessly registers to start on Windows boot (enabled by default, can be toggled off in Settings).
- Automatically starts the work timer without requiring any terminal, commands, or manual setup.

---

## 3. Core Functional Requirements

### 3.1 Work & Break Cycle Engine
1. **Work Duration:**
   - Default: `30 minutes` (adjustable via GUI: 5 min to 180 min).
   - Runs in the background with zero desktop clutter while the user browses the web, plays games, or works.
2. **Break Duration:**
   - Default: `5 minutes` (adjustable via GUI: 1 min to 60 min).
   - Triggers automatically after the work timer and pre-break warning period conclude.
3. **Cycle Transition:**
   - Work session runs $\rightarrow$ Pre-break warning appears $\rightarrow$ If not skipped: Media pauses & Fullscreen black break screen activates $\rightarrow$ Break countdown finishes (or user skips after lockout) $\rightarrow$ Next work session starts.

---

### 3.2 Pre-Break Warning & Call/Task Protection (New)
To ensure the app never disrupts an important meeting, video call, presentation, or urgent task:
1. **Configurable Warning Lead Time:**
   - Default: `1 minute` before the break (adjustable: 30 sec, 1 min, 2 min, 3 min, or Disabled).
   - Example: For a 30-minute work session with a 1-minute warning, the warning card appears at minute 29:00.
2. **Visual Presentation:**
   - A non-intrusive, floating notification card / banner (docked to bottom-right or top-center of the screen).
   - Does **not** block user clicks or freeze active applications.
   - Shows live countdown: `"Break starts in 59s..."`.
3. **Interactive Actions on the Warning Card:**
   - **"Close (X)" Button:** Immediately dismisses and hides the banner so it does not block the user's screen view. **Crucially, closing the banner does NOT skip or reset the timer**; the timer quietly continues running in the background and the full break will still activate when the remaining warning time finishes.
   - **"Skip Break" Button:** Immediately skips the upcoming break, dismisses the warning, and restarts the work session cleanly.
   - **"Postpone (5 min)" Button:** Delays the break by 5 minutes so you can finish your ongoing call or urgent task.
   - **"Take Break Now" Button:** Instantly jumps into the full black break screen without waiting for the remaining warning time.
4. **Automatic Escalation:**
   - If the user does not click "Skip" or "Postpone" during the warning window, the warning smoothly transitions into the full black screen overlay when the countdown reaches `00:00`.

---

### 3.3 Break Screen (Black Overlay)
1. **Visual Style:**
   - Pure black, distraction-free screen (`#000000`).
   - Clean, modern, easy-to-read countdown clock (`05:00` $\rightarrow$ `00:00`).
   - Multi-monitor support: Automatically covers all attached displays/monitors so the user cannot simply move their mouse to another screen to avoid the break.
2. **Window Properties:**
   - Fullscreen and Always on Top (`HWND_TOPMOST`).
   - Borderless without window bars or minimize buttons.
3. **Emergency Exit:**
   - An intuitive emergency escape option (e.g. holding `Esc` for 3 seconds or pressing `Ctrl + Shift + Alt + Esc`) so users are never trapped in case of an urgent call.

---

### 3.4 Skip Button with Lockout Protection
1. **Design & Placement:**
   - Centered directly beneath the countdown timer on the black break screen.
2. **Lockout Behavior:**
   - Configurable minimum mandatory break time (Default: `1 minute`).
   - **During Lockout:**
     - The Skip button is disabled and clearly displays the countdown:  
       `"🔒 Skip locked (Available in 48s)"`
   - **After Lockout:**
     - The button transforms into an active, clickable button:  
       `"Skip Break & Resume Work"`
     - Clicking it immediately closes the black screen and begins the next work timer.

---

### 3.5 Automatic Media Pausing (YouTube, Browsers & Media Players)
1. **Automatic Pause Action:**
   - The instant the black break screen activates, the application automatically pauses all active sound/video.
   - Works across:
     - All popular web browsers (Google Chrome, Microsoft Edge, Mozilla Firefox, Brave, Opera) playing YouTube, Netflix, podcasts, etc.
     - Standalone media players (Spotify, Apple Music, VLC, Windows Media Player).
2. **Implementation:**
   - Uses the built-in Windows Media Control API (`GlobalSystemMediaTransportControlsSessionManager`) and hardware media key simulation (`VK_MEDIA_PLAY_PAUSE`), running natively on any Windows 10 or 11 PC without external software.
3. **Behavior After Break:**
   - Configurable option in settings: Leave media paused (default) or automatically resume playback.

---

### 3.6 System Tray & User Controls (GUI)
- The app resides quietly in the Windows Taskbar Notification Area (System Tray next to the clock).
- **Hover Tooltip:** Shows current status (e.g., `Focus Timer: 18m remaining`).
- **Right-Click Menu:**
  - ⚙️ **Settings** (Opens the Settings window)
  - ☕ **Take Break Now** (Manually trigger break early)
  - ⏸️ **Pause / Resume Timer**
  - 🔄 **Restart Session**
  - ❌ **Quit Application**

---

### 3.7 Settings Window (Simple & Non-Technical)
A clean, attractive dialog window with simple sliders, number boxes, and toggle switches:

| Setting | Default Value | Description |
| :--- | :--- | :--- |
| **Work Session Time** | `30 minutes` | How long to work before a break |
| **Pre-Break Warning Time** | `1 minute` | Early warning alert before screen locks (with Skip button) |
| **Break Session Time** | `5 minutes` | How long the black screen lasts |
| **Skip Lockout Time** | `1 minute` | How long you must wait before skipping on the black screen |
| **Pause Media on Break** | `Enabled` | Automatically pause YouTube, Spotify, etc. |
| **Start with Windows** | `Enabled` | Automatically launch when PC powers on |
| **Cover All Monitors** | `Enabled` | Blank all screens or only primary screen |
| **Audio Notification Sound**| `Enabled` | Play a gentle audio chime when warning and break starts |

---

## 4. Lifecycle Flow Diagram

```
         [ Windows Starts / App Launches ]
                         │
                         ▼
             [ Starts in System Tray ]
                         │
                         ▼
        ┌───────────────────────────────────┐
        │        WORK SESSION ACTIVE        │ ◄───────────────────┐
        │      (e.g., 29 min of 30 min)     │                     │
        └─────────────────┬─────────────────┘                     │
                          │ (Warning time reached)                │
                          ▼                                       │
        ┌───────────────────────────────────┐                     │
        │     PRE-BREAK WARNING BANNER      │                     │
        │    • "Break starts in 60s..."     │                     │
        │    • [Skip Break] [Postpone 5m]   │── (If user skips) ──┤
        └─────────────────┬─────────────────┘                     │
                          │ (Timer hits 00:00 without skipping)   │
                          ▼                                       │
        ┌───────────────────────────────────┐                     │
        │      1. Pause Media (YouTube)     │                     │
        │      2. Launch Black Overlay      │                     │
        └─────────────────┬─────────────────┘                     │
                          │                                       │
                          ▼                                       │
        ┌───────────────────────────────────┐                     │
        │       BREAK OVERLAY ACTIVE        │                     │
        │     • Countdown: 05:00            │                     │
        │     • Skip Button: LOCKED (1 min) │                     │
        └─────────────────┬─────────────────┘                     │
                          │                                       │
                          ▼                                       │
                [ 1 minute elapses ]                              │
                          │                                       │
                          ▼                                       │
        ┌───────────────────────────────────┐                     │
        │     • Skip Button: UNLOCKED       │                     │
        │     • User can click to skip      │── (If clicked) ─────┤
        └─────────────────┬─────────────────┘                     │
                          │ (Break completes full 5 mins)         │
                          ▼                                       │
        ┌───────────────────────────────────┐                     │
        │     1. Dismiss Black Screen       │                     │
        │     2. Restart Next Work Timer    │─────────────────────┘
        └───────────────────────────────────┘
```

---

## 5. Technical Architecture & Packaging Pipeline

```
  [ Development Environment (Node.js) ]
                   │
                   ▼ (Compiled & Bundled via electron-builder)
  ┌─────────────────────────────────────────────────────────┐
  │         STANDALONE WINDOWS INSTALLER (.exe)             │
  │    (Includes embedded runtime & all required code)      │
  └────────────────────────────┬────────────────────────────┘
                               │
            Distributed to non-technical users
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────┐
  │                END-USER WINDOWS PC                      │
  │  • NO Node.js required                                  │
  │  • NO Python required                                   │
  │  • NO Command line required                             │
  │  • Double-click to install & runs like any Windows app  │
  └─────────────────────────────────────────────────────────┘
```

### Build & Bundling Details:
- **Framework:** Electron (Node.js engine embedded inside the `.exe`).
- **Packaging Engine:** `electron-builder`.
- **Output Artifacts:**
  1. `FocusBreak-Setup-1.0.0.exe` (Standard Windows NSIS Installer).
  2. `FocusBreak-Portable-1.0.0.exe` (Portable zero-install `.exe`).
- **OS Compatibility:** Windows 10 (all updates) and Windows 11 (64-bit).

---

## 6. Verification & Testing Checklist

- [ ] Installs cleanly from the `.exe` installer on a clean Windows machine without developer tools.
- [ ] Automatically launches and pins to system tray.
- [ ] Timer runs quietly in the background.
- [ ] Non-intrusive warning banner appears 1 minute before break with "Close (X)", "Skip", "Postpone 5m", and "Take Break Now".
- [ ] Clicking "Close (X)" hides the banner while the background timer continues smoothly toward the break.
- [ ] Clicking "Skip" on the warning banner safely resets work timer without locking the screen.
- [ ] Fullscreen black overlay activates when warning timer hits zero.
- [ ] YouTube and media playback pause instantly upon break activation.
- [ ] Skip button on black screen is locked with live countdown for the configured lockout duration (e.g., 1 min).
- [ ] Skip button unlocks and properly dismisses overlay when clicked.
- [ ] Settings can be adjusted easily via GUI and persist across PC restarts.
- [ ] Autostarts when Windows reboots.
