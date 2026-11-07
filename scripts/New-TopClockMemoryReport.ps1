[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$CaptureDirectory,
    [ValidateRange(0, 1440)][int]$WarmupMinutes = 10
)
$ErrorActionPreference = 'Stop'
$capture = (Resolve-Path -LiteralPath $CaptureDirectory).Path
$run = Get-Content -LiteralPath (Join-Path $capture 'run.json') -Raw | ConvertFrom-Json
$csv = Join-Path $capture 'memory.csv'
$rows = @()
if (Test-Path -LiteralPath $csv) { $rows = @(Import-Csv -LiteralPath $csv) }
$valid = @($rows | Where-Object {
    $_.Status -eq 'Running' -and $_.TotalPrivateBytes -match '^\d+$' -and
    $_.HostPrivateBytes -match '^\d+$' -and $_.WebViewPrivateBytes -match '^\d+$' -and
    $_.ElapsedSeconds -match '^\d+(\.\d+)?$'
})
$settled = @($valid | Where-Object { [double]$_.ElapsedSeconds -ge $WarmupMinutes * 60 })
$findings = New-Object 'System.Collections.Generic.List[string]'
if ($run.State -ne 'Completed') { $findings.Add("Run state $($run.State). $($run.Error)") }
if (@($rows | Where-Object Status -eq 'Exited').Count) {
    $findings.Add('The clock process exited. Correlate this with Windows events and any deliberate Quit action in notes.txt.')
}
if ($valid.Count -ne @($rows | Where-Object Status -eq 'Running').Count) {
    $findings.Add('Some CSV samples are incomplete or invalid and were excluded.')
}
if ($run.EventCollection -ne 'Collected') { $findings.Add("Windows event collection $($run.EventCollection). $($run.EventError)") }
$duration = 0
$maxGap = 0.0
$gapCount = 0
if ($valid.Count) {
    $duration = [double]$valid[-1].ElapsedSeconds - [double]$valid[0].ElapsedSeconds
    if (@($valid | Where-Object { [int]$_.WebViewProcesses -eq 0 }).Count) {
        $findings.Add('Some samples have zero descendant WebView2 processes. Check process coverage before interpreting total memory.')
    }
    if (@($valid.ExecutableSha256 | Select-Object -Unique).Count -ne 1) {
        $findings.Add('The capture contains multiple executable hashes. Analyze each build separately.')
    }
}
for ($i = 1; $i -lt $valid.Count; $i++) {
    $gap = ([datetimeoffset]$valid[$i].Utc - [datetimeoffset]$valid[$i - 1].Utc).TotalSeconds
    $maxGap = [math]::Max($maxGap, $gap)
    if ($gap -gt [math]::Max(60.0, [double]$run.IntervalSeconds * 3)) { $gapCount++ }
}
if ($gapCount) { $findings.Add("$gapCount long sampling gaps occurred. Sleep/resume or a stalled sampler can affect the trend.") }
if ($duration -lt 3600 -or $settled.Count -lt 10) {
    $findings.Add('Limited coverage. Collect at least one hour with ten usable samples after warmup; eight hours is the default target.')
}

function Get-Median($Values) {
    $sorted = @($Values | Sort-Object)
    if (!$sorted.Count) { return $null }
    $middle = [int][math]::Floor($sorted.Count / 2)
    if ($sorted.Count % 2) { return [double]$sorted[$middle] }
    return ([double]$sorted[$middle - 1] + [double]$sorted[$middle]) / 2
}

$trends = @()
foreach ($column in @('HostPrivateBytes', 'WebViewPrivateBytes', 'TotalPrivateBytes')) {
    if ($settled.Count -lt 2) { continue }
    $firstTime = [double]$settled[0].ElapsedSeconds
    $lastTime = [double]$settled[-1].ElapsedSeconds
    $firstWindow = @($settled | Where-Object { [double]$_.ElapsedSeconds -le $firstTime + 900 })
    $lastWindow = @($settled | Where-Object { [double]$_.ElapsedSeconds -ge $lastTime - 900 })
    $firstMedian = Get-Median @($firstWindow | ForEach-Object { [double]$_.$column / 1MB })
    $lastMedian = Get-Median @($lastWindow | ForEach-Object { [double]$_.$column / 1MB })
    $times = @($settled | ForEach-Object { ([double]$_.ElapsedSeconds - $firstTime) / 3600 })
    $values = @($settled | ForEach-Object { [double]$_.$column / 1MB })
    $meanX = ($times | Measure-Object -Average).Average
    $meanY = ($values | Measure-Object -Average).Average
    $numerator = 0.0
    $denominator = 0.0
    for ($i = 0; $i -lt $times.Count; $i++) {
        $dx = $times[$i] - $meanX
        $numerator += $dx * ($values[$i] - $meanY)
        $denominator += $dx * $dx
    }
    $slope = 0.0
    if ($denominator -gt 0) { $slope = $numerator / $denominator }
    $trends += [pscustomobject]@{
        Metric = $column
        FirstMedianMiB = [math]::Round($firstMedian, 2)
        LastMedianMiB = [math]::Round($lastMedian, 2)
        ChangeMiB = [math]::Round($lastMedian - $firstMedian, 2)
        PeakMiB = [math]::Round(($values | Measure-Object -Maximum).Maximum, 2)
        SlopeMiBPerHour = [math]::Round($slope, 2)
    }
    if ($duration -ge 3600 -and $slope -gt 5 -and $lastMedian - $firstMedian -gt 20) {
        $findings.Add("$column increased by more than 20 MiB between window medians with a fitted trend above 5 MiB/hour. Review for sustained growth.")
    }
}
$eventCount = $null
$eventPath = Join-Path $capture 'failures.xml'
if ($run.EventCollection -eq 'Collected' -and (Test-Path -LiteralPath $eventPath)) {
    [xml]$events = Get-Content -LiteralPath $eventPath -Raw
    $eventCount = @($events.SelectNodes("/*[local-name()='TopClockFailures']/*[local-name()='Event']")).Count
    if ($eventCount) { $findings.Add("$eventCount Windows failure events mention TopClock during the run. Inspect failures.xml for timing, module and exception details.") }
}
$assessment = 'Capture completed without warning flags'
if ($findings.Count) { $assessment = 'Review required' }
$summary = [ordered]@{
    Assessment = $assessment
    Run = $run
    SampleCount = $valid.Count
    ObservedHours = [math]::Round($duration / 3600, 3)
    WarmupMinutes = $WarmupMinutes
    Version = $null
    ExecutableSha256 = $null
    FirstUtc = $null
    LastUtc = $null
    MaxSamplingGapSeconds = [math]::Round($maxGap, 2)
    LongSamplingGaps = $gapCount
    MatchingFailureEvents = $eventCount
    HostHandlesFirst = $null
    HostHandlesLast = $null
    WebViewProcessesFirst = $null
    WebViewProcessesLast = $null
    WebViewProcessesPeak = $null
    Trends = $trends
    Findings = @($findings.ToArray())
}
if ($valid.Count) {
    $summary.Version = $valid[0].Version
    $summary.ExecutableSha256 = $valid[0].ExecutableSha256
    $summary.FirstUtc = $valid[0].Utc
    $summary.LastUtc = $valid[-1].Utc
    $summary.HostHandlesFirst = $valid[0].HostHandles
    $summary.HostHandlesLast = $valid[-1].HostHandles
    $summary.WebViewProcessesFirst = $valid[0].WebViewProcesses
    $summary.WebViewProcessesLast = $valid[-1].WebViewProcesses
    $summary.WebViewProcessesPeak = ($valid | ForEach-Object { [int]$_.WebViewProcesses } | Measure-Object -Maximum).Maximum
}
$summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $capture 'summary.json') -Encoding UTF8
function Escape-Html($Value) { return [Net.WebUtility]::HtmlEncode([string]$Value) }
$svg = ''
if ($valid.Count -ge 2 -and $duration -gt 0) {
    $peak = [math]::Max(1.0, ($valid | ForEach-Object { [double]$_.TotalPrivateBytes / 1MB } | Measure-Object -Maximum).Maximum)
    $points = New-Object 'System.Collections.Generic.List[string]'
    # Limit chart size for multi-day captures; full samples remain in memory.csv.
    $stride = [math]::Max(1, [int][math]::Ceiling($valid.Count / 1500))
    for ($i = 0; $i -lt $valid.Count; $i += $stride) {
        $x = 60 + 870 * ([double]$valid[$i].ElapsedSeconds - [double]$valid[0].ElapsedSeconds) / $duration
        $y = 260 - 230 * ([double]$valid[$i].TotalPrivateBytes / 1MB) / $peak
        $points.Add([string]::Format([Globalization.CultureInfo]::InvariantCulture, '{0:0.##},{1:0.##}', $x, $y))
    }
    $lastY = 260 - 230 * ([double]$valid[-1].TotalPrivateBytes / 1MB) / $peak
    $points.Add([string]::Format([Globalization.CultureInfo]::InvariantCulture, '930,{0:0.##}', $lastY))
    # SVG numbers must use decimal points even on a non-English Windows locale.
    $pointText = $points -join ' '
    $svg = '<svg viewBox="0 0 960 300" role="img" aria-label="Total private memory over elapsed hours"><path d="M60 20V260H940" fill="none" stroke="#777"/><polyline fill="none" stroke="#1976d2" stroke-width="2" points="' + $pointText + '"/><text x="4" y="24">' + [math]::Round($peak) + ' MiB</text><text x="40" y="283">0 h</text><text x="830" y="283">' + [math]::Round($duration / 3600, 2) + ' h</text></svg>'
}
$findingHtml = ($findings | ForEach-Object { '<li>' + (Escape-Html $_) + '</li>' }) -join ''
$trendHtml = ($trends | ForEach-Object {
    '<tr><td>' + (Escape-Html $_.Metric) + '</td><td>' + $_.FirstMedianMiB + '</td><td>' + $_.LastMedianMiB + '</td><td>' + $_.ChangeMiB + '</td><td>' + $_.PeakMiB + '</td><td>' + $_.SlopeMiBPerHour + '</td></tr>'
}) -join ''
$notes = ''
if (Test-Path -LiteralPath (Join-Path $capture 'notes.txt')) { $notes = Get-Content -LiteralPath (Join-Path $capture 'notes.txt') -Raw }
$html = @"
<!doctype html><html lang="en"><meta charset="utf-8"><title>TopClock long-run report</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:1000px;margin:40px auto;padding:0 24px;color:#222}table{border-collapse:collapse;width:100%}td,th{padding:8px;text-align:left;border-bottom:1px solid #ddd}svg{width:100%;background:#fafafa}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f5f5;padding:16px}small{overflow-wrap:anywhere}</style>
<h1>TopClock long-run report</h1><p><strong>$(Escape-Html $assessment)</strong></p>
<p>$(Escape-Html $run.Scenario). Captured $($summary.ObservedHours) hours with $($valid.Count) usable samples. Run state $(Escape-Html $run.State).</p>
<p>Build $(Escape-Html $summary.Version)<br><small>SHA-256 $(Escape-Html $summary.ExecutableSha256)</small></p>
<p>$(Escape-Html $summary.FirstUtc) through $(Escape-Html $summary.LastUtc). Timestamps use UTC.</p>
<p>$(Escape-Html $run.WindowsVersion). Physical memory $($run.TotalPhysicalMemoryMiB) MiB.
WebView process count $($summary.WebViewProcessesFirst) to $($summary.WebViewProcessesLast), peak $($summary.WebViewProcessesPeak).
Host handles $($summary.HostHandlesFirst) to $($summary.HostHandlesLast). Largest sample gap $($summary.MaxSamplingGapSeconds) seconds.</p>
<ul>$findingHtml</ul>
<h2>Total private memory</h2>$svg
<h2>Memory after $WarmupMinutes minutes of warmup</h2>
<table><thead><tr><th>Process group</th><th>First median MiB</th><th>Last median MiB</th><th>Change MiB</th><th>Peak MiB</th><th>Trend MiB/hour</th></tr></thead><tbody>$trendHtml</tbody></table>
<p>Medians use the first and last 15 minutes after warmup. Trend uses a linear fit across all post-warmup samples. Short captures can have overlapping median windows. The chart is downsampled for large captures; memory.csv retains every sample.</p>
<p>Review flags use a measured duration of at least one hour, median growth above 20 MiB, and a fitted slope above 5 MiB/hour. These are investigation thresholds. Caching, workload changes and sleep can affect them. A quiet capture supports stability for this build, workload, machine and duration. Confirming the original Store incidents requires reproducing their conditions or matching failure details.</p>
<p>Windows event collection $(Escape-Html $run.EventCollection). Matching events $(Escape-Html $eventCount). Coverage includes events mentioning TopClock; WebView-only events may require additional investigation.</p>
<h2>Test notes</h2><pre>$(Escape-Html $notes)</pre>
</html>
"@
$html | Set-Content -LiteralPath (Join-Path $capture 'report.html') -Encoding UTF8
$archive = $capture + '.zip'
$files = @('report.html', 'summary.json', 'run.json', 'memory.csv', 'failures.xml', 'notes.txt') |
    ForEach-Object { Join-Path $capture $_ } | Where-Object { Test-Path -LiteralPath $_ }
Compress-Archive -LiteralPath $files -DestinationPath $archive -Force
Write-Host "Report $(Join-Path $capture 'report.html')"
Write-Host "Share $archive for review."
