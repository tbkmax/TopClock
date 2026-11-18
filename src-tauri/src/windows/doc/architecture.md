# Window and tray architecture

This folder owns the separate clock menu, Settings window commands, tray actions, and topmost recovery. The [Rust application architecture](../../doc/architecture.md) describes their startup wiring and shared state.

| File | Responsibility |
| --- | --- |
| [menu_window.rs](../menu_window.rs) | Menu request state, anchor/display fitting, show and close commands |
| [window_commands.rs](../window_commands.rs) | Settings visibility, folder/release actions, and common quit path |
| [tray.rs](../tray.rs) | Tray construction, Settings/Quit actions, and language refresh |
| [topmost.rs](../topmost.rs) | Native topmost recovery for visible clock HWNDs |
| [mod.rs](../mod.rs) | Module declarations |

Menu requests are transient in `ClockState`; the saved settings and positions live in [configuration](../../config/doc/architecture.md). The menu window is separate from clock windows and is fitted within a display without moving its clock anchor. `window_commands::quit_app` checkpoints Counter through [add-ons](../../addons/doc/architecture.md), saves clock positions through [displays](../../displays/doc/architecture.md), then exits. The tray uses that same quit path. The [input monitor](../../input/doc/architecture.md) calls topmost recovery and observes menu dismissal.

Windows handles and Tauri Webviews are local OS boundaries. Opening the release page is restricted to direct builds; packaged builds use the Store update commands in [platform](../../platform/doc/architecture.md). No new window capability or command name was introduced by this grouping.
