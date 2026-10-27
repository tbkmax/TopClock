$ErrorActionPreference = 'Stop'

function Confirm-Yes([string] $question) {
    $answer = Read-Host "$question [y/N]"
    return $answer -match '^(?i:y|yes)$'
}

function Get-AppDataChild([string] $parent, [string] $name) {
    if ([string]::IsNullOrWhiteSpace($parent)) {
        throw 'Windows did not provide an application-data directory.'
    }

    $base = [IO.Path]::GetFullPath($parent).TrimEnd('\')
    $root = [IO.Path]::GetPathRoot($base).TrimEnd('\')
    if ([StringComparer]::OrdinalIgnoreCase.Equals($base, $root)) {
        throw "Refusing to remove application data from a drive root: $base"
    }

    $child = [IO.Path]::GetFullPath((Join-Path $base $name))
    $childParent = [IO.Path]::GetDirectoryName($child).TrimEnd('\')
    if (-not [StringComparer]::OrdinalIgnoreCase.Equals($childParent, $base)) {
        throw "Unexpected application-data path: $child"
    }
    return $child
}

function Assert-NoLinks([string] $path) {
    $item = Get-Item -LiteralPath $path -Force
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "Refusing to follow a link or junction in application data: $path"
    }
    if ($item.PSIsContainer) {
        foreach ($child in Get-ChildItem -LiteralPath $path -Force) {
            Assert-NoLinks $child.FullName
        }
    }
}

$portableExe = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'TopClock.exe'))
$startupKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'

Write-Host 'Portable TopClock cleanup'
Write-Host "Executable: $portableExe"
Write-Host 'Quit TopClock from its tray menu before continuing.'
if (-not (Confirm-Yes 'Remove this portable copy?')) {
    Write-Host 'Cancelled; nothing was removed.'
    exit 0
}

if (Test-Path -LiteralPath $portableExe -PathType Leaf) {
    try {
        Remove-Item -LiteralPath $portableExe -Force
        Write-Host 'Removed TopClock.exe.'
    } catch {
        Write-Error "Could not remove TopClock.exe. Quit the app and run this script again. $($_.Exception.Message)"
        exit 1
    }
} else {
    Write-Host 'TopClock.exe is already absent from this folder.'
}

try {
    $startupCommand = (Get-ItemProperty -LiteralPath $startupKey -Name 'TopClock' -ErrorAction SilentlyContinue).TopClock
    if ($startupCommand) {
        $registeredExe = $startupCommand.Trim().Trim('"')
        try { $registeredExe = [IO.Path]::GetFullPath($registeredExe) } catch { }
        if ([StringComparer]::OrdinalIgnoreCase.Equals($registeredExe, $portableExe)) {
            Remove-ItemProperty -LiteralPath $startupKey -Name 'TopClock'
            Write-Host 'Removed the sign-in entry for this portable copy.'
        } else {
            Write-Host 'Kept the sign-in entry because it points to another TopClock copy.'
        }
    }
} catch {
    Write-Error "Could not inspect or remove the sign-in entry. $($_.Exception.Message)"
    exit 1
}

Write-Host 'TopClock user data is shared by portable and installed copies.'
Write-Host 'Optional cleanup covers AppData\Roaming\topclock, AppData\Local\topclock, and legacy AppData\Roaming\com.maxtc.topclock.'
if (Confirm-Yes 'Also delete TopClock settings and cache for this Windows user?') {
    if (Get-Process -Name 'TopClock', 'top_clock' -ErrorAction SilentlyContinue) {
        Write-Error 'Another TopClock copy is running. Quit it before deleting shared data, then run this script again.'
        exit 1
    }

    try {
        $dataDirs = @(
            (Get-AppDataChild $env:APPDATA 'topclock'),
            (Get-AppDataChild $env:LOCALAPPDATA 'topclock'),
            (Get-AppDataChild $env:APPDATA 'com.maxtc.topclock')
        )
        foreach ($dir in $dataDirs) {
            if (Test-Path -LiteralPath $dir -PathType Container) {
                Assert-NoLinks $dir
                Remove-Item -LiteralPath $dir -Recurse -Force
                Write-Host "Removed $dir"
            }
        }
    } catch {
        Write-Error "Could not remove all TopClock data. $($_.Exception.Message)"
        exit 1
    }
}

Write-Host 'Cleanup finished. You can delete these two uninstall scripts and their folder if it contains nothing else you need.'
