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
    }
    class DefaultCapability {
      windows
      permissions
    }
    TauriConfig --> ClockState : windows created during setup
    DefaultCapability --> TauriConfig : applies to main and settings
```

The definitions are in [tauri.conf.json](../tauri.conf.json), [main.rs](../src/main.rs), and [default.json](../capabilities/default.json). This diagram omits generated Tauri types.

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
    Rust->>UI: Show main clock window
```

The startup order comes from [main.rs](../src/main.rs); the window definitions come from [tauri.conf.json](../tauri.conf.json). After startup, [main.js](../../src/main.js) can resize and reposition the main window under [default.json](../capabilities/default.json). The Settings window can request the installed font list from [fonts.rs](../src/fonts.rs). `settings.json` is durable state; `ClockState` is in-process state.
