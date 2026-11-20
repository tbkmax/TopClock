# Configuration workflow

The model is durable; `ClockState` owns its in-process copy. See the [parent workflow](../../doc/workflow_diagram.md) for application startup and other command paths.

## Ownership

```mermaid
classDiagram
    class PersistedConfig {
      settings
      displays
      timer_session
      progress_timer_sessions
      legacy_counter_session
    }
    class ClockSettings {
      shortcuts
      addons
      addon_pairs
    }
    class ClockState {
      config
      settings_path
      counter_db
    }
    ClockState --> PersistedConfig : mutex-protected copy
    PersistedConfig --> ClockSettings : flattened in JSON
```

[model.rs](../model.rs) defines the saved types; [state.rs](../../state.rs) owns the mutex and path. The diagram omits fields not needed to show ownership.

## Settings save

```mermaid
sequenceDiagram
    participant UI as Webview
    participant Command as commands.rs
    participant State as ClockState.config
    participant Disk as settings.json
    participant Counter as topclock.db
    UI->>Command: update_settings or set_addon_enabled
    Command->>State: Lock, validate, reconcile Timer/Progress
    alt Invalid change
        Command-->>UI: Error without write
    else Valid change
        opt Disabling a running Counter
            Command->>Counter: Stage Stop in SQLite transaction
        end
        Command->>Disk: Replace settings.json
        alt Write fails
            Command->>Counter: Roll back staged Stop
            Command->>State: Restore prior settings and sessions
            Command-->>UI: Error
        else Write succeeds
            Command->>Counter: Commit staged Stop if present
            Command-->>UI: Settings and changed events after commit
        end
    end
```

[commands.rs](../commands.rs) emits after successful writes. A database commit failure after JSON replacement attempts to restore prior JSON; startup recovery closes any abandoned run at the last durable balance after a crash. [store.rs](../store.rs) reads legacy Counter JSON only for database import. There is no authorization step beyond existing Tauri command permissions described by the [package architecture](../../../doc/architecture.md).

`set_addon_enabled` targets one ID even when it belongs to an `AddonPair`; `update_settings` accepts both changed flags from the Settings group control. Both use the sequence above. Mixed enabled flags pass pair validation, and disabling a Timer or Counter still follows its own session reconciliation rule.
