# Built-in definitions backlog

The localization import move is complete. Existing visual and native checks below still cover weekday and Region labels in supported languages.

Confirm Counter's `H:MM:SS` per-second display, `D:HH:MM` transition at 100 hours with minutes retained, and blue/red running versus light blue/red stopped text on both dark and light desktop backgrounds. Verify the direction text glow follows active count direction across sign changes and disappears on Stop, including at zero and in a pair. Exercise 0%, the 50% default, and 100% glow intensity; compare 50% with the Ctrl-held clock and confirm both clock and preview update and retain the setting after restart. Verify zero uses the configured text color and that the text color changes promptly after Stop or restart; see the [frontend Counter checklist](../../../doc/backlog.md#counter-live-windows-acceptance).


Confirm Timer preset edits stay independent of Progress and that stopwatch hides Set while both modes retain Mode, Start/Pause, and Reset in the [live Timer checklist](../../../doc/backlog.md#timer-menu-live-windows-acceptance). Frontend choice tests cover the definition path; native WebView interaction remains open.

Region country/city matching and test-runtime zone coverage are unit-tested. Refresh the bundled [IANA country map](../zone-country-codes.js) when updating tzdb/ICU data. Verify the [Settings-only picker](../region-picker.js) keyboard navigation, focus, localized labels, and list scrolling in the running Windows WebView as part of the [frontend dashboard acceptance](../../../doc/backlog.md#add-on-dashboard-live-verification).

Verify Progress preset choices and warning behavior in a native multi-display session, including a changed preset list while the menu is open. See the [frontend checklist](../../../doc/backlog.md#separate-menu-live-acceptance).


Live verification of the new Progress menu labels and two independent countdowns remains in the [frontend preset checklist](../../../doc/backlog.md#progress-preset-menu-live-acceptance).

No folder-specific feature is pending from this refactor. The [host backlog](../../doc/backlog.md) tracks live Start/Pause and cross-window verification, and the [frontend backlog](../../../doc/backlog.md) tracks Progress styling, layout, localization, and display acceptance. Future installable or connected add-ons remain proposals in the [refactor plan](../../../../doc/feature/ADDON_REFACTOR_PLAN.md), not implemented behavior.
