param(
    [Parameter(Mandatory = $true)]
    [string] $Version,
    [string] $IdentityName = 'tbkmax.TopClock',
    [string] $Publisher = 'CN=508EFCDF-2961-4370-827D-3736CE5AC66A',
    [string] $PublisherDisplayName = 'tbkmax'
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$match = [regex]::Match($Version, '^v?([1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$')
if (-not $match.Success) {
    throw 'Version must be a release tag such as v1.2.3 (nonzero major, three numeric components, no prerelease suffix).'
}
$parts = @($match.Groups[1].Value, $match.Groups[2].Value, $match.Groups[3].Value)
if (@($parts | Where-Object { $_.Length -gt 5 -or [int]$_ -gt 65535 }).Count -gt 0) {
    throw 'MSIX Store versions require a nonzero major version and components no greater than 65535.'
}
$appVersion = $parts -join '.'
$msixVersion = "$appVersion.0"
if ($IdentityName -notmatch '^[A-Za-z0-9][A-Za-z0-9.-]{0,49}$') {
    throw 'IdentityName must be a valid MSIX package name.'
}
if ($Publisher -notmatch '^CN=.+') {
    throw 'Publisher must be a certificate-style distinguished name beginning with CN=.'
}

$assets = [System.IO.Path]::GetFullPath((Join-Path $root 'release-assets'))
$stage = [System.IO.Path]::GetFullPath((Join-Path $assets "msix-stage-$IdentityName"))
if (-not $stage.StartsWith(($assets + [System.IO.Path]::DirectorySeparatorChar), [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'The MSIX staging directory must remain inside release-assets.'
}
$output = Join-Path $assets "TopClock_${IdentityName}_${msixVersion}_x64.msix"
$binary = Join-Path $root 'src-tauri\target\release\top_clock.exe'
$sdkLocal = Join-Path $root '.tools\sdk-core\c\bin\10.0.26100.0\x64\makeappx.exe'
$makeAppx = if (Test-Path $sdkLocal) { $sdkLocal } else {
    $sdk = Get-ChildItem -Path "${env:ProgramFiles(x86)}\Windows Kits\10\bin" -Filter makeappx.exe -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match '\\x64\\makeappx\.exe$' } |
        Sort-Object FullName -Descending |
        Select-Object -First 1
    if ($sdk) { $sdk.FullName } else { throw 'Windows SDK makeappx.exe (x64) was not found.' }
}

New-Item -ItemType Directory -Path $assets -Force | Out-Null
if ((Get-Item -LiteralPath $assets).Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
    throw 'Refusing to use a linked release-assets directory.'
}
$override = Join-Path $assets 'msix-tauri-override.json'
@{ version = $appVersion } | ConvertTo-Json -Compress | Set-Content -LiteralPath $override -Encoding utf8
& (Join-Path $root 'scripts\tauri-windows.cmd') build --no-bundle --config $override
if ($LASTEXITCODE -ne 0) { throw "Tauri build failed with exit code $LASTEXITCODE." }
if (-not (Test-Path $binary)) { throw "Tauri executable was not found: $binary" }

if (Test-Path $stage) {
    if ((Get-Item -LiteralPath $stage).Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
        throw 'Refusing to remove a linked MSIX staging directory.'
    }
    $registered = Get-AppxPackage | Where-Object {
        $_.InstallLocation -and
        [System.IO.Path]::GetFullPath($_.InstallLocation).TrimEnd('\') -eq $stage.TrimEnd('\')
    } | Select-Object -First 1
    if ($registered) {
        throw "Refusing to replace the staging directory registered by $($registered.PackageFullName). Unregister that development package first."
    }
    Remove-Item -LiteralPath $stage -Recurse -Force
}
New-Item -ItemType Directory -Path (Join-Path $stage 'Assets') -Force | Out-Null
Copy-Item -LiteralPath $binary -Destination (Join-Path $stage 'TopClock.exe')
Copy-Item -LiteralPath (Join-Path $root 'src-tauri\icons\msix-150.png') -Destination (Join-Path $stage 'Assets\Square150x150Logo.png')
Copy-Item -LiteralPath (Join-Path $root 'src-tauri\icons\msix-44.png') -Destination (Join-Path $stage 'Assets\Square44x44Logo.png')
Copy-Item -LiteralPath (Join-Path $root 'src-tauri\icons\msix-50.png') -Destination (Join-Path $stage 'Assets\StoreLogo.png')

$xmlName = [System.Security.SecurityElement]::Escape($IdentityName)
$xmlPublisher = [System.Security.SecurityElement]::Escape($Publisher)
$xmlPublisherDisplay = [System.Security.SecurityElement]::Escape($PublisherDisplayName)
@"
<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
         xmlns:uap5="http://schemas.microsoft.com/appx/manifest/uap/windows10/5"
         xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
         IgnorableNamespaces="uap5 rescap">
  <Identity Name="$xmlName" Publisher="$xmlPublisher" Version="$msixVersion" ProcessorArchitecture="x64" />
  <Properties>
    <DisplayName>TopClock</DisplayName>
    <PublisherDisplayName>$xmlPublisherDisplay</PublisherDisplayName>
    <Description>Transparent always-on-top desktop clock</Description>
    <Logo>Assets\StoreLogo.png</Logo>
  </Properties>
  <Resources><Resource Language="en-us" /></Resources>
  <Dependencies><TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.26100.0" /></Dependencies>
  <Applications>
    <Application Id="TopClock" Executable="TopClock.exe" EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements DisplayName="TopClock" Description="Transparent always-on-top desktop clock"
                          BackgroundColor="transparent" Square150x150Logo="Assets\Square150x150Logo.png"
                          Square44x44Logo="Assets\Square44x44Logo.png" />
      <Extensions>
        <uap5:Extension Category="windows.startupTask" Executable="TopClock.exe" EntryPoint="Windows.FullTrustApplication">
          <uap5:StartupTask TaskId="TopClockStartup" Enabled="false" DisplayName="TopClock" />
        </uap5:Extension>
      </Extensions>
    </Application>
  </Applications>
  <Capabilities><rescap:Capability Name="runFullTrust" /></Capabilities>
</Package>
"@ | Set-Content -LiteralPath (Join-Path $stage 'AppxManifest.xml') -Encoding utf8

if (Test-Path $output) { Remove-Item -LiteralPath $output -Force }
& $makeAppx pack /d $stage /p $output /h SHA256 /v
if ($LASTEXITCODE -ne 0) { throw "MakeAppx failed with exit code $LASTEXITCODE." }
Write-Host "Created $output"
Write-Host "Identity: $IdentityName; Publisher: $Publisher; Version: $msixVersion"
Write-Host 'This package is unsigned for Partner Center upload. Local installation requires a matching trusted signature.'
