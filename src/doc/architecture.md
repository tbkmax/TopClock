# Frontend architecture

This folder owns the two Alpine.js interfaces. Read the [README](../../README.md) and [Tauri architecture](../../src-tauri/doc/architecture.md) for the native boundary.

| File | Responsibility |
| --- | --- |
| [main.js](../main.js) | Clock parts, live appearance, window size adjustment, Ctrl interaction, drag, menu and native events |
| [time-format.js](../time-format.js) | Shared time layout presets, unpadded hours, two-digit minutes and seconds, and local font fallback |
| [clock-animations.js](../clock-animations.js) | Independent colon and number animation options, plus per-number change tracking shared by both windows |
| [style.css](../style.css) | Transparent clock appearance, natural-width time segments, animation variants and proximity fade |
| [settings.js](../settings.js) | Clock tab preview, save queue, startup switch, settings window controls, and in-app update checks/installs |
| [settings.css](../settings.css) | Settings page layout, controls, and update action buttons |

[index.html](../../index.html) and [settings.html](../../settings.html) supply the markup. [vite.config.js](../../vite.config.js) declares both entry points. The frontend calls commands registered in [main.rs](../../src-tauri/src/main.rs); it does not write the settings file or registry directly. The clock receives `ctrl-state`, `proximity`, `clock-settings-preview`, and `clock-settings-changed` events. Settings are validated and persisted by Rust. The preview event can show changes before they are saved. Both pages use `timeParts` for matching layouts and AM/PM behavior, then `markChangedNumbers` to animate only displayed numeric parts whose value changed. Colon animation runs separately and can be disabled while number change animation remains active. The Settings page calls `get_font_families` to fill a select control with Windows-installed families; missing saved fonts fall back to Segoe UI or the first available family. Neither page requests a network font. The clock webview resizes in both dimensions for sizes up to 200 pixels while keeping its right edge in place. The Settings preview caps its displayed font size at 64 pixels and labels the scaled view. In the General tab, [settings.js](../settings.js) interacts with `@tauri-apps/plugin-updater` and `@tauri-apps/plugin-process` to check for releases against GitHub Releases, showing download progress and triggering an in-place restart when updates are installed.
