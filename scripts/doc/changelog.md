# Scripts changelog

## Added

### 2026-10-27 - Portable cleanup scripts

- Added [Uninstall-TopClock.cmd](../Uninstall-TopClock.cmd) and [Uninstall-TopClock.ps1](../Uninstall-TopClock.ps1) to the portable release ZIP. They remove the adjacent executable, remove its matching sign-in entry, and optionally remove shared TopClock user data after a separate confirmation. Users delete the cleanup scripts and folder themselves afterward.

### 2026-10-24 - Toolchain environment sequencing fix

- Reordered [tauri-windows.cmd](../tauri-windows.cmd) to invoke `vcvars64.bat` before setting `.tools/` SDK paths (`PATH`, `LIB`, `INCLUDE`). This prevents `vcvars64.bat` from clobbering the local Windows SDK libraries and binaries needed by `rc.exe` and the MSVC linker.

### 2026-10-22 - Folder documentation

- Added this folder's architecture, workflow, changelog and backlog documents.
- No operator action is required.
