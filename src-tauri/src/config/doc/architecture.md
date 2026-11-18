# Configuration architecture

This folder owns the saved `settings.json` shape, validation, load recovery, and Settings commands. See the [Rust application architecture](../../doc/architecture.md) for startup and cross-folder ownership.

| File | Responsibility |
| --- | --- |
| [model.rs](../model.rs) | `ClockSettings`, `ShortcutSettings`, display preferences, session-containing `PersistedConfig`, Serde defaults, and the legacy Timer flag |
| [validation.rs](../validation.rs) | Settings, shortcut, preset, and add-on constraints applied to user saves and loaded settings |
| [store.rs](../store.rs) | Legacy path copy, JSON recovery, add-on/session normalization, and file writing |
| [commands.rs](../commands.rs) | Tauri Settings commands, shared settings-change transaction, rollback, and change events |
| [tests.rs](../tests.rs) | Serialization, default, validation, and compatibility tests |
| [mod.rs](../mod.rs) | Module declarations; no persisted state |

`PersistedConfig` flattens `ClockSettings` into the existing top-level JSON object. It also stores per-display positions and Timer, Progress, and Counter sessions. These field names and defaults are a compatibility boundary with existing files and the frontend. Add-on-specific rules remain in [addons](../../addons/doc/architecture.md); physical monitor and window management remain in [displays](../../displays/doc/architecture.md). The targeted `set_addon_enabled` command changes one instance, even when paired; the ordinary `update_settings` transaction saves the Settings group switch's two changed flags together. Both paths retain validation, rollback, and event publication.

On startup, `store::load_config` reads or recovers the file, applies legacy migrations, validates settings, and normalizes sessions. `lib.rs` manages the resulting config in `ClockState`. `commands::update_settings` and `set_addon_enabled` validate under the config lock, reconcile affected sessions, save once, restore memory if saving fails, then publish events after success. Other domains currently call `store::save_config` for their own state changes; the store accepts a file path and persisted config without importing runtime state.

There is no authentication or network service in this folder. The Tauri command boundary accepts settings from webviews and validates them before writing. File writes use `fs::write`; callers hold the config mutex when modifying and saving shared state. Startup recovery and user-initiated failure handling are different, as described in the [parent workflow](../../doc/workflow_diagram.md).
