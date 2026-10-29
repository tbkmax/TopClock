# Rust workflows

The General tab calls `open_settings_folder` in [window_commands.rs](../window_commands.rs). The command derives the folder from `ClockState.settings_path`, creates it if necessary, and asks Explorer to open it. Directory or process launch errors return to Settings; this flow does not write `settings.json`.

The display manager in [displays.rs](../displays.rs) polls connected desktop displays every two seconds. [display_identity.rs](../display_identity.rs) matches GDI names to active Windows target paths. Enabled displays receive separate clock windows, while one `ClockSettings` and `TimerSession` remain shared. A per-display preference stores visibility and a position relative to that display's origin; absent preferences mean visible.

The core Rust types in [settings.rs](../settings.rs) and [state.rs](../state.rs) own durable configuration and live window state.

```mermaid
classDiagram
    class ClockState {
      menu_open: Mutex~HashSet_String~
      config: Mutex~PersistedConfig~
      settings_path: PathBuf
      hotkey_errors: Mutex~Vec_String~
      active_displays: Mutex~HashMap_String_ActiveDisplay~
      main_display_id: Mutex~Option_String~
    }
    class PersistedConfig {
      settings: ClockSettings
      position: Option~ClockPosition~
      displays: HashMap~String_DisplayPreference~
      timer_session: TimerSession
    }
    class DisplayPreference {
      visible: bool
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
      auto_check_updates: bool
      shortcuts: ShortcutSettings
      timer_addon_enabled: bool
      addons: Vec~AddonInstance~
      timer_reset_warning_dismissed: bool
    }
    class ShortcutSettings {
      interaction_modifier: String
      open_settings: String
      open_settings_enabled: bool
      quit: String
      quit_enabled: bool
      timer_toggle: String
      timer_toggle_enabled: bool
      timer_reset: String
      timer_reset_enabled: bool
    }
    class AddonInstance {
      id: String
      kind: String
      enabled: bool
      placement: String
      size_percent: u8
      options: Value
    }
    class TimerSession {
      running: bool
      elapsed_ms: u64
      started_at_ms: Option~u64~
      finished: bool
    }
    class ClockPosition {
      x: i32
      y: i32
    }
    ClockState --> PersistedConfig : owns
    PersistedConfig --> ClockSettings : includes
    ClockSettings --> ShortcutSettings : includes
    ClockSettings --> AddonInstance : ordered instances
    PersistedConfig --> TimerSession : includes
    PersistedConfig --> ClockPosition : optional
    PersistedConfig --> DisplayPreference : by display identity
```

Names and fields match [settings.rs](../settings.rs), [addons.rs](../addons.rs), and [state.rs](../state.rs). [config_store.rs](../config_store.rs) writes the config to `settings.json`; `menu_open` and hotkey errors are in-memory only. `timer_addon_enabled` is a retained legacy migration field, set false after migration.
The `options` value contains `format` and optionally `show_weekday` for Date, or `time_zone` and optionally `show_label` for Region clock. [addons.rs](../addons.rs) accepts missing optional switches for older files, requires booleans when present, and validates sizes from 10% to 100% before the save flow below proceeds.

```mermaid
sequenceDiagram
    participant UI as Settings UI
    participant Rust as update_settings
    participant File as settings.json
    participant Clock as Clock UI
    UI->>Rust: update_settings(settings)
    Rust->>Rust: Validate appearance, add-on instances, timer changes and shortcuts
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

Before selection, the Settings UI calls `get_font_families` in [fonts.rs](../fonts.rs). It enumerates the Windows font table, removes duplicate family names, and returns an error if enumeration fails; it does not write configuration. [settings_commands.rs](../settings_commands.rs) validates changes and calls [config_store.rs](../config_store.rs) to save. Window-position saves in [displays.rs](../displays.rs) use the same file. The background monitor in [interaction.rs](../interaction.rs) polls Windows input and window geometry every 30 ms. Its first poll after the main window is shown reconciles click-through with the current modifier and menu state. On later state changes, `set_click_through` changes `WS_EX_TRANSPARENT` while retaining `WS_EX_LAYERED` and refreshes the native frame; the monitor also emits state and proximity events. It calls [timer.rs](../timer.rs) to normalize a completed Timer on the main window.


```mermaid
sequenceDiagram
    participant User
    participant Win as Windows hotkey service
    participant Rust as hotkeys.rs and timer.rs
    participant File as settings.json
    participant Clock as Clock UI
    User->>Win: Press enabled Timer binding
    Win->>Rust: WM_HOTKEY
    Rust->>Rust: Toggle or reset TimerSession
    Rust->>File: Save session
    Rust->>Clock: timer-state-changed
    alt Countdown reaches zero
        Rust->>File: Save finished session
        Rust->>Clock: timer-state-changed
    end
```

The hotkey service sends only successfully registered bindings. Timer session state survives restart by storing accumulated milliseconds and the last start epoch; the UI formats the current value from that state. The configured interaction modifier is polled separately and never has an off switch.

## Display reconciliation

```mermaid
sequenceDiagram
    participant Windows as Windows display configuration
    participant Manager as reconcile_displays
    participant Rust as set_display_enabled
    participant File as settings.json
    participant Clock as Clock windows
    participant Settings as Settings UI
    Manager->>Windows: Read active target paths and display bounds
    Manager->>File: Read per-display visibility and relative positions
    Manager->>Clock: Create or hide windows for connected displays
    Manager->>Clock: Restore each saved origin relative to its display
    Manager->>Settings: displays-changed
    Settings->>Rust: set_display_enabled(id, enabled)
    Rust->>File: Save selected display visibility
    Manager->>Clock: Reconcile changed visibility on next poll
    Clock->>File: Save only its display-relative position after drag
    Settings->>Rust: reset_clock_positions()
    Rust->>Clock: Center each currently visible clock from its physical size
    Rust->>File: Save centered display-relative positions
```

The manager polls every two seconds and creates a secondary clock only for an enabled connected display. Windows without a target path use a GDI slot identity. The `main` and Settings windows stay allocated even when hidden; disconnected secondary clocks are destroyed. Reset skips clocks that are not currently visible and leaves disabled display preferences unchanged. If moving a clock or saving the config fails, the command tries to put moved windows back and reports the error. `clock-settings-changed` and `timer-state-changed` remain application-wide, while proximity and modifier events target an individual clock.
