# Tauri package architecture

This folder defines the native Windows application. Read the [README](../../README.md) for product behavior and [Rust architecture](../src/doc/architecture.md) for implementation details.

| File or folder | Responsibility |
| --- | --- |
| [Cargo.toml](../Cargo.toml), [build.rs](../build.rs) | Rust package, Windows GDI binding and Tauri build setup |
| [tauri.conf.json](../tauri.conf.json) | Two window definitions, frontend paths and NSIS bundle |
| [src/](../src/) | Native commands, tray, settings and pointer monitor |
| [capabilities/](../capabilities/) | Frontend permissions for both windows |
| [icons/](../icons/) | Windows application icon |

The `main` window is transparent and always on top; `settings` is a separate hidden window until opened. The main webview may change its native size to fit the main clock, enabled add-on stacks and menu while remaining nonresizable by the user. Both webviews are built after managed settings state is ready. Rust reads and writes `settings.json` in Tauri's app config directory (`%APPDATA%\topclock\settings.json`), including validated add-on instances and a running Timer session. It registers individually enabled action shortcuts with Windows and reports conflicts to Settings. The configured interaction modifier still controls click-through and dragging. Click-through is set before the main window appears and reconciled by the native monitor after it is shown. The current user's Windows Run key stores sign-in launch separately. The package builds frontend assets from [the Vite project](../../vite.config.js). Generated `target/` and `gen/` are outside maintained source documentation.
