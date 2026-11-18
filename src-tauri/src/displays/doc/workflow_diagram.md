# Display workflow

The display manager connects durable per-display preferences with transient clock windows. See the [parent workflow](../../doc/workflow_diagram.md) for application startup.

## Display records

```mermaid
classDiagram
    class DisplayInfo {
      id
      name
      primary
      enabled
      bounds
    }
    class ActiveDisplay {
      label
      bounds
    }
    class DisplayPreference {
      visible
      position
    }
    class ClockState {
      active_displays
      main_display_id
    }
    ClockState --> ActiveDisplay : current windows
    DisplayInfo --> DisplayPreference : ID selects saved choice
```

[mod.rs](../mod.rs) defines discovered and active records; [config/model.rs](../../config/model.rs) defines the durable preference. `ActiveDisplay` is not serialized.

## Reconcile connected monitors

```mermaid
sequenceDiagram
    participant Poll as manager.rs
    participant Discovery as discovery.rs
    participant State as ClockState
    participant Window as Clock Webview
    Poll->>Discovery: Enumerate monitors and saved visibility
    Discovery-->>Poll: DisplayInfo list
    Poll->>State: Compare active display map
    alt Disconnected or disabled
        Poll->>Window: Hide main or destroy secondary
        Poll->>State: Remove active record
    else Newly enabled
        Poll->>Window: Create or reuse, set click-through, position, show
        Poll->>State: Add active record
    else Bounds changed
        Poll->>Window: Restore saved relative position
        Poll->>State: Update bounds
    end
```

[manager.rs](../manager.rs) performs this loop; [positions.rs](../positions.rs) handles user-requested visibility and reset saves. The diagram omits unchanged displays and the emitted `displays-changed` event.
