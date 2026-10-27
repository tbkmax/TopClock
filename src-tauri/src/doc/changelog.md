# Rust application changelog

## Fixed

### 2026-10-27 - Apply click-through on first visible monitor pass

- The clock now reconciles its native click-through style immediately after showing the window, so a newly launched build does not require a Ctrl interaction before clicks pass through. Style changes also refresh the Windows frame while retaining `WS_EX_LAYERED`, preserving the earlier first-Ctrl white-background fix. No operator action is required.

### 2026-10-25 - Direct Win32 click-through toggle preserving layered window style

- Replaced Tao's `window.set_ignore_cursor_events` with direct Win32 `SetWindowLongPtrW` extended style modification (`set_click_through`), preserving `WS_EX_LAYERED` while toggling only `WS_EX_TRANSPARENT`. This prevents Windows DWM from falling back to an opaque white GDI redirection bitmap when Ctrl is pressed.
- Set `WEBVIEW2_DEFAULT_BACKGROUND_COLOR` to `0` at application start to ensure WebView2 default backing surface is transparent.

## Added

### 2026-10-27 - Optional Date and Region display settings

- Added validation for Date weekday and Region label switches while keeping earlier add-on records valid. The minimum saved size is now 10%, and newly migrated legacy Timers start at 30%. Existing saved add-on sizes are not changed. No operator action is required.

### 2026-10-27 - Add-on persistence, Timer sessions and optional global shortcuts

- Added a validated ordered add-on list for Date, multiple Region clocks and Timer in [addons.rs](../addons.rs) and [settings.rs](../settings.rs). Existing enabled Timer settings migrate to a Countdown instance; malformed add-on data can be discarded while preserving valid clock appearance.
- Added durable Timer Start/Pause, Reset, resume-after-restart and countdown completion state. Timer state is separate from add-on appearance and broadcasts `timer-state-changed`.
- Added per-action enable switches, off by default, and system-wide Windows hotkey registration in [hotkeys.rs](../hotkeys.rs). Registration failures are shown in Settings. The configured interaction modifier remains active. The default Quit binding changes to `Ctrl+Alt+Q`; older `Ctrl+Q` defaults migrate. No operator action is required.

### 2026-10-26 - Shortcut settings and configurable interaction modifier

- Added `ShortcutSettings` to `ClockSettings` in [settings.rs](../settings.rs) with serde default fallbacks for `interaction_modifier` ("Ctrl"), `open_settings` ("Ctrl+,"), `quit` ("Ctrl+Q"), `timer_toggle` ("Ctrl+Shift+S"), and `timer_reset` ("Ctrl+Shift+R").
- Added validation for `interaction_modifier` (accepting "Ctrl", "Alt", or "Shift") and shortcut string length/control character limits.
- Updated `start_monitor` in [main.rs](../main.rs) to poll the dynamically configured modifier virtual key code (`VK_CONTROL`, `VK_MENU`, or `VK_SHIFT`) via `GetAsyncKeyState`.
- Added unit tests in `settings.rs` validating shortcut serialization round-trip, empty string acceptance (no shortcut), and invalid modifier rejection.

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
