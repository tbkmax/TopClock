# Rust application changelog

## Added

### 2026-10-25 - Release reminder command and auto-update setting

- Added `open_release_page` Tauri command in [main.rs](../main.rs) that opens the GitHub releases download page in the default web browser, eliminating internal dropper/updater code.
- Added `auto_check_updates` boolean setting (defaulting to true) to `ClockSettings` in [settings.rs](../settings.rs) with serde default fallback for existing config files.
- Added unit tests in `settings.rs` validating serialization and roundtrip of `auto_check_updates`.

### 2026-10-24 - Legacy settings migration

- Added automatic migration from legacy `%APPDATA%\com.maxtc.topclock\settings.json` to `%APPDATA%\topclock\settings.json` during setup if the new settings file does not yet exist.

### 2026-10-24 - Startup key name and tray tooltip update

- Updated [main.rs](../main.rs) registry Run key identifier from `OnTopClock` to `TopClock`.
- Updated system tray tooltip to `TopClock · Click for settings`.

### 2026-10-22 - Larger clock size range

- Accepted saved clock sizes up to 200 pixels and rejected larger values. No operator action is required.

### 2026-10-22 - Independent animation settings

- Persisted and validated separate colon and number change animation choices. Either can be set to None without disabling the other. Older settings files missing these fields reset to defaults. No operator action is required.

### 2026-10-22 - Installed font enumeration

- Added a command that lists font families installed in Windows for the Clock tab. No operator action is required.

### 2026-10-22 - Clock settings schema

- Added saved outline thickness, installed font name, time layout, AM/PM visibility and animation choice. Invalid values are rejected.
- Moved settings types and validation into `settings.rs` to keep native window behavior separate. Older files without the new fields reset to defaults; users can reapply preferences. No other operator action is required.

### 2026-10-22 - Folder documentation

- Added this folder's architecture, workflow, changelog and backlog documents for native behavior.
- No operator action is required.
