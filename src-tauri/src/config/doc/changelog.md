# Configuration changelog

### Changed

#### 2026-11-19 - Coordinate Counter disable with database state

- A settings change that disables a running Counter now stages a SQLite Stop, replaces JSON, then commits the Stop. JSON writes use a synced temporary file. The old `counter_session` field is still read for first import but is no longer written. Existing settings migrate automatically; an older binary cannot read the new Counter balance after downgrade.

#### 2026-11-17 - Target one paired member from menu and palette

- `set_addon_enabled` now changes only the requested instance, including inside a pair. The Settings group control saves both flags through the existing `update_settings` path. Validation, session reconciliation, rollback, and settings events remain shared; no new saved field is required.

#### 2026-11-17 - Group configuration code and add folder documentation

- The same saved fields, validation, recovery, and Settings commands now have one source folder. Existing `settings.json` files and frontend command names require no user action.

Earlier configuration history remains in the [Rust application changelog](../../doc/changelog.md).
