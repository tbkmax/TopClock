# Display architecture

This folder owns monitor identity, display-relative positions, display Tauri commands, and clock-window reconciliation. The [Rust application architecture](../../doc/architecture.md) covers startup and shared state.

| File | Responsibility |
| --- | --- |
| [mod.rs](../mod.rs) | `MonitorBounds`, `DisplayInfo`, and `ActiveDisplay` shared by this module and runtime state |
| [identity.rs](../identity.rs) | Win32 target identity and friendly-name lookup for Tauri monitor sources |
| [discovery.rs](../discovery.rs) | Active-monitor enumeration, primary/enabled state, and clone-mode deduplication |
| [geometry.rs](../geometry.rs) | Pure centered and saved-position calculations in physical coordinates |
| [positions.rs](../positions.rs) | List/visibility/reset commands and position saving |
| [manager.rs](../manager.rs) | Window create/show/hide/destroy, legacy position migration, and periodic reconciliation |
| [tests.rs](../tests.rs) | Physical-coordinate centering and relative-position restoration tests |

`ClockState.active_displays` maps stable display IDs to current window labels and bounds. `main_display_id` keeps the configured main window on one display; secondary clocks use `clock-*` labels. `PersistedConfig.displays` stores visibility and offsets relative to each monitor's bounds. The identity fallback uses a source slot or bounds when Windows does not provide a target path. See [configuration](../../config/doc/architecture.md) for saved data ownership.

`manager::reconcile_displays` uses discovery results to remove or update old windows and show enabled clocks. It sets click-through before showing a clock and starts its [input monitor](../../input/doc/architecture.md). The manager thread repeats reconciliation every two seconds and emits `displays-changed` only when the discovered list differs. Commands validate connected IDs and save changes; reset rolls back moved windows if persistence fails. These are existing behaviors retained by the module split.

Windows display identity is a local OS boundary. No network or authentication is involved. The Tauri commands remain subject to the package's window capabilities. Mixed-DPI and reconnect behavior still requires the live check in this folder's [backlog](backlog.md).
