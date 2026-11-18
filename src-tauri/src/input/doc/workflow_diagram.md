# Native input workflow

The two monitors run independently and read shared settings. The [parent workflow](../../doc/workflow_diagram.md) covers application startup.

## Ownership

```mermaid
classDiagram
    class ClockState {
      config
      hotkey_errors
      active_displays
    }
    class ShortcutSettings {
      interaction_modifier
      palette_key
    }
    class WebviewWindow {
      label
    }
    ClockState --> ShortcutSettings : saved config
    WebviewWindow --> ClockState : monitor reads settings
```

[state.rs](../../state.rs) owns runtime state; [config/model.rs](../../config/model.rs) owns the saved keys. Each clock has an [interaction monitor](../interaction.rs); the [palette monitor](../palette.rs) is application-wide.

## Clock modifier and click-through

```mermaid
sequenceDiagram
    participant Key as Windows input
    participant Monitor as interaction.rs
    participant Window as Clock HWND
    participant Config as ClockState.config
    Key->>Monitor: Modifier and cursor sample
    Monitor->>Config: Read configured modifier
    Monitor->>Window: Compare actual click-through style
    alt Style differs from desired state
        Monitor->>Window: Set WS_EX_TRANSPARENT state
    end
    Monitor-->>Window: ctrl-state and proximity events
    opt Position settles after drag
        Monitor->>Config: Save display-relative position
    end
```

The monitor also invokes Timer completion checks. Menu dismissal and palette cancellation have their own paths in [interaction.rs](../interaction.rs) and [palette.rs](../palette.rs); the diagram focuses on the clock's pass-through invariant.
