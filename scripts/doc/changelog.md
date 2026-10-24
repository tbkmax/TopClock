# Scripts changelog

## Added

### 2026-10-24 - Toolchain environment sequencing fix

- Reordered [tauri-windows.cmd](../tauri-windows.cmd) to invoke `vcvars64.bat` before setting `.tools/` SDK paths (`PATH`, `LIB`, `INCLUDE`). This prevents `vcvars64.bat` from clobbering the local Windows SDK libraries and binaries needed by `rc.exe` and the MSVC linker.

### 2026-10-22 - Folder documentation

- Added this folder's architecture, workflow, changelog and backlog documents.
- No operator action is required.
