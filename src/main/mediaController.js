const { spawn } = require('child_process');

class MediaController {
  constructor() {
    this.isPausing = false;
  }

  /**
   * Pauses active media playback across browsers (YouTube, Netflix, etc.) and media players (Spotify, VLC).
   * Uses Windows System Media Transport Controls (GSMTC) and fallback virtual media keys.
   */
  async pauseMedia() {
    if (this.isPausing) return;
    this.isPausing = true;

    // PowerShell script that:
    // 1. Tries to pause active sessions via Windows.Media.Control
    // 2. If GSMTC pauses something, it stops. Otherwise it sends VK_MEDIA_PLAY_PAUSE (0xB3 = 179)
    const psScript = `
      $pausedCount = 0
      try {
        [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType=WindowsRuntime] | Out-Null
        $asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
        $maxWait = 15
        while (-not $asyncOp.Completed -and $maxWait -gt 0) {
          Start-Sleep -Milliseconds 50
          $maxWait--
        }
        if ($asyncOp.Completed) {
          $mgr = $asyncOp.GetResults()
          $sessions = $mgr.GetSessions()
          foreach ($session in $sessions) {
            $info = $session.GetPlaybackInfo()
            if ($info.PlaybackStatus -eq [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus]::Playing) {
              $pauseOp = $session.TryPauseAsync()
              $pausedCount++
            }
          }
        }
      } catch {
        # Fallback if WinRT assembly is not available
      }

      # If no active WinRT sessions were paused, simulate standard Windows media key
      if ($pausedCount -eq 0) {
        Add-Type -TypeDefinition @"
          using System;
          using System.Runtime.InteropServices;
          public class KeySender {
            [DllImport("user32.dll")]
            public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
            public static void Pause() {
              keybd_event(0xB3, 0, 0, UIntPtr.Zero); // VK_MEDIA_PLAY_PAUSE down
              keybd_event(0xB3, 0, 2, UIntPtr.Zero); // VK_MEDIA_PLAY_PAUSE up
            }
          }
"@ -ErrorAction SilentlyContinue
        [KeySender]::Pause()
      }
    `;

    return new Promise((resolve) => {
      const ps = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-Command', psScript
      ]);

      const timeout = setTimeout(() => {
        try { ps.kill(); } catch (e) {}
        this.isPausing = false;
        resolve(false);
      }, 3500);

      ps.on('close', () => {
        clearTimeout(timeout);
        this.isPausing = false;
        resolve(true);
      });

      ps.on('error', (err) => {
        clearTimeout(timeout);
        console.error('Error invoking media pause command:', err);
        this.isPausing = false;
        resolve(false);
      });
    });
  }
}

module.exports = new MediaController();
