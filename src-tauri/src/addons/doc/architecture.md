# Native add-on architecture

[actions.rs](../actions.rs) also owns Timer mode and preset transactions. The mode operation accepts either compiled mode and resets a running or elapsed Timer after confirmation; the preset operation accepts a minute value only from `timer_countdown_presets` and only in countdown mode, then resets and starts. Each warning has its own saved dismissal flag. Both restore settings and the singleton Timer session on write failure and broadcast settings and Timer state on success. [settings.rs](../../settings.rs) defaults the new Timer fields for old files and validates both Timer and Progress lists through one helper.

The serialized [AddonPair](../instance.rs) holds two adjacent instance IDs and a shared size percentage; it does not own type options, sessions, or actions. `valid_pairs` requires Date, Region clock, or Timer members, identical placement and enabled state, and unique membership. The parent [settings loader](../../config_store.rs) can dissolve stale links while keeping both flat instances; normal settings saves reject invalid links.

[actions.rs](../actions.rs) now owns the atomic Progress preset restart in addition to toggle/reset. It accepts only an enabled countdown ID and a value from shared `ClockSettings.progress_countdown_presets`, requires confirmation when a session is running or has elapsed time unless warnings are dismissed, resets and starts that one session, and saves the duration and optional dismissal in the same config write. A write failure restores prior settings and the selected session; success emits settings and Progress-session events. Other IDs and the numeric Timer are unaffected.

This folder contains compiled add-on validation, session calculations, and the shared native action service. The [Rust application architecture](../../doc/architecture.md) owns startup, settings persistence, commands, and Win32 behavior.

| Module | Responsibility |
| --- | --- |
| [mod.rs](../mod.rs) | Internal compatibility re-exports and tests |
| [registry.rs](../registry.rs) | Static known-kind lookup, instance limits, and validator selection |
| [instance.rs](../instance.rs) | Serialized `AddonInstance` and optional `AddonPair`, IDs, common constraints, pair invariants, total limit |
| [date.rs](../date.rs), [region_clock.rs](../region_clock.rs) | Type options validation |
| [timer.rs](../timer.rs), [progress.rs](../progress.rs) | Type options, action application, and type-specific settings cleanup |
| [session.rs](../session.rs) | Existing `TimerSession` calculations and Progress duration lock |
| [actions.rs](../actions.rs) | Typed Timer/Progress target resolution, save rollback, and successful event publication |

The JSON field names, optional defaults, limits, and Timer migration remain unchanged. `timer_session` and `progress_timer_sessions` keep separate storage and event paths. [settings_commands.rs](../../settings_commands.rs) owns the settings transaction: it validates, asks type modules to reconcile cloned sessions, persists, rolls back on write failure, then emits. [config_store.rs](../../config_store.rs) still loads legacy settings and normalizes sessions; semantically invalid add-on data can still clear the add-on list, an existing recovery limitation.

[timer.rs](../../timer.rs) retains the public Tauri command functions and main-window completion monitor. Commands and global shortcuts enter [actions.rs](../actions.rs), which checks current target and enabled state, applies a typed action, persists, and emits only after success. Type helpers do not write the config independently. No new capabilities, network access, credential storage, or plugin loader is introduced. The Timer preset fields extend the saved settings schema with defaults for older files.
