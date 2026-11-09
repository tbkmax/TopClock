# Built-in add-on definitions

[progress.js](../progress.js) now declares `toggle` and `reset` for the clock menu as well as its existing Settings and click roles. It still derives Start/Pause from the shared per-instance session. The preset list is an app-wide setting edited by [the Settings page](../../../doc/architecture.md); a preset restart uses a dedicated native command because it changes both an option and session. No custom Progress naming field was added; menu rows use the existing localized instance numbers.

This folder owns type-specific behavior for the four compiled add-ons. See the [host architecture](../../doc/architecture.md) for registry, state, and action routing.

| Definition | Options and display | Settings behavior |
| --- | --- | --- |
| [date.js](../date.js) | Local date and optional localized weekday | Date format and weekday switch |
| [region-clock.js](../region-clock.js) | Named time zone with main clock format and animation parts | Time zone and label switch |
| [timer.js](../timer.js) | Numeric countdown or stopwatch from the singleton session | Mode/duration confirmation and reset warning |
| [progress.js](../progress.js) | Date, daily-range, or per-instance countdown bar | Range, weekday, appearance, mode, and duration rules |
| [progress-display.js](../progress-display.js) | Pure local date, daily-range, countdown, phase, and completion calculations | No editor behavior |
| [progress.css](../progress.css) | Clock and Settings Progress bar phases, fill, pulse, and reduced-motion styling | No editor behavior |

Every definition has a stable kind, label, maximum instances, fresh `createOptions`, pure `display`, `describe`, an `editor`, view keys, and declared actions. Date and Region clock have no runtime actions. Timer and Progress countdown declare toggle/reset; only Timer Reset contributes to the clock menu. The host checks availability and Rust validates actions again.

Display functions receive an explicit time and read-only context. Animation and completion history are separate in [main.js](../../../main.js) and [settings.js](../../../settings.js), so a preview cannot consume a clock animation. Progress calculations and styles live beside its definition. Type editors read the shared [add-on host](../../host.js) sessions and use the Settings page's normal `save()` controller; they do not persist directly.
