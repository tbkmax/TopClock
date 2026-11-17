# Native add-on workflows

## Counter state and normal quit

```mermaid
sequenceDiagram
    participant UI as Menu or Settings
    participant Rust as counter.rs
    participant Disk as settings.json
    participant Windows as All webviews
    UI->>Rust: counter_action(action, confirmed_reset)
    Rust->>Rust: Validate enabled Counter and apply signed state
    Rust->>Disk: Save session
    alt Save fails
        Rust->>Rust: Restore old session
        Rust-->>UI: Error
    else Save succeeds
        Rust-->>Windows: counter-state-changed
    end
    UI->>Rust: Quit through common helper
    Rust->>Disk: Save stopped current balance
    Rust->>Rust: Exit only after successful Counter save
```

[counter.rs](../counter.rs) provides the signed transition and transaction; [window_commands.rs](../../window_commands.rs) supplies the common quit helper for menu, tray, and shortcut entry points. [lib.rs](../../lib.rs) also checkpoints a running Counter on another Tauri exit request. If the process terminates without an exit request, [config_store.rs](../../config_store.rs) loads the last saved checkpoint stopped rather than counting closed-app time. The diagram omits separate position persistence, which remains in the quit helper.

Removing Counter through Settings changes only the add-on list. Its separate session keeps its balance and continues running if it was running; adding Counter again exposes that session. An explicit disable stops it while retaining the balance. The quit helper stops a running session even when the Counter add-on is absent.


For a Timer mode or preset choice, [actions.rs](../actions.rs) rechecks the enabled Timer and session under the config lock, then requires confirmation if a running or elapsed session would be discarded unless that choice's warning was dismissed. A mode choice writes the new mode and an idle session; a preset choice writes its duration and a running session. If saving fails, prior settings and Timer session are restored with no event. Success emits both settings and Timer session events. Progress continues using its per-ID transaction and session map.

## Pair validation

```mermaid
classDiagram
    class ClockSettings {
      addons
      addon_pairs
    }
    class AddonInstance {
      id
      kind
      enabled
      placement
      size_percent
    }
    class AddonPair {
      left_id
      right_id
      size_percent
    }
    ClockSettings --> AddonInstance : ordered flat list
    ClockSettings --> AddonPair : optional pair links
    AddonPair --> AddonInstance : two adjacent IDs
```

[instance.rs](../instance.rs) validates pair references, eligibility (Date, Region clock, Timer, or Counter), placement, enabled state, scale, and uniqueness before a settings save. Progress remains ineligible. [config_store.rs](../../config_store.rs) keeps valid flat instances when pair links are stale after loading. Pair metadata is durable; row rendering is derived in the frontend, while Counter's session remains separate.

The Progress preset action reads the selected instance and shared preset list under one config lock, checks whether an existing session needs confirmation, then writes its option duration and new running session together. On write failure it restores the prior settings and session and emits nothing. On success it broadcasts the settings snapshot and all Progress sessions; the frontend's single reactive host updates Start/Pause labels by instance ID.

```mermaid
classDiagram
    class AddonInstance {
      id: String
      kind: String
      enabled: bool
      placement: String
      size_percent: u8
      options: Value
    }
    class AddonKind {
      Date
      RegionClock
      Timer
      Progress
      Counter
      valid_options()
    }
    class TimerSession {
      running: bool
      elapsed_ms: u64
      started_at_ms: Option~u64~
      finished: bool
      has_started: bool
      normalize()
      toggle()
      toggle_progress()
    }
    class ActionTarget {
      Timer
      Progress
    }
    class CounterSession {
      value_ms: i64
      running: bool
      direction: i8
      started_at_ms: Option~u64~
      stop()
      start()
    }
    AddonInstance --> AddonKind : validated by
    ActionTarget --> TimerSession : selects session
    AddonKind --> CounterSession : Counter has independent session
```

These names correspond to [instance.rs](../instance.rs), [registry.rs](../registry.rs), [session.rs](../session.rs), and [actions.rs](../actions.rs). The diagram omits persistence, which remains in the application service.

```mermaid
sequenceDiagram
    participant Entry as Tauri command or hotkey
    participant Service as actions.rs
    participant Type as timer.rs or progress.rs
    participant Store as config_store.rs
    participant UI as All webviews
    Entry->>Service: Typed target and toggle/reset
    Service->>Service: Resolve current enabled instance
    alt Invalid target or action
        Service-->>Entry: Error, no mutation
    else Valid
        Service->>Type: Apply session calculation
        Service->>Store: Save configuration
        alt Write fails
            Service->>Service: Restore previous session
            Service-->>Entry: Error
        else Write succeeds
            Service->>UI: Existing timer/progress event
            Service-->>Entry: Saved session
        end
    end
```

[settings_commands.rs](../../settings_commands.rs) separately asks type modules to reconcile cloned sessions before replacing durable settings. Disabling Progress retains its countdown session; removing, changing mode, or changing duration can remove it. Timer uses its existing different reset rules. The [parent workflow](../../doc/workflow_diagram.md) covers load recovery and settings broadcasts.
