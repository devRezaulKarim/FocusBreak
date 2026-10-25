const { spawn } = require('child_process');

class MediaController {
  constructor() {
    this.isPausing = false;
    this.hasPausedThisBreak = false;
  }

  /**
   * Resets the pause guard when returning to work mode.
   */
  resetPauseState() {
    this.hasPausedThisBreak = false;
  }

  /**
   * Pauses active media playback across browsers (YouTube, Netflix, etc.) and media players (Spotify, VLC).
   * Uses Windows System Media Transport Controls (GSMTC) via AsTask to pause playing sessions idempotently.
   */
  async pauseMedia() {
    if (this.isPausing || this.hasPausedThisBreak) return;
    this.isPausing = true;
    this.hasPausedThisBreak = true;

    // Robust PowerShell script with WinRT AsTask invocation:
    // Only pauses sessions whose playback status is currently 'Playing' (no toggle bug).
    const psScript = `
      Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction SilentlyContinue
      [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType=WindowsRuntime] | Out-Null

      $pausedCount = 0
      try {
        $asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
          $_.Name -eq 'AsTask' -and 
          $_.GetParameters().Count -eq 1 -and 
          $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1'
        }

        $asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
        $asTask = $asTaskGeneric.MakeGenericMethod([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
        $task = $asTask.Invoke($null, @($asyncOp))
        $mgr = $task.GetAwaiter().GetResult()

        if ($mgr -ne $null) {
          $asTaskBool = $asTaskGeneric.MakeGenericMethod([bool])
          $sessions = $mgr.GetSessions()
          foreach ($s in $sessions) {
            $info = $s.GetPlaybackInfo()
            if ($info.PlaybackStatus -eq [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus]::Playing) {
              $pauseOp = $s.TryPauseAsync()
              $pauseTask = $asTaskBool.Invoke($null, @($pauseOp))
              $res = $pauseTask.GetAwaiter().GetResult()
              if ($res) { $pausedCount++ }
            }
          }
        }
      } catch {
        # Fallback if WinRT fails
      }

      # If WinRT could not find/pause sessions, send VK_MEDIA_STOP (0xB2 = 178)
      # Note: VK_MEDIA_STOP is safe because it does NOT toggle playback back on!
      if ($pausedCount -eq 0) {
        Add-Type -TypeDefinition @"
          using System;
          using System.Runtime.InteropServices;
          public class KeySender {
            [DllImport("user32.dll")]
            public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
            public static void StopMedia() {
              keybd_event(0xB2, 0, 0, UIntPtr.Zero); // VK_MEDIA_STOP down
              keybd_event(0xB2, 0, 2, UIntPtr.Zero); // VK_MEDIA_STOP up
            }
          }
"@ -ErrorAction SilentlyContinue
        [KeySender]::StopMedia()
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
