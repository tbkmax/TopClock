[CmdletBinding()]
param(
    [ValidateRange(0.001, 168)][double]$Hours = 3,
    [ValidateRange(1, 300)][int]$IntervalSeconds = 30,
    [int]$ClockProcessId,
    [string]$Scenario = 'Normal desktop use',
    [string]$OutputRoot
)
$ErrorActionPreference = 'Stop'
$scriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path $scriptFolder '..\.tools\long-run'
}
$capture = Join-Path ([IO.Path]::GetFullPath($OutputRoot)) ((Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
$null = New-Item -ItemType Directory -Path $capture -Force
$run = [ordered]@{
    StartedUtc = [datetime]::UtcNow.ToString('o')
    EndedUtc = $null
    RequestedHours = $Hours
    IntervalSeconds = $IntervalSeconds
    Scenario = $Scenario
    State = 'Running'
    Error = $null
    EventCollection = 'Pending'
    EventError = $null
    WindowsVersion = [Environment]::OSVersion.VersionString
    TotalPhysicalMemoryMiB = $null
}
$metadata = Join-Path $capture 'run.json'
$run | ConvertTo-Json | Set-Content -LiteralPath $metadata -Encoding UTF8
Write-Host "Capture folder $capture"
Write-Host "Leave this window and the updated clock running for $Hours hours."
Write-Host 'A status line appears at startup and every five minutes. Samples are saved every 30 seconds.'
Write-Host 'Use the clock normally. Record unusual behavior and approximate times in notes.txt.'
Write-Host 'To finish early, create an empty file named STOP in the capture folder.'
Write-Host 'If the terminal is closed or Windows restarts, the saved CSV can be used to regenerate the report.'
Set-Content -LiteralPath (Join-Path $capture 'notes.txt') -Encoding UTF8 -Value @(
    "Scenario: $Scenario"
    'Add times and observations here: Settings open/close, display changes, sleep/resume, unusual behavior, or deliberate app exit.'
)
try {
    $os = Get-CimInstance Win32_OperatingSystem -Property TotalVisibleMemorySize
    $run.TotalPhysicalMemoryMiB = [math]::Round($os.TotalVisibleMemorySize / 1024)
    $arguments = @{
        DurationSeconds = [int][math]::Ceiling($Hours * 3600)
        IntervalSeconds = $IntervalSeconds
        OutputPath = Join-Path $capture 'memory.csv'
        StopFile = Join-Path $capture 'STOP'
        ProgressPath = Join-Path $capture 'progress.log'
    }
    if ($PSBoundParameters.ContainsKey('ClockProcessId')) { $arguments.ClockProcessId = $ClockProcessId }
    & (Join-Path $scriptFolder 'Measure-TopClockMemory.ps1') @arguments
    $run.State = 'Completed'
    if (Test-Path -LiteralPath $arguments.StopFile) { $run.State = 'StoppedEarly' }
} catch {
    $run.State = 'SamplingStopped'
    $run.Error = $_.Exception.Message
    Write-Warning $run.Error
} finally {
    $run.EndedUtc = [datetime]::UtcNow.ToString('o')
    try {
        & (Join-Path $scriptFolder 'Collect-TopClockFailures.ps1') -StartTimeUtc ([datetime]$run.StartedUtc) -OutputPath (Join-Path $capture 'failures.xml')
        $run.EventCollection = 'Collected'
    } catch {
        $run.EventCollection = 'Unavailable'
        $run.EventError = $_.Exception.Message
        Write-Warning $run.EventError
    }
    $run | ConvertTo-Json | Set-Content -LiteralPath $metadata -Encoding UTF8
    & (Join-Path $scriptFolder 'New-TopClockMemoryReport.ps1') -CaptureDirectory $capture
}
