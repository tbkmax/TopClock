# Tauri package changelog

## Added

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
