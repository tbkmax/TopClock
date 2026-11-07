# Export local Windows failure events without relying on localized message DLLs.
[CmdletBinding()]
param(
    [ValidateRange(1, 90)][int]$Days = 7,
    [string]$OutputPath = "TopClock-failures-$(Get-Date -Format yyyyMMdd-HHmmss).xml",
    [datetime]$StartTimeUtc
)
$ErrorActionPreference = 'Stop'
$age = [long]$Days * 86400000
$output = New-Object System.Xml.XmlDocument
$root = $output.CreateElement('TopClockFailures')
$null = $output.AppendChild($root)
foreach ($log in @('Application', 'System')) {
    $ids = if ($log -eq 'Application') { 'EventID=1000 or EventID=1001 or EventID=1002' } else { 'EventID=2004' }
    $timeFilter = "timediff(@SystemTime) <= $age"
    if ($PSBoundParameters.ContainsKey('StartTimeUtc')) {
        $start = $StartTimeUtc.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffffffZ')
        $timeFilter = "@SystemTime >= '$start'"
    }
    $query = "*[System[($ids) and TimeCreated[$timeFilter]]]"
    $raw = & wevtutil.exe qe $log "/q:$query" /f:xml /e:Events /rd:true
    if ($LASTEXITCODE -ne 0) { throw "Could not read $log events. Try an elevated PowerShell window." }
    [xml]$events = $raw -join [Environment]::NewLine
    foreach ($event in $events.Events.Event) {
        if ($event.OuterXml -match '(?i)top_?clock') {
            $null = $root.AppendChild($output.ImportNode($event, $true))
        }
    }
}
# CreateNew protects an earlier diagnostic export from accidental replacement.
$stream = [IO.File]::Open([IO.Path]::GetFullPath($OutputPath), [IO.FileMode]::CreateNew)
try { $output.Save($stream) } finally { $stream.Dispose() }
Write-Host "Saved $($root.ChildNodes.Count) matching events to $OutputPath."
