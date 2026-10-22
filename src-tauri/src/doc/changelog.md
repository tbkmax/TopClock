# Rust application changelog

## Added

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
