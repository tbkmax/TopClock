# TODO 5, Add-on 4: Progress bar plan

Status: implemented on 2026-10-30; focused frontend tests, Vite build, Rust tests, and Tauri development startup pass. Interactive Windows layout and persistence checks remain. The existing [add-on system plan](ADDON_SYSTEM_PLAN.md) describes the shared instance layout and persistence boundary.

## Requested behavior

- Add repeatable progress bars to the Add-ons dashboard and the clock's ordered above/below stacks. A user can keep a date bar and a daily time bar together.
- Date progress uses a selected start date (defaulting to the day the instance is created) and end date. It changes phase color as it advances and has a finished state.
- Daily time progress uses one or more start/end ranges, returns to zero each day, stays finished after the final range, and can hide about one minute after the final finish. It plays a completion animation.
- The Settings preview and desktop clock should show the same value and style. The visual treatment should follow [DESIGN.md](../DESIGN.md) and existing Alpine patterns.

## Decisions applied

| Decision | Selected behavior | Tradeoff |
| --- | --- | --- |
| Multiple time ranges | Each range has its own bar. Each bar stays at 100% after its end until midnight. | Several ranges make the clock taller. |
| Saved add-on type | One repeatable `progress` kind with date, daily-time, and countdown modes. Mode-specific values are retained when switching modes. | Rust validates all option sets on every save. |
| Countdown session | Each Progress countdown has an independent persisted session; the existing numeric Timer remains separate. | Adds a session map and native actions. |
| Countdown fill | Empty to full as elapsed time increases. | The bar shows elapsed progress rather than remaining time. |
| Phase colors | Fixed muted gray, yellow, rose, and green phases, with a brief finish pulse on each daily range. | Colors are not individually configurable. |

The implementation uses local calendar dates and local wall-clock times. The end date must follow the start date; each daily range must end on the same day, be ordered, and not overlap. A progress instance can hold 1–8 ranges. The overall add-on limit remains 16. Cross-midnight ranges would need a separate definition for which day owns completion and auto-hide.

## 2026-10-30 appearance follow-up

Progress bars now show no visible date or time captions in either the clock or Settings preview; range and date labels remain available to screen readers. A per-instance percentage switch starts off. The length slider spans 50–150% of the previous responsive bar width and defaults to 85%, making bars a little shorter. The thickness slider spans 50–200% of the previous responsive height and defaults to 100%. [progress.js](../../src/progress.js) calculates both dimensions from the rendered clock font size, so preview and desktop use the same rules. [addons.rs](../../src-tauri/src/addons.rs) accepts the new fields as optional so existing Progress settings still load with these defaults. The live Windows layout check remains open.

The follow-up passed `npm run test:frontend` (15 tests), `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml` (17 tests). Visual Tauri window checks remain open.

## 2026-10-30 countdown follow-up

Progress now offers countdown mode with a per-instance duration and saved Start/Pause/Reset session. A countdown has one caption-free bar, fills from empty to full, and briefly pulses when complete. Settings controls each countdown separately; modifier-click on its desktop bar toggles it. The numeric Timer remains available with its original number display and controls. [settings.rs](../../src-tauri/src/settings.rs) saves a session map keyed by Progress ID, [timer.rs](../../src-tauri/src/timer.rs) handles actions and completion, and [config_store.rs](../../src-tauri/src/config_store.rs) recovers old settings with no session map. Changing a paused countdown duration resets that instance's session; changing one while it runs is rejected. Removing an instance or leaving countdown mode removes its session. The live Windows interaction check remains open.

The countdown follow-up passed `npm run test:frontend` (17 tests), `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml` (19 tests). These checks cover independent fill, completion pulse, duration reset, native validation, and session serialization. Native window interaction has not been inspected yet.

## Implementation and verification

1. [addons.js](../../src/addons.js) creates independent Progress instances and [settings-addons.js](../../src/settings-addons.js) edits their modes, dates, ranges, and auto-hide option. Invalid edits are rejected before saving.
2. [addons.rs](../../src-tauri/src/addons.rs) validates the options within the existing `ClockSettings.addons` shape. Countdown Progress instances have independent native sessions and commands; [config_store.rs](../../src-tauri/src/config_store.rs) recovers unrelated settings when add-on or session data is invalid.
3. [progress.js](../../src/progress.js) calculates local date and per-range daily percentages, phases, a 1.5-second finish pulse window, and optional hide one minute after the final range. [index.html](../../index.html) and [settings.html](../../settings.html) render those rows using shared [progress.css](../../src/progress.css). Reduced-motion preference removes the animation.
4. [i18n.js](../../src/i18n.js) supplies labels in the four supported languages. [frontend.test.js](../../src/frontend.test.js) covers boundaries, gaps, midnight reset, hide, and instance independence; Rust tests cover validation and existing add-on kinds.
5. `npm run test:frontend` passed (14 tests), `npm run build` passed, and `cargo test --manifest-path src-tauri/Cargo.toml` passed (16 tests) on 2026-10-30. `npm run tauri:dev` compiled and launched the desktop process, then was stopped. Build and Rust tests required the installed toolchain environment. The browser-only preview cannot initialize Tauri APIs and native window inspection was unavailable, so clock, Settings, tray, modifier, persistence, and position behavior still need a live Windows check.

The separate TODO 5 items for a TODO-list add-on and per-add-on modifier-only visibility are outside Add-on 4.
