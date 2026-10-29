# Tauri package workflow

The package connects webview configuration to the Rust application. This class diagram describes package relationships rather than Rust inheritance.

```mermaid
classDiagram
    class TauriConfig {
      mainWindow
      settingsWindow
      frontendDist
    }
    class ClockState {
      config
      settings_path
      menu_open
      hotkey_errors
      active_displays
      main_display_id
    }
    class DefaultCapability {
      windows
      permissions
    }
    class RuntimeClock {
      label: clock-*
    }
    TauriConfig --> ClockState : windows created during setup
    ClockState --> RuntimeClock : creates for enabled displays
    DefaultCapability --> TauriConfig : applies to main and settings
    DefaultCapability --> RuntimeClock : applies to clock-*
```

The definitions are in [tauri.conf.json](../tauri.conf.json), [main.rs](../src/main.rs), and [default.json](../capabilities/default.json). This diagram omits generated Tauri types. Add-on instances and Timer sessions live inside `ClockState.config`; see the [Rust workflow](../src/doc/workflow_diagram.md).

```mermaid
sequenceDiagram
    participant Tauri
    participant Rust as main.rs setup
    participant Disk as App config directory
    participant UI as Webviews
    Tauri->>Rust: Start application
    Rust->>Disk: Read or create settings.json
    Rust->>Rust: Manage ClockState
    Rust->>UI: Build main and settings windows
    Rust->>UI: Reconcile enabled display clocks and set click-through
    Rust->>Rust: Start modifier monitor and optional hotkey registrations
    Rust->>UI: Reconcile click-through on first monitor pass
```

The startup order comes from [main.rs](../src/main.rs); the two configured windows come from [tauri.conf.json](../tauri.conf.json), and secondary clocks are created at runtime. Each visible clock checks its click-through state on the first monitor pass. [main.js](../../src/main.js) can resize and reposition its own window without display-edge clamping under [default.json](../capabilities/default.json). The Settings window can request installed fonts from [fonts.rs](../src/fonts.rs). Native Timer actions update the shared session in `settings.json` and emit live state to all clocks. The file is durable state; per-window menu flags and active window records in `ClockState` are in-process state.
