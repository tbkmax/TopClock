# Built-in add-on definitions

[counter.js](../counter.js) adds a singleton Counter definition with empty saved options. Its pure formatter calculates a signed balance from an explicit session and time, shows `H:MM:SS` below 100 total hours and `D:HH:MM` afterward, and delegates sign and activity colors to [signed-balance-appearance.js](../signed-balance-appearance.js). Running positive/negative balances use blue/red; stopped balances use lighter blue/red. Zero has no override and uses the clock's configured text color. This helper takes only a signed value and running flag, so another signed-time add-on can use the same appearance without depending on Counter's session or format. `H` grows naturally from one to two digits; `HH` is always two digits within a day. It never renders a minus sign. The definition declares Count up, Count down, Stop, and a Settings-only Reset role; it declares no clock click action. The native session owns the balance and running direction. See the [parent host architecture](../../doc/architecture.md).


[timer.js](../timer.js) now declares grouped Mode and Set menu sections plus a Timer-only Details view. [countdown-presets.js](../countdown-presets.js) shares preset list editing and confirmation choice metadata with Progress; each definition supplies its own settings fields and copy. Timer's mode choice resets even a running session through the native mode command, while preset choices restart countdown from zero. The two warning preferences are independent, as are Timer and Progress preset lists. Timer Start/Pause and Reset are available in the menu in either mode.

[progress.js](../progress.js) now declares `toggle` and `reset` for the clock menu as well as its existing Settings and click roles. It still derives Start/Pause from the shared per-instance session. The definition declares an optional `menu` contribution and `detailsViewKey`. The menu contribution supplies shared preset choices and reset-confirmation metadata; the Details fragment edits that app-wide list in Settings. A preset restart uses a dedicated native command because it changes both an option and session. No custom Progress naming field was added; menu rows use the existing localized instance numbers.

This folder owns type-specific behavior for the five compiled add-ons. See the [host architecture](../../doc/architecture.md) for registry, state, and action routing.

[region-picker.js](../region-picker.js) builds search records and per-editor Alpine picker state only in Settings. [zone-country-codes.js](../zone-country-codes.js) is a bundled, public-domain country map generated from IANA tzdb 2026e `zone.tab`, including ICU-resolved aliases. `zone.tab` provides one country code per row and country-specific zone aliases; the map needs refreshing when the bundled tzdb snapshot is updated. `Intl.DisplayNames` supplies both the selected Settings language and English country names. The filter matches country names/codes, city, or full IANA ID, ranks exact-country matches first, and returns exact IDs for selection. No query is written to `options.time_zone`; the clock/menu's [Region definition](../region-clock.js) does not load the country index, and the application makes no runtime network request.

| Definition | Options and display | Settings behavior |
| --- | --- | --- |
| [date.js](../date.js) | Local date and optional localized weekday | Date format and weekday switch |
| [region-clock.js](../region-clock.js) | Named time zone with main clock format and animation parts | Time zone and label switch |
| [timer.js](../timer.js) | Numeric countdown or stopwatch from the singleton session | Mode/duration confirmation and reset warning |
| [progress.js](../progress.js) | Date, daily-range, or per-instance countdown bar | Range, weekday, appearance, mode, and duration rules |
| [counter.js](../counter.js) | Signed time balance in `H:MM:SS` or `D:HH:MM` | Count up/down, Stop, and confirmed Settings Reset |
| [signed-balance-appearance.js](../signed-balance-appearance.js) | Pure signed balance and running/stopped color mapping | No editor or saved options |
| [progress-display.js](../progress-display.js) | Pure local date, daily-range, countdown, phase, and completion calculations | No editor behavior |
| [progress.css](../progress.css) | Clock and Settings Progress bar phases, fill, pulse, and reduced-motion styling | No editor behavior |

Every definition has a stable kind, label, maximum instances, fresh `createOptions`, pure `display`, `describe`, an `editor`, view keys, and declared actions. Date and Region clock have no runtime actions. Timer and Progress countdown declare toggle/reset for the clock menu; Counter declares Count up/down/Stop. The host checks availability and Rust validates actions again.

Display functions receive an explicit time and read-only context. Animation and completion history are separate in [main.js](../../../main.js) and [settings.js](../../../settings.js), so a preview cannot consume a clock animation. Progress calculations and styles live beside its definition. Type editors read the shared [add-on host](../../host.js) sessions; preset list edits use the Settings save controller, while Timer mode changes use the native menu choice transaction. Editors do not write the config directly.
