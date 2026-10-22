# Scripts architecture

[tauri-windows.cmd](../tauri-windows.cmd) is the Windows wrapper for the Tauri CLI. [package.json](../../package.json) calls it from `tauri:dev` and `tauri:build`.

The wrapper finds the repository root, adds a local SDK and Cargo toolchain from `.tools/` to environment variables when present, calls Visual Studio's `vcvars64.bat` when present, and forwards arguments to `node_modules/.bin/tauri.cmd`. It returns that command's exit code. It does not own application state or persist user settings. See the [README](../../README.md) for build commands.
