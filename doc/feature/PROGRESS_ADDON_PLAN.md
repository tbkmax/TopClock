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
| Saved add-on type | One repeatable `progress` kind with a date/time mode. Mode-specific values are retained when switching modes. | Rust validates both sets of options on every save. |
| Phase colors | Fixed muted gray, yellow, rose, and green phases, with a brief finish pulse on each daily range. | Colors are not individually configurable. |

The implementation uses local calendar dates and local wall-clock times. The end date must follow the start date; each daily range must end on the same day, be ordered, and not overlap. A progress instance can hold 1–8 ranges. The overall add-on limit remains 16. Cross-midnight ranges would need a separate definition for which day owns completion and auto-hide.

## Implementation and verification

1. [addons.js](../../src/addons.js) creates independent Progress instances and [settings-addons.js](../../src/settings-addons.js) edits their modes, dates, ranges, and auto-hide option. Invalid edits are rejected before saving.
2. [addons.rs](../../src-tauri/src/addons.rs) validates the options within the existing `ClockSettings.addons` shape. Progress has no native runtime session or new Tauri command; [config_store.rs](../../src-tauri/src/config_store.rs) still recovers unrelated settings when add-on data is invalid.
3. [progress.js](../../src/progress.js) calculates local date and per-range daily percentages, phases, a 1.5-second finish pulse window, and optional hide one minute after the final range. [index.html](../../index.html) and [settings.html](../../settings.html) render those rows using shared [progress.css](../../src/progress.css). Reduced-motion preference removes the animation.
4. [i18n.js](../../src/i18n.js) supplies labels in the four supported languages. [frontend.test.js](../../src/frontend.test.js) covers boundaries, gaps, midnight reset, hide, and instance independence; Rust tests cover validation and existing add-on kinds.
5. `npm run test:frontend` passed (14 tests), `npm run build` passed, and `cargo test --manifest-path src-tauri/Cargo.toml` passed (16 tests) on 2026-10-30. `npm run tauri:dev` compiled and launched the desktop process, then was stopped. Build and Rust tests required the installed toolchain environment. The browser-only preview cannot initialize Tauri APIs and native window inspection was unavailable, so clock, Settings, tray, modifier, persistence, and position behavior still need a live Windows check.

The separate TODO 5 items for a TODO-list add-on and per-add-on modifier-only visibility are outside Add-on 4.
