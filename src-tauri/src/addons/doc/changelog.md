# Native add-on changelog

## Added

### 2026-11-09 - Validate optional two-member layout links

- Pair records reference existing adjacent eligible instances, preserve the original add-on schema, and enforce one shared switch state. Old files need no migration; stale links are dissolved without removing their members.

### 2026-11-08 - Restart one Progress countdown from a shared preset

- Added a native action that validates the target and preset, asks for confirmation through the caller when progress would be cleared, and atomically persists the selected instance's new duration and running session. Settings and session events refresh all windows.

### 2026-11-07 - Create this folder's documentation

- Added architecture, workflow, changelog, and backlog documents for native add-on modules.

## Changed

### 2026-11-07 - Separate native validators and action service

- Built-in options and session rules now have named modules, while Timer commands and shortcuts route through one typed action service. Saved fields, command names, events, rollback, and existing cleanup behavior remain compatible. No user migration is required.
