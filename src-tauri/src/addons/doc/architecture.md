# Native add-on architecture

[counter.rs](../counter.rs) keeps the existing `CounterSession` command/event shape and validates an enabled singleton. [counter_db.rs](../counter_db.rs) owns the signed balance, open run, reset epoch, transition events, and read-only run query in `topclock.db`. Count up/down and Stop commit state, run, and event in one SQLite transaction before `counter-state-changed` is emitted. A confirmed Reset deletes every Counter run and event, zeros the singleton state, and advances the epoch in one transaction. The state retains the latest Reset action ID to avoid repeating that deletion. The database imports the old JSON balance once, without inventing earlier runs. On an unclean restart it closes an abandoned run at the last durable checkpoint with zero additional measured time. [config commands](../../config/commands.rs) coordinates an explicit disable with the JSON settings save; removing the add-on leaves Counter running or stopped as it was. `stop_on_quit` records a final stopped value before exit. Timer and Progress remain in JSON and retain their separate behavior. Counter instance options stay empty and the app-wide glow intensity stays in `ClockSettings`.


[actions.rs](../actions.rs) also owns Timer mode and preset transactions. The mode operation accepts either compiled mode and resets a running or elapsed Timer after confirmation; the preset operation accepts a minute value only from `timer_countdown_presets` and only in countdown mode, then resets and starts. Each warning has its own saved dismissal flag. Both restore settings and the singleton Timer session on write failure and broadcast settings and Timer state on success. [config model](../../config/model.rs) defaults the Timer fields for old files; [configuration validation](../../config/validation.rs) checks both Timer and Progress lists through one helper.

The serialized [AddonPair](../instance.rs) holds two adjacent instance IDs and a shared size percentage; it does not own type options, sessions, enabled state, or actions. `valid_pairs` allows Date, Region clock, Timer, and Counter members with identical placement and independent enabled flags, and enforces unique membership. Progress remains ineligible. The parent [settings loader](../../config/store.rs) can dissolve stale links while keeping both flat instances; normal settings saves reject invalid links.

[actions.rs](../actions.rs) now owns the atomic Progress preset restart in addition to toggle/reset. It accepts only an enabled countdown ID and a value from shared `ClockSettings.progress_countdown_presets`, requires confirmation when a session is running or has elapsed time unless warnings are dismissed, resets and starts that one session, and saves the duration and optional dismissal in the same config write. A write failure restores prior settings and the selected session; success emits settings and Progress-session events. Other IDs and the numeric Timer are unaffected.

This folder contains compiled add-on validation, session calculations, and the shared native action service. The [Rust application architecture](../../doc/architecture.md) owns startup, settings persistence, commands, and Win32 behavior.

| Module | Responsibility |
| --- | --- |
| [mod.rs](../mod.rs) | Internal compatibility re-exports and tests |
| [registry.rs](../registry.rs) | Static known-kind lookup, instance limits, and validator selection |
| [instance.rs](../instance.rs) | Serialized `AddonInstance` and optional `AddonPair`, IDs, common constraints, pair invariants, total limit |
| [date.rs](../date.rs), [region_clock.rs](../region_clock.rs) | Type options validation |
| [timer.rs](../timer.rs), [progress.rs](../progress.rs) | Type options, action application, and type-specific settings cleanup |
| [counter.rs](../counter.rs) | Counter command/event adapter, legacy session shape, and quit stop |
| [counter_db.rs](../counter_db.rs) | SQLite schema, migration, transactional state and history, monotonic interval measurement |
| [session.rs](../session.rs) | Existing `TimerSession` calculations and Progress duration lock |
| [actions.rs](../actions.rs) | Typed Timer/Progress target resolution, save rollback, and successful event publication |
| [runtime.rs](../runtime.rs) | Tauri Timer and Progress command adapters and completion checks called by the clock input monitor |

The JSON field names, optional defaults, limits, and Timer migration remain unchanged except that `counter_session` is read only for first database import and omitted from new JSON writes. `timer_session` and `progress_timer_sessions` keep separate storage and event paths. [config commands](../../config/commands.rs) owns the settings transaction: it validates, reconciles Timer and Progress, coordinates a Counter stop when disabled, and emits after durable success. [config store](../../config/store.rs) still loads legacy settings and normalizes sessions; semantically invalid add-on data can still clear the add-on list, an existing recovery limitation.

[runtime.rs](../runtime.rs) retains the public Tauri command functions and main-window completion monitor. Commands and global shortcuts enter [actions.rs](../actions.rs), which checks current target and enabled state, applies a typed action, persists, and emits only after success. Type helpers do not write the config independently. No network access, credential storage, or plugin loader is introduced. The Timer preset fields extend the saved settings schema with defaults for older files.
