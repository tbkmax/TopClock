# Settings workflows

The Settings component composes separate save, event, recovery, and preview helpers. The diagram describes module relationships; these names are JavaScript functions and Alpine state, not ES classes.

```mermaid
classDiagram
    class settingsApp {
        +init()
        +save()
        +destroy()
    }
    class createSettingsPersistence {
        +schedule(settings)
        +flush()
    }
    class subscribeSettingsEvents {
        +dispose()
    }
    class readAddonSessions {
        +read(invoke, fallback)
    }
    class createSettingsPreview {
        +refresh()
    }
    class createPreviewMethods {
        +updatePreview()
        +previewLayout()
        +previewStyle()
    }
    settingsApp --> createSettingsPersistence
    settingsApp --> subscribeSettingsEvents
    settingsApp --> readAddonSessions
    settingsApp --> createSettingsPreview
    settingsApp --> createPreviewMethods
```

[settings.js](../settings.js) supplies callbacks to [settings-events.js](../settings-events.js), so event names and registration stay together while page state remains in Alpine. It also supplies native readback to [settings-persistence.js](../settings-persistence.js); [settings-recovery.js](../settings-recovery.js) reads add-on sessions only after a failed write. [settings-preview.js](../settings-preview.js) composes its timer and rendering methods into the page without sharing preview animation state with the desktop clock.

```mermaid
sequenceDiagram
    participant UI as settingsApp
    participant Save as settings-persistence.js
    participant Rust as Tauri commands
    participant Clock as clock webviews
    UI->>Save: schedule(draft)
    Save->>Clock: clock-settings-preview(draft)
    Save->>Rust: update_settings(draft)
    alt Save succeeds
        Rust-->>UI: saved settings
    else Latest save fails
        Save->>Rust: get_settings
        alt Native settings differ from draft
            UI->>Rust: get_timer_state / get_progress_timer_states / get_counter_state
            UI->>UI: Restore native settings and available sessions
            Save->>Clock: clock-settings-preview(restored)
        end
    end
```

The save queue and revision check prevent an older failed write from replacing a newer draft. Native settings and sessions are durable; local preview and registration state are not. A Settings close flushes pending writes before hiding the window. See the [parent workflow](../../doc/workflow_diagram.md) for clock and tray interactions.
