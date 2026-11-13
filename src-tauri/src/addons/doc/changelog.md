# Native add-on changelog

### 2026-11-12 - Keep Counter state after removal

- Removing the Counter display now retains its separate signed session, including a running direction. Re-adding Counter reveals the continued balance; explicit disable still stops it, and normal Quit still checkpoints and stops it. No settings migration is required.

### 2026-11-12 - Validate Counter pairs

- Native settings validation now accepts a Counter paired with Date, Region clock, or Timer in either position. Progress remains ineligible, and pairing does not alter Counter, Timer, or Progress sessions. No saved settings migration is required.


### 2026-11-12 - Persist an independent signed Counter

- Added a singleton Counter session with signed balance, direction changes, Stop, and confirmed Reset. Normal Quit saves and stops its current balance; startup does not count time while the app was closed. Existing Timer and Progress sessions remain separate. No migration action is required for older settings.


## Added

### 2026-11-10 - Validate and save Timer menu choices

- A running Timer can change mode after confirmation and reset to idle; a countdown preset resets and starts it. Both commands validate current state under the config lock, save once, and emit settings and Timer events only after success. Timer and Progress preset lists remain separate.

### 2026-11-09 - Validate optional two-member layout links

- Pair records reference existing adjacent eligible instances, preserve the original add-on schema, and enforce one shared switch state. Old files need no migration; stale links are dissolved without removing their members.

### 2026-11-08 - Restart one Progress countdown from a shared preset

- Added a native action that validates the target and preset, asks for confirmation through the caller when progress would be cleared, and atomically persists the selected instance's new duration and running session. Settings and session events refresh all windows.

### 2026-11-07 - Create this folder's documentation

- Added architecture, workflow, changelog, and backlog documents for native add-on modules.

## Changed

### 2026-11-07 - Separate native validators and action service

- Built-in options and session rules now have named modules, while Timer commands and shortcuts route through one typed action service. Saved fields, command names, events, rollback, and existing cleanup behavior remain compatible. No user migration is required.
