# Tauri package changelog

## Fixed

### 2026-10-25 - Prevent Aero Snap bounce-back on clock window

- Configured `"maximizable": false` for the `main` window in [tauri.conf.json](../tauri.conf.json) to prevent Windows DWM from triggering Aero Snap and bouncing the borderless window back when dragged near the top or sides of the screen.

## Added

### 2026-10-25 - Lightweight release reminder transition

- Replaced internal updater & process plugins with lightweight GitHub Release reminders, avoiding Defender heuristic dropper alerts.
- Set default development version to `0.0.0` across [tauri.conf.json](../tauri.conf.json) and [Cargo.toml](../Cargo.toml) so any published tag is treated as a valid update during local testing.

### 2026-10-24 - Simplified app identifier to topclock

- Updated [tauri.conf.json](../tauri.conf.json) app identifier from `com.maxtc.topclock` to `topclock`, storing settings under `%APPDATA%\topclock\settings.json`.

### 2026-10-24 - Project rename to TopClock

- Updated [Cargo.toml](../Cargo.toml) package name to `top_clock`.
- Updated [tauri.conf.json](../tauri.conf.json) product name to `TopClock`, app identifier to `com.maxtc.topclock`, and window titles to `TopClock` and `TopClock Settings`.
- Updated [src/main.rs](../src/main.rs) tray tooltip and auto-start registry key identifier to `TopClock`.

### 2026-10-22 - Windows font listing

- Enabled Windows GDI font enumeration for the installed-font dropdown. No operator action is required.

### 2026-10-22 - Clock window sizing permission

- The clock frontend can size its transparent window to a selected font and time layout while the Settings window remains fixed. No operator action is required.

### 2026-10-22 - Recursive folder documentation

- Added this package's documentation and documentation folders for its maintained subfolders.
- No operator action is required.
