# TODO 5: Add-on system design proposal

Status: implemented in the working tree on 2026-10-27; build and unit checks pass. Interactive Windows behavior still needs user review.

## Before implementation

- [The Add-ons tab](../../settings.html) has a Timer toggle and a placeholder World clocks card. There is no date, region clock, timer display, add-on ordering, or placement control.
- [Rust settings](../../src-tauri/src/settings.rs) persist `timer_addon_enabled` and timer shortcut strings. The timer shortcuts currently have settings controls but no action handler.
- [The clock UI](../../src/main.js) resizes the transparent window to its content and keeps its right edge fixed. [Native input handling](../../src-tauri/src/main.rs) enables pointer input only while the configured modifier is held or the clock menu is open. Shortcut matching in the webview requires keyboard focus.
- The repository's [visual language](../DESIGN.md) uses a black settings surface and yellow accent. The desktop clock is otherwise transparent and uses the configurable clock appearance.

## Implemented boundaries

1. **Catalog and instances.** A fixed catalog defines each built-in add-on type and its available options. A separate, ordered list of instances records stable IDs, type, enabled state, placement (`above` or `below`), relative text size, and type-specific options. The list supports repeated region clocks. The catalog supplies labels, defaults and formatters; saved data never contains executable markup or code. This release does not install third-party add-ons.
2. **Validated durable settings.** Rust owns saved add-on configuration, validates IDs, types, option values, sizes, counts, and order, and migrates the existing `timer_addon_enabled` value. Existing files must continue to load. Invalid add-on data must not silently reset unrelated clock settings. Add-on runtime state, such as a running timer, stays separate from appearance and layout preferences.
3. **One layout owner.** A single clock layout component renders a main clock plus ordered `above` and `below` stacks. Normal document flow and measured bounds reserve space for every enabled add-on; add-ons do not position themselves over siblings. The window resize logic measures the entire group, including the menu. The main clock's top and right screen coordinates remain anchored when the stack changes, subject to monitor bounds.
4. **Per-type behavior.** Date formats the local calendar date. Region clock formats a selected named time zone while inheriting the main clock's font, color, outline, time layout, 12/24-hour choice, and animation settings. One Timer add-on switches between Countdown and Stopwatch while paused; a running session resumes after restart. Changing mode or duration with recorded time asks before resetting, with a saved “Don't show this again” choice. All keyboard binding controls remain exclusively in the Shortcuts tab.
5. **Interaction boundary.** Modifier-click on the timer acts on the timer without triggering the main clock's format toggle. The clock menu adds Reset timer only while Timer is enabled. Native click-through remains the default. Action shortcuts are registered system-wide only when their individual switch is on; all four switches start off. The modifier has no off switch. Registration errors are shown in Settings.

## Settings experience

The Add-ons tab has a dashboard of instances with placement, order, relative text size and enable controls. Catalog cards add an instance; its dashboard card exposes type-specific options and a Remove action. Up/Down buttons provide keyboard-accessible reordering. A live group preview follows the desktop stack rules. Date format and region selection are here; shortcut capture remains in Shortcuts. Disabled add-ons retain their preferences until removed.

## Implementation and verification

1. Rust validates and migrates add-on settings, persists Timer sessions, and registers enabled hotkeys. Unit tests cover add-on constraints, Timer resume/completion and hotkey parsing.
2. The frontend shares add-on formatting and renders ordered above/below stacks in the clock and Settings preview.
3. The dashboard controls Date, multiple Region clocks and Timer; a conditional menu action resets Timer. The Timer mode warning can be permanently dismissed.
4. The affected code-folder documents were updated while preserving existing history. The pre-existing local edits in TODO and Completed were not overwritten.
5. `npm run build` and `cargo test --manifest-path src-tauri/Cargo.toml` passed. The app launched in Windows development mode. Manual clock, settings, tray, modifier, timer, hotkey conflict, persistence and position checks remain to be reviewed.

## Product decisions applied

- Built-in types only for now; the schema and catalog leave a small per-type extension point for a future built-in.
- One Timer with Countdown and Stopwatch modes; running sessions resume after restart and a countdown stops at zero.
- Individually enabled, off-by-default action shortcuts work system-wide. The interaction modifier remains active. Fresh Quit default is `Ctrl+Alt+Q`.
- Multiple region clocks are allowed.
- The main clock stays anchored as stacks change, within monitor bounds.

The first implementation deliberately excludes third-party executable add-ons. Supporting them would require a separate trust, capability and compatibility design.

## Adding another built-in add-on

1. Add its catalog entry and display formatter to [addons.js](../../src/addons.js). The clock's above/below stack and Settings dashboard ordering, placement, size, enable and removal controls are shared, so they do not need a new layout path.
2. Add one options validation branch in [addons.rs](../../src-tauri/src/addons.rs), plus a focused validation test. This keeps untrusted settings JSON at the native boundary and does not change `PersistedConfig` or window construction.
3. Add only the new type-specific controls to [settings.html](../../settings.html) and their update method to [settings.js](../../src/settings.js). A display-only add-on needs no new Tauri command. An interactive add-on should use a narrowly scoped native command and, if it needs a system-wide action, an explicit shortcut registration entry.

This extension path is for built-in code shipped with TopClock. The shared instance shape avoids a backend schema migration for another simple display add-on; its options still require native validation.
