# Rust workflows

The core Rust types in [main.rs](../main.rs) own durable configuration and live window state.

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
      blink: bool
      font_color: String
      outline_color: String
      font_size: u8
      twenty_four_hour: bool
    }
    class ClockPosition {
      x: i32
      y: i32
    }
    ClockState --> PersistedConfig : owns
    PersistedConfig --> ClockSettings : includes
    PersistedConfig --> ClockPosition : optional
```

Names and fields match [main.rs](../main.rs). The config is written to `settings.json`; `menu_open` is in-memory only.

```mermaid
sequenceDiagram
    participant UI as Settings UI
    participant Rust as update_settings
    participant File as settings.json
    participant Clock as Clock UI
    UI->>Rust: update_settings(settings)
    Rust->>Rust: Validate colors and size
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

The persistence path and error handling are in [main.rs](../main.rs). Window-position saves use the same file. The background monitor polls Windows input and window geometry every 30 ms, changing click-through and emitting events when observed values change.
