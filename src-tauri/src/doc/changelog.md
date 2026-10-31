# Rust application changelog

## Added

### 2026-10-30 - Persist independent Progress countdown sessions

- Progress accepts a countdown duration per instance and stores sessions by add-on ID, separate from the numeric Timer. Native commands start, pause, reset, restore, and finish those sessions; state changes reach all clock windows and Settings. Invalid durations are rejected, and removed or changed countdowns discard their old session. Older settings files load with an empty session map. Live Windows interaction verification remains open.

### 2026-10-30 - Validate repeatable Progress add-ons

- Saved settings now accept multiple Progress instances with date or daily-time mode, valid date bounds, ordered same-day time ranges, and an auto-hide flag. Invalid options are rejected without changing other settings. Existing saved add-ons need no migration; live Windows behavior still needs review.

### 2026-10-29 - Request published updates from Microsoft Store

- Packaged Settings can now query available Store packages and ask Windows to download and install an update with the Settings window as dialog owner. Direct builds reject these commands and keep the GitHub browser reminder. Store-signed installation remains to be tested; no settings migration is required.

### 2026-10-29 - Persisted language and Windows UI language detection

- Existing settings files now default to System language; users can save English, Simplified Chinese, Traditional Chinese, or Japanese. The tray Quit label and tooltip follow that choice, and direct and MSIX builds read the Windows UI language for System default. No user action is required.

## Changed

### 2026-10-30 - Accept optional Progress appearance settings

- Saved Progress instances may now include a percentage switch and independent bar length and thickness values. Older instances without these fields still load; invalid values are rejected. No migration or user action is required.

### 2026-10-29 - Explain a missing WebView2 Runtime

- TopClock checks for Evergreen WebView2 before creating windows. If missing, a native message directs the user to Microsoft's runtime download page and the app exits. This adds no bundled runtime. No action is required where WebView2 is installed; clean Windows 10 behavior still needs verification.

### 2026-10-29 - Route sign-in and release actions by package identity

- MSIX builds now use the declared Windows StartupTask for the sign-in switch, including Windows' user-disabled state. Direct builds keep the Run key. Packaged builds cannot open the GitHub installer release page. The saved settings schema and native clock behavior are unchanged. No action is required for direct-build users; installed MSIX behavior still needs validation.

### 2026-10-29 - Separate native runtime responsibilities

- The binary entry point now delegates to a library runtime. Settings persistence, display windows, input monitoring, Timer actions, commands, startup registry handling, and tray setup have separate Rust modules. Command and event names, saved settings, and clock behavior are unchanged. No operator action is required.

## Fixed

### 2026-10-29 - Preserve saved positions beyond display edges

- Restoring a display clock no longer pushes a saved origin back inside monitor bounds. This keeps intentionally placed edge positions when reopening or reconnecting a display. No operator action is required.

### 2026-10-27 - Apply click-through on first visible monitor pass

- The clock now reconciles its native click-through style immediately after showing the window, so a newly launched build does not require a Ctrl interaction before clicks pass through. Style changes also refresh the Windows frame while retaining `WS_EX_LAYERED`, preserving the earlier first-Ctrl white-background fix. No operator action is required.

### 2026-10-25 - Direct Win32 click-through toggle preserving layered window style

- Replaced Tao's `window.set_ignore_cursor_events` with direct Win32 `SetWindowLongPtrW` extended style modification (`set_click_through`), preserving `WS_EX_LAYERED` while toggling only `WS_EX_TRANSPARENT`. This prevents Windows DWM from falling back to an opaque white GDI redirection bitmap when Ctrl is pressed.
- Set `WEBVIEW2_DEFAULT_BACKGROUND_COLOR` to `0` at application start to ensure WebView2 default backing surface is transparent.

## Added

### 2026-10-29 - Center visible clock windows

- Added a Clock-tab command that centers each visible clock on its own display and saves the new positions. Disabled displays keep their prior positions and visibility. A failed move or save is reported to Settings. No operator action is required.

### 2026-10-29 - Per-display clock windows and positions

- TopClock now creates a clock on every connected desktop display by default, detects connected and removed displays, and persists visibility and position for each display independently. Windows display target paths are used as identities with a display-slot fallback. Existing single-clock positions migrate to the matching display. Appearance, add-ons, Timer and shortcuts remain shared. No operator action is required.

### 2026-10-29 - Open settings folder

- Added a native command that opens the directory containing TopClock's settings file in Explorer for the General tab. It creates the directory if needed and reports launch errors. No operator action is required.

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
