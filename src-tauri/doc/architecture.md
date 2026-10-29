# Tauri package architecture

This folder defines the native Windows application. Read the [README](../../README.md) for product behavior and [Rust architecture](../src/doc/architecture.md) for implementation details.

| File or folder | Responsibility |
| --- | --- |
| [Cargo.toml](../Cargo.toml), [build.rs](../build.rs) | Rust package, Windows display and GDI bindings, and Tauri build setup |
| [tauri.conf.json](../tauri.conf.json) | Main clock and Settings window definitions, frontend paths and NSIS bundle |
| [src/](../src/) | Thin binary entry point, Tauri startup wiring, native commands, tray, settings, display manager and pointer monitor |
| [capabilities/](../capabilities/) | Frontend permissions for Settings and all clock windows |
| [icons/](../icons/) | Windows application icon |

The `main` window is a transparent always-on-top clock; additional `clock-*` windows are created for enabled displays. `settings` is hidden until opened. Every clock webview runs the same frontend and shared settings, but each has its own position and visibility. [main.rs](../src/main.rs) delegates to [lib.rs](../src/lib.rs), which registers commands and builds the main and Settings webviews after managed settings state is ready. [displays.rs](../src/displays.rs) creates secondary clocks as monitors appear. [config_store.rs](../src/config_store.rs) reads and writes `settings.json` in Tauri's app config directory (`%APPDATA%\topclock\settings.json`), including per-display preferences, validated add-ons and one running Timer session. Enabled shortcuts are registered once for the application. The modifier controls click-through and dragging on each clock. The current user's Windows Run key stores sign-in launch separately. The package builds frontend assets from [the Vite project](../../vite.config.js). Generated `target/` and `gen/` are outside maintained source documentation.
