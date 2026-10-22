# Rust application architecture

[main.rs](../main.rs) owns the native runtime. [settings.rs](../settings.rs) owns the durable settings schema, defaults and validation. [fonts.rs](../fonts.rs) enumerates Windows-installed font families for the Settings dropdown. The parent [Tauri architecture](../../doc/architecture.md) describes package configuration.

| Unit | Responsibility |
| --- | --- |
| `ClockState` | In-process config mutex, menu flag and settings path |
| `PersistedConfig` | Serialized clock appearance and optional window position, defined in `settings.rs` |
| `get_font_families` | Read and deduplicate font families from the Windows GDI font table |
| Tauri commands | Settings, startup registry switch, menu state, window controls and quit |
| `start_monitor` | Poll Ctrl, cursor proximity and window position; set click-through and emit events |
| Tray setup | Open settings and quit actions |

At startup, Rust loads `settings.json` from Tauri's app config directory, defaults missing or invalid settings, then writes the current config. The current schema includes outline width, font family, a 24–200 pixel clock size, time layout, AM/PM visibility and independent `colon_animation` and `number_animation` choices. Older files missing fields reset to defaults. Rust creates both webviews after the state is managed. The main window is positioned on a visible saved monitor location, or near the primary monitor's top-right corner. `update_settings` validates colors, size, font name and enumerated options, saves the new value, rolls back in-memory settings on write failure, then emits `clock-settings-changed`. The Windows Run registry key stores sign-in launch separately. The monitor emits `ctrl-state` and `proximity`, controls pointer pass-through, and saves position after movement settles.

The native command and event boundary is used by [frontend code](../../../src/doc/architecture.md). [default.json](../../capabilities/default.json) lists frontend permissions. `settings.rs` tests current schema serialization and validation; `fonts.rs` tests font enumeration and deduplication. The font list is read on request, while only the selected family name is persisted.
