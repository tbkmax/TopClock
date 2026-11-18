# Settings page architecture

This folder owns the Settings webview's Alpine component. [settings.js](../settings.js) is the page composition root used by [settings.html](../../../settings.html). The [parent frontend architecture](../../doc/architecture.md) describes the clock, menu, palette, and add-on boundaries.

| Component | Responsibility |
| --- | --- |
| [settings.js](../settings.js) | Loads native state, binds the Settings template, composes feature methods, and renders the live preview |
| [settings-persistence.js](../settings-persistence.js) | Clones drafts, broadcasts immediate previews, serializes debounced `update_settings` writes, and recovers the latest failed save |
| [settings-events.js](../settings-events.js) | Registers native settings/display/hotkey events and window hooks through callbacks; returns one disposal function |
| [settings-recovery.js](../settings-recovery.js) | Reads Timer, Progress, and Counter sessions after a failed settings write, retaining each prior session if its read fails |
| [settings-preview.js](../settings-preview.js) | Runs one clock preview timer only while the native Settings window is visible and not minimized; composes page-local clock and add-on preview rendering |
| [settings-shortcuts.js](../settings-shortcuts.js) | Shortcut metadata, recording, toggles, and conflict checks |
| [settings-updates.js](../settings-updates.js) | Store and direct-build update checks and actions |
| [settings-tabs.js](../settings-tabs.js) | Pure keyboard navigation order for Settings tabs |
| [settings.css](../settings.css) | Settings layout and controls; imports the shared switch style |

Rust remains the source of truth for `ClockSettings`, display visibility, startup state, and add-on sessions. The page uses Tauri commands and events; it does not write `settings.json` or the Windows Run key. A failed settings write triggers native readback and restores the clock preview when the draft was not saved. The event module owns subscription lifetimes, while `settings.js` owns the responses and disposes those subscriptions when Alpine destroys the page. No saved field or command name changed in this refactor.

The [paired Add-on card](../../../settings.html) presents one switch per member and a group control. [layout.js](../../addons/layout.js) reports the group as on when either member is enabled. [instance-editor.js](../../addons/instance-editor.js) sets both flags off when the group is on, or both on when it is off. [settings-preview.js](../settings-preview.js) uses the shared layout helper so one visible member is centered at the pair's scale. The existing save queue persists these flags without a new field.

The webview is bundled locally by [Vite](../../../vite.config.js), including its [localized markup](../../i18n/doc/architecture.md). There is no service or authentication layer in this folder. The live Windows checks in [the parent backlog](../../doc/backlog.md) remain necessary for native window, tray, persistence, and click-through behavior.
