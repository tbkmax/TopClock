# Tauri package architecture

This folder defines the native Windows application. Read the [README](../../README.md) for product behavior and [Rust architecture](../src/doc/architecture.md) for implementation details.

| File or folder | Responsibility |
| --- | --- |
| [Cargo.toml](../Cargo.toml), [build.rs](../build.rs) | Rust package and Tauri build setup |
| [tauri.conf.json](../tauri.conf.json) | Two window definitions, frontend paths and NSIS bundle |
| [src/](../src/) | Native commands, tray, settings and pointer monitor |
| [capabilities/](../capabilities/) | Frontend permissions for both windows |
| [icons/](../icons/) | Windows application icon |

The `main` window is transparent and always on top; `settings` is a separate hidden window until opened. Both webviews are built after managed settings state is ready. The Rust code reads and writes `settings.json` in Tauri's app config directory and changes the current user's Windows Run key for sign-in launch. The package builds frontend assets from [the Vite project](../../vite.config.js). Generated `target/` and `gen/` are outside maintained source documentation.
