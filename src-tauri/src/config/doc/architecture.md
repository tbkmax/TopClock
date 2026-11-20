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

`PersistedConfig` flattens `ClockSettings` into the existing top-level JSON object. It stores per-display positions and Timer/Progress sessions. The legacy `counter_session` field is accepted for one-time [database import](../../addons/counter_db.rs) but omitted from new JSON writes; the Counter database is authoritative after import. Add-on-specific rules remain in [addons](../../addons/doc/architecture.md); physical monitor and window management remain in [displays](../../displays/doc/architecture.md). The targeted `set_addon_enabled` command changes one instance, even when paired; `update_settings` saves a Settings group switch's two flags together.

On startup, `store::load_config` reads or recovers the file, applies legacy migrations, validates settings, and normalizes sessions. `lib.rs` opens the Counter database before rewriting JSON. `commands::update_settings` and `set_addon_enabled` validate under the config lock and reconcile Timer/Progress. If a disabled Counter is running, they stage its stop in SQLite, save JSON, then commit SQLite before publishing events. A JSON failure rolls back SQLite; a SQLite commit failure attempts to restore prior JSON. Startup closes any abandoned database run at the last checkpoint, including a crash between the two files. Other domains still call `store::save_config`; it now writes and syncs a temporary file before replacing `settings.json`.

There is no authentication or network service in this folder. The Tauri command boundary accepts settings from webviews and validates them before writing. Callers hold the config mutex when modifying and saving shared state. JSON and SQLite are separate files and cannot commit atomically; startup recovery and user-initiated failure handling are described in the [parent workflow](../../doc/workflow_diagram.md).
