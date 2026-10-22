# Rust application architecture

[main.rs](../main.rs) owns the native runtime. The parent [Tauri architecture](../../doc/architecture.md) describes package configuration.

| Unit | Responsibility |
| --- | --- |
| `ClockState` | In-process config mutex, menu flag and settings path |
| `PersistedConfig` | Serialized clock appearance and optional window position |
| Tauri commands | Settings, startup registry switch, menu state, window controls and quit |
| `start_monitor` | Poll Ctrl, cursor proximity and window position; set click-through and emit events |
| Tray setup | Open settings and quit actions |

At startup, Rust loads `settings.json` from Tauri's app config directory, defaults missing or invalid settings, then writes the current config. It creates both webviews after the state is managed. The main window is positioned on a visible saved monitor location, or near the primary monitor's top-right corner. `update_settings` validates colors and size, saves the new value, rolls back in-memory settings on write failure, then emits `clock-settings-changed`. The Windows Run registry key stores sign-in launch separately. The monitor emits `ctrl-state` and `proximity`, controls pointer pass-through, and saves position after movement settles.

The native command and event boundary is used by [frontend code](../../../src/doc/architecture.md). [default.json](../../capabilities/default.json) lists frontend permissions. `main.rs` contains tests for legacy settings without a position and round-trip serialization.
