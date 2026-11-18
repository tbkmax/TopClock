# Windows platform services

This folder contains small OS-facing services that do not own the clock, display, or add-on state. The [Rust application architecture](../../doc/architecture.md) covers their callers and Tauri command registration.

| File | Responsibility |
| --- | --- |
| [webview_runtime.rs](../webview_runtime.rs) | Check Evergreen WebView2 before Tauri creates Webviews |
| [locale.rs](../locale.rs) | Read the Windows user UI language and resolve a supported app language |
| [fonts.rs](../fonts.rs) | Enumerate installed Windows font families |
| [startup.rs](../startup.rs) | Route sign-in launch state to MSIX StartupTask or the current-user Run key |
| [store_updates.rs](../store_updates.rs) | Check and request Microsoft Store package updates for packaged builds |
| [mod.rs](../mod.rs) | Module declarations |

The services preserve the existing direct-build versus packaged-build boundary. `startup::is_packaged` detects package identity; `store_updates` rejects a direct build, while `window_commands` permits the release page only for direct builds. `store_updates` uses the Settings window as the Store dialog owner. Fonts and locale are queried on demand. The WebView2 check runs before config load or window creation. The [Tauri package architecture](../../../doc/architecture.md) describes packaging and capabilities.

These calls cross into local Windows APIs and the Store package service; they do not create an application-owned network client or credential store. Failures return command errors or, for missing WebView2, display native installation guidance. Packaged behavior still requires the installed-app checks in this folder's [backlog](backlog.md).
