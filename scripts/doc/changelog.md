# Scripts changelog

## Added

### 2026-11-07 - Compose bundled add-on views during Vite builds

- Added [addon-fragments.js](../addon-fragments.js) to insert allowlisted local add-on rows and Settings controls in development and production. Missing or unknown slots fail composition; no runtime HTML loading or settings migration is introduced. Frontend tests and the production build pass.

### 2026-11-06 - Unattended memory testing and reports

- Added a [double-click launcher](../Test-TopClockLongRun.cmd) and [eight-hour test](../Test-TopClockLongRun.ps1) with early stop, exact build identification, and Windows event collection from the run start.
- Added [HTML and ZIP report generation](../New-TopClockMemoryReport.ps1) with host/WebView memory trends, sampling gaps, coverage limits and recovery from a saved partial capture. Verified a short live 1.0.1 run and a separate controlled app exit in Windows PowerShell 5.1. Simulated eight-hour stable and rising traces exercised the analysis, along with interrupted and empty captures.

### 2026-11-06 - Local memory and failure measurements

- Added [Measure-TopClockMemory.ps1](../Measure-TopClockMemory.ps1) for bounded CSV sampling of one clock's host and descendant WebView2 private memory, process counts and host handles/threads.
- Added [Collect-TopClockFailures.ps1](../Collect-TopClockFailures.ps1) for raw local crash/hang and resource-exhaustion event export. Both protect existing output files. See [usage and interpretation](architecture.md#runtime-diagnostics).
- Verified both scripts in Windows PowerShell 5.1 and PowerShell 7, including refusal to overwrite previous exports. A local failure-event query returned zero matching records. Long Store-installed captures remain release acceptance work.
- Two four-minute standalone 1.0.1 captures on a two-display PC completed without an unexpected exit. After 60 seconds of warmup, original host-plus-WebView2 private memory ranged from 295.96 to 311.21 MiB, and the patched run ranged from 291.24 to 299.68 MiB. The patched run also exercised Settings visibility. Attribution of Partner Center's memory failures remains open after these short, separate runs.

## Added

### 2026-10-29 - Reproducible MSIX development build

- Added [Build-Msix.ps1](../Build-Msix.ps1) to build a versioned executable and package it with an explicit MSIX identity, publisher, manifest, and Store logo assets. It produces an unsigned development artifact; a matching signature is required for installation. No existing direct-download build is changed.

### 2026-10-27 - Portable cleanup scripts

- Added [Uninstall-TopClock.cmd](../Uninstall-TopClock.cmd) and [Uninstall-TopClock.ps1](../Uninstall-TopClock.ps1) to the portable release ZIP. They remove the adjacent executable, remove its matching sign-in entry, and optionally remove shared TopClock user data after a separate confirmation. Users delete the cleanup scripts and folder themselves afterward.

### 2026-10-24 - Toolchain environment sequencing fix

- Reordered [tauri-windows.cmd](../tauri-windows.cmd) to invoke `vcvars64.bat` before setting `.tools/` SDK paths (`PATH`, `LIB`, `INCLUDE`). This prevents `vcvars64.bat` from clobbering the local Windows SDK libraries and binaries needed by `rc.exe` and the MSVC linker.

### 2026-10-22 - Folder documentation

- Added this folder's architecture, workflow, changelog and backlog documents.
- No operator action is required.

## Changed

### 2026-10-29 - Partner Center MSIX identity

- The default [MSIX build](../Build-Msix.ps1) and, initially, the manual CI workflow used the reserved `tbkmax.TopClock` identity and publisher. Packages are named by identity, and the build refuses to replace a loose-registered staging folder. The earlier development registration stays available. Store upload still uses an unsigned package; no signing key is added.

### 2026-10-29 - Keep MSIX packaging local

- Removed the manual MSIX GitHub Actions workflow. The [local script](../Build-Msix.ps1) remains the Store package build path; tag-triggered GitHub releases publish only the portable ZIP.
