# Frontend workflows

Both UI components are Alpine component objects. This diagram shows their relationship to the native command boundary.

```mermaid
classDiagram
    class clockApp {
      settings
      isCtrlHeld
      isNear
      updateClock()
      toggleFormat()
    }
    class settingsApp {
      settings
      pendingSaves
      save()
      queueSave()
    }
    class TauriCommands {
      get_settings()
      update_settings()
      set_startup_enabled()
    }
    clockApp --> TauriCommands : invoke
    settingsApp --> TauriCommands : invoke
```

These names map to [main.js](../main.js), [settings.js](../settings.js), and the command registrations in [main.rs](../../src-tauri/src/main.rs). `TauriCommands` represents the command interface, not a source class.

```mermaid
sequenceDiagram
    participant User
    participant Settings as settingsApp
    participant Clock as clockApp
    participant Rust
    User->>Settings: Change clock control
    Settings->>Clock: clock-settings-preview
    Settings->>Settings: Debounce and queue save
    Settings->>Rust: update_settings
    alt Saved
        Rust->>Clock: clock-settings-changed
    else Failed
        Rust-->>Settings: Error to display
    end
```

The sequence follows [settings.js](../settings.js). `clockApp` applies both preview and saved settings in [main.js](../main.js). The native side owns durability; see [Rust workflow](../../src-tauri/src/doc/workflow_diagram.md).
