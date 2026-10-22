# Rust workflows

The core Rust types in [settings.rs](../settings.rs) and [main.rs](../main.rs) own durable configuration and live window state.

```mermaid
classDiagram
    class ClockState {
      menu_open: AtomicBool
      config: Mutex~PersistedConfig~
      settings_path: PathBuf
    }
    class PersistedConfig {
      settings: ClockSettings
      position: Option~ClockPosition~
    }
    class ClockSettings {
      colon_animation: String
      number_animation: String
      font_color: String
      outline_color: String
      outline_width: f32
      font_size: u8
      font_family: String
      twenty_four_hour: bool
      show_ampm: bool
      time_layout: String
    }
    class ClockPosition {
      x: i32
      y: i32
    }
    ClockState --> PersistedConfig : owns
    PersistedConfig --> ClockSettings : includes
    PersistedConfig --> ClockPosition : optional
```

Names and fields match [settings.rs](../settings.rs) and [main.rs](../main.rs). The config is written to `settings.json`; `menu_open` is in-memory only.

```mermaid
sequenceDiagram
    participant UI as Settings UI
    participant Rust as update_settings
    participant File as settings.json
    participant Clock as Clock UI
    UI->>Rust: update_settings(settings)
    Rust->>Rust: Validate appearance, layout and both animation choices
    alt Invalid
        Rust-->>UI: Error
    else Valid
        Rust->>File: Write config
        alt Write fails
            Rust->>Rust: Restore previous settings
            Rust-->>UI: Error
        else Write succeeds
            Rust->>Clock: clock-settings-changed
            Rust-->>UI: Saved settings
        end
    end
```

Before selection, the Settings UI calls `get_font_families` in [fonts.rs](../fonts.rs). It enumerates the Windows font table, removes duplicate family names, and returns an error if enumeration fails; it does not write configuration. The persistence path and error handling are in [main.rs](../main.rs). Window-position saves use the same file. The background monitor polls Windows input and window geometry every 30 ms, changing click-through and emitting events when observed values change.
