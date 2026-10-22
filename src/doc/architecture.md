# Frontend architecture

This folder owns the two Alpine.js interfaces. Read the [README](../../README.md) and [Tauri architecture](../../src-tauri/doc/architecture.md) for the native boundary.

| File | Responsibility |
| --- | --- |
| [main.js](../main.js) | Clock parts, live appearance, width adjustment, Ctrl interaction, drag, menu and native events |
| [time-format.js](../time-format.js) | Shared time layout presets, animation choices and local font fallback |
| [style.css](../style.css) | Transparent clock appearance, animation variants and proximity fade |
| [settings.js](../settings.js) | Clock tab preview, save queue, startup switch and settings window controls |
| [settings.css](../settings.css) | Settings page layout and controls |

[index.html](../../index.html) and [settings.html](../../settings.html) supply the markup. [vite.config.js](../../vite.config.js) declares both entry points. The frontend calls commands registered in [main.rs](../../src-tauri/src/main.rs); it does not write the settings file or registry directly. The clock receives `ctrl-state`, `proximity`, `clock-settings-preview`, and `clock-settings-changed` events. Settings are validated and persisted by Rust. The preview event can show changes before they are saved. Both pages use `timeParts` for matching layouts and AM/PM behavior. The Settings page calls `get_font_families` to fill a select control with Windows-installed families; missing saved fonts fall back to Segoe UI or the first available family. Neither page requests a network font. The clock webview resizes to fit the selected layout and font while keeping its right edge in place.
