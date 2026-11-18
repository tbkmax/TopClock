# Native input architecture

This folder owns the clock modifier monitor, optional palette-key monitor, and configured global shortcuts. The [Rust application architecture](../../doc/architecture.md) describes the settings and windows they use.

| File | Responsibility |
| --- | --- |
| [interaction.rs](../interaction.rs) | Poll each clock window, maintain click-through, observe drag/menu input, proximity, Timer completion, and position settling |
| [palette.rs](../palette.rs) | Poll the palette key, show/hide its nonactivating Webview, and publish pointer events |
| [hotkeys.rs](../hotkeys.rs) | Parse enabled shortcut strings and register/dispatch Win32 global hotkeys |
| [mod.rs](../mod.rs) | Module declarations |

The interaction modifier and palette preference are saved in [configuration](../../config/doc/architecture.md). The monitors are runtime threads; they do not persist key or pointer state. `interaction::set_click_through` maintains `WS_EX_TRANSPARENT` while preserving layered style. Display reconciliation calls it before a clock is shown; the interaction monitor checks actual style on every visible pass. Position settling updates per-display offsets through the shared config store. The palette monitor keeps its Webview nonactivating and click-through and cancels on competing input. [Windows window handling](../../windows/doc/architecture.md) owns the menu and topmost operations used here.

This code uses local Win32 input and window handles, not network services. Global shortcut conflicts are recorded in `ClockState.hotkey_errors`. The current polling intervals and focus behavior are part of the existing interaction contract; the [backlog](backlog.md) identifies live checks that Rust tests cannot prove.
