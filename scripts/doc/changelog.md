# Scripts changelog

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
