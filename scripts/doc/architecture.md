# Scripts architecture

[tauri-windows.cmd](../tauri-windows.cmd) is the Windows wrapper for the Tauri CLI. [package.json](../../package.json) calls it from `tauri:dev` and `tauri:build`.

The wrapper finds the repository root, adds a local SDK and Cargo toolchain from `.tools/` to environment variables when present, calls Visual Studio's `vcvars64.bat` when present, and forwards arguments to `node_modules/.bin/tauri.cmd`. It returns that command's exit code. It does not own application state or persist user settings. See the [README](../../README.md) for build commands.

[Uninstall-TopClock.cmd](../Uninstall-TopClock.cmd) and [Uninstall-TopClock.ps1](../Uninstall-TopClock.ps1) are copied into the portable ZIP by the [release workflow](../../.github/workflows/release.yml). The command file opens the PowerShell script and shows its result. The PowerShell script uses its own directory to identify the adjacent `TopClock.exe`; it never searches for other portable copies or removes the enclosing folder. It removes the current user's `TopClock` Run value only when that value names the adjacent executable. Shared settings and cache deletion requires a separate confirmation and targets only TopClock's current and legacy user-data directories. It refuses linked data directories and leaves files in place if removal fails. The installed build uses Tauri's NSIS uninstaller instead.

The command file applies PowerShell's execution-policy bypass only to its child process; it does not change the user's policy setting. It pauses after the script finishes so a double-click user can read the result.
