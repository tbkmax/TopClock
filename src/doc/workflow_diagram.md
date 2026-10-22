# Frontend workflows

Both UI components are Alpine component objects. This diagram shows their relationship to the native command boundary.

```mermaid
classDiagram
    class clockApp {
      settings
      parts
      isCtrlHeld
      isNear
      updateClock()
      toggleFormat()
      scheduleResize()
    }
    class settingsApp {
      settings
      previewParts
      pendingSaves
      save()
      queueSave()
    }
    class TauriCommands {
      get_settings()
      get_font_families()
      update_settings()
      set_startup_enabled()
    }
    clockApp --> TauriCommands : invoke
    settingsApp --> TauriCommands : invoke
```

These names map to [main.js](../main.js), [settings.js](../settings.js), and the command registrations in [main.rs](../../src-tauri/src/main.rs). Both UI components call the shared `timeParts` function in [time-format.js](../time-format.js), which leaves hours unpadded and keeps minutes and seconds at two digits, then `markChangedNumbers` in [clock-animations.js](../clock-animations.js). The tracker compares each displayed hour, minute and second with its previous value. [style.css](../style.css) sizes clock segments to their text, keeping a one-digit hour beside the colon. CSS applies the chosen number effect to changed parts and the chosen colon effect to separators independently. `TauriCommands` represents the command interface, not a source class.

```mermaid
sequenceDiagram
    participant User
    participant Settings as settingsApp
    participant Clock as clockApp
    participant Rust
    User->>Settings: Choose colon or number animation
    Settings->>Clock: clock-settings-preview
    Settings->>Settings: Debounce and queue save
    Settings->>Rust: update_settings
    alt Saved
        Rust->>Clock: clock-settings-changed
    else Failed
        Rust-->>Settings: Error to display
    end
```

On initialization, `settingsApp` calls `get_font_families` before enabling the font select; [fonts.rs](../../src-tauri/src/fonts.rs) reads the Windows font table. The sequence above follows [settings.js](../settings.js) after a control changes. `clockApp` applies both preview and saved settings in [main.js](../main.js), then measures the rendered text and container height and resizes the clock window in both dimensions when needed. It adjusts the window's left edge to keep the right edge in place. The Settings preview scales fonts above 64 pixels down to fit its card. The native side owns durability; see [Rust workflow](../../src-tauri/src/doc/workflow_diagram.md).
