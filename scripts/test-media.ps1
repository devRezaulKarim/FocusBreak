Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType=WindowsRuntime] | Out-Null

$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | ? {
    $_.Name -eq 'AsTask' -and 
    $_.GetParameters().Count -eq 1 -and 
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
}

$asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
$asTask = $asTaskGeneric.MakeGenericMethod([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$task = $asTask.Invoke($null, @($asyncOp))
$mgr = $task.GetAwaiter().GetResult()

Write-Host "Success getting Manager: $($null -ne $mgr)"
$sessions = $mgr.GetSessions()
Write-Host "Sessions count: $($sessions.Count)"
foreach ($s in $sessions) {
    $info = $s.GetPlaybackInfo()
    Write-Host "Session: $($s.SourceAppUserModelId) -> Status: $($info.PlaybackStatus)"
}
