# Native add-on architecture

This folder contains compiled add-on validation, session calculations, and the shared native action service. The [Rust application architecture](../../doc/architecture.md) owns startup, settings persistence, commands, and Win32 behavior.

| Module | Responsibility |
| --- | --- |
| [mod.rs](../mod.rs) | Internal compatibility re-exports and tests |
| [registry.rs](../registry.rs) | Static known-kind lookup, instance limits, and validator selection |
| [instance.rs](../instance.rs) | Serialized `AddonInstance`, IDs, order-independent common constraints, total limit |
| [date.rs](../date.rs), [region_clock.rs](../region_clock.rs) | Type options validation |
| [timer.rs](../timer.rs), [progress.rs](../progress.rs) | Type options, action application, and type-specific settings cleanup |
| [session.rs](../session.rs) | Existing `TimerSession` calculations and Progress duration lock |
| [actions.rs](../actions.rs) | Typed Timer/Progress target resolution, save rollback, and successful event publication |

The JSON field names, optional defaults, limits, and Timer migration remain unchanged. `timer_session` and `progress_timer_sessions` keep separate storage and event paths. [settings_commands.rs](../../settings_commands.rs) owns the settings transaction: it validates, asks type modules to reconcile cloned sessions, persists, rolls back on write failure, then emits. [config_store.rs](../../config_store.rs) still loads legacy settings and normalizes sessions; semantically invalid add-on data can still clear the add-on list, an existing recovery limitation.

[timer.rs](../../timer.rs) retains the public Tauri command functions and main-window completion monitor. Commands and global shortcuts enter [actions.rs](../actions.rs), which checks current target and enabled state, applies a typed action, persists, and emits only after success. Type helpers do not write the config independently. No new capabilities, network access, credential storage, plugin loader, or serialized schema is introduced.
