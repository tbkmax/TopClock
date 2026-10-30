# Tauri package changelog

## Added

### 2026-10-29 - Enable Store update commands in the MSIX build

- The native build now includes Microsoft Store APIs so a packaged Settings window can check for a published update and request Store installation. Direct-build release handling is unchanged. No operator action is required until a Store package is published; a Store-signed two-version check remains open.

### 2026-10-29 - Windows language detection for packaged builds

- Enabled the Win32 globalization API so System default can use the current user's Windows UI language in both direct and MSIX builds. Existing settings use System default when no language is saved. No operator action is required.

## Changed

### 2026-10-29 - GitHub release uses the portable executable

- The tag-triggered [release workflow](../../.github/workflows/release.yml) now skips NSIS bundling and publishes a portable ZIP with its checksum. Local `npm run tauri:build` can still make an NSIS installer. Existing installed copies are unaffected; future GitHub releases require users to extract the portable ZIP.

### 2026-10-29 - Add an MSIX development package path

- Added an unsigned MSIX build that stages the existing Tauri executable and Windows logo assets. The package declares a disabled sign-in task; packaged builds use Windows startup state, while direct builds keep their Run-key behavior. The NSIS release remains current until installed-package acceptance checks pass. No action is required for existing users.
- The executable now explains how to install Evergreen WebView2 if it is missing, before it creates a clock window.

### 2026-10-29 - Keep the native entry point small

- [main.rs](../src/main.rs) now starts the library runtime in [lib.rs](../src/lib.rs), where command registration and startup order remain visible. Native features are grouped into modules under `src/`; no package configuration, capability, or user-data migration is required. No operator action is required.

## Fixed

### 2026-10-27 - Restore startup click-through in release builds

- The main window's native input style is checked again after it is shown, so click-through is available without a first Ctrl interaction. The Win32 style update keeps the layered transparent surface used by the earlier white-background fix. No operator action is required.

### 2026-10-25 - Prevent white background flash on click-through toggle

- Managed native click-through extended styles directly via Win32 `SetWindowLongPtrW` to preserve `WS_EX_LAYERED` while toggling `WS_EX_TRANSPARENT`. This prevents Windows DWM from falling back to an opaque GDI redirection surface when Ctrl is pressed.

### 2026-10-25 - Prevent Aero Snap bounce-back on clock window

- Configured `"maximizable": false` for the `main` window in [tauri.conf.json](../tauri.conf.json) to prevent Windows DWM from triggering Aero Snap and bouncing the borderless window back when dragged near the top or sides of the screen.

## Added

### 2026-10-29 - Runtime clock windows for connected displays

- Added Windows display target identity bindings and runtime clock windows for enabled displays. The configured main and Settings windows remain the startup anchors; secondary clock windows are created as displays connect. No operator action is required.

### 2026-10-27 - Built-in add-on and shortcut runtime

- The native package now persists validated add-on instances and Timer progress, restoring a running session after restart. Enabled action shortcuts use Windows-wide registration while the modifier continues to govern click-through. The package configuration and capability permissions did not need new entries. No operator action is required.

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
