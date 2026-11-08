# Native add-on workflows

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
    AddonInstance --> AddonKind : validated by
    ActionTarget --> TimerSession : selects session
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
