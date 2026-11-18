# Configuration changelog

### Changed

#### 2026-11-17 - Target one paired member from menu and palette

- `set_addon_enabled` now changes only the requested instance, including inside a pair. The Settings group control saves both flags through the existing `update_settings` path. Validation, session reconciliation, rollback, and settings events remain shared; no new saved field is required.

#### 2026-11-17 - Group configuration code and add folder documentation

- The same saved fields, validation, recovery, and Settings commands now have one source folder. Existing `settings.json` files and frontend command names require no user action.

Earlier configuration history remains in the [Rust application changelog](../../doc/changelog.md).
