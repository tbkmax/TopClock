# Frontend architecture

This folder owns the two Alpine.js interfaces. Read the [README](../../README.md) and [Tauri architecture](../../src-tauri/doc/architecture.md) for the native boundary.

| File | Responsibility |
| --- | --- |
| [main.js](../main.js) | Clock time, 12/24-hour display, Ctrl interaction, drag, menu and native events |
| [style.css](../style.css) | Transparent clock appearance and proximity fade |
| [settings.js](../settings.js) | Settings preview, save queue, startup switch and settings window controls |
| [settings.css](../settings.css) | Settings page layout and controls |

[index.html](../../index.html) and [settings.html](../../settings.html) supply the markup. [vite.config.js](../../vite.config.js) declares both entry points. The frontend calls commands registered in [main.rs](../../src-tauri/src/main.rs); it does not write the settings file or registry directly. The clock receives `ctrl-state`, `proximity`, `clock-settings-preview`, and `clock-settings-changed` events. Settings are validated and persisted by Rust. The preview event can show changes before they are saved.
