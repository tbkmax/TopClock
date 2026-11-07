# Attach to a running TopClock and record its private committed memory over time.
[CmdletBinding()]
param(
    [int]$ClockProcessId,
    [ValidateRange(1, 604800)][int]$DurationSeconds = 3600,
    [ValidateRange(1, 3600)][int]$IntervalSeconds = 15,
    [string]$OutputPath = "TopClock-memory-$(Get-Date -Format yyyyMMdd-HHmmss).csv",
    [string]$StopFile
)

$ErrorActionPreference = 'Stop'
$clocks = @(Get-Process -Name TopClock, top_clock -ErrorAction SilentlyContinue)
if ($PSBoundParameters.ContainsKey('ClockProcessId')) {
    $clocks = @($clocks | Where-Object { $_.Id -eq $ClockProcessId })
}
if ($clocks.Count -ne 1) {
    throw "Expected one running TopClock, found $($clocks.Count). Launch the build to measure or select it with -ClockProcessId."
}
$clock = $clocks[0]
# Keep the original process handle so PID reuse cannot switch the measured host.
$null = $clock.Handle
$clockVersion = [Diagnostics.FileVersionInfo]::GetVersionInfo($clock.Path).ProductVersion
$clockHash = (Get-FileHash -LiteralPath $clock.Path -Algorithm SHA256).Hash
Write-Host "Measuring PID $($clock.Id), $($clock.Path), version $clockVersion"

$elapsed = [Diagnostics.Stopwatch]::StartNew()
$firstSample = $true
while ($true) {
    if ($StopFile -and (Test-Path -LiteralPath $StopFile)) { break }
    $clock.Refresh()
    $status = 'Running'
    $webviews = @()
    if (!$clock.HasExited) {
        # Discover new renderers and discard exited ones at every sample.
        $candidates = @(Get-CimInstance Win32_Process -Filter "Name='msedgewebview2.exe'" -Property ProcessId,ParentProcessId,CreationDate,PrivatePageCount)
        $parents = @{ $clock.Id = $clock.StartTime }
        do {
            $children = @($candidates | Where-Object {
                $parents.ContainsKey([int]$_.ParentProcessId) -and $_.CreationDate -ge $parents[[int]$_.ParentProcessId]
            })
            $webviews += $children
            $parents = @{}
            foreach ($child in $children) { $parents[[int]$child.ProcessId] = $child.CreationDate }
        } while ($children.Count -gt 0)
    }
    $hostBytes = $null
    $webviewBytes = $null
    $totalBytes = $null
    if (!$clock.HasExited) {
        $hostBytes = $clock.PrivateMemorySize64
        $webviewBytes = [long](($webviews | Measure-Object -Property PrivatePageCount -Sum).Sum)
        $totalBytes = $hostBytes + $webviewBytes
    } else {
        $status = 'Exited'
    }
    $sample = [pscustomobject]@{
        Utc = [datetime]::UtcNow.ToString('o')
        ElapsedSeconds = [math]::Round($elapsed.Elapsed.TotalSeconds, 2)
        HostPid = $clock.Id
        Version = $clockVersion
        ExecutableSha256 = $clockHash
        Status = $status
        HostPrivateBytes = $hostBytes
        HostHandles = if ($status -eq 'Running') { $clock.HandleCount } else { $null }
        HostThreads = if ($status -eq 'Running') { $clock.Threads.Count } else { $null }
        WebViewProcesses = $webviews.Count
        WebViewPids = ($webviews.ProcessId | Sort-Object) -join ';'
        WebViewPrivateBytes = $webviewBytes
        TotalPrivateBytes = $totalBytes
    }
    if ($firstSample) {
        $sample | Export-Csv -LiteralPath $OutputPath -NoTypeInformation -NoClobber
        $firstSample = $false
        Write-Host "Writing $OutputPath (Ctrl+C stops sampling)."
    } else {
        $sample | Export-Csv -LiteralPath $OutputPath -NoTypeInformation -Append
    }
    if ($status -eq 'Exited') { throw "TopClock exited during sampling (exit code $($clock.ExitCode)). See $OutputPath." }
    $remaining = $DurationSeconds - $elapsed.Elapsed.TotalSeconds
    if ($remaining -le 0) { break }
    Start-Sleep -Milliseconds ([int][math]::Ceiling(1000 * [math]::Min($IntervalSeconds, $remaining)))
}
