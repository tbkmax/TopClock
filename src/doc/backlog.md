# Frontend backlog

TODO 4's Settings files button and multiple-display controls are implemented. Manual verification on two or more physical displays remains; see the item below.

## Multi-display interaction verification

- **Title:** Exercise clock controls on mixed-DPI displays and after display reconnection.
- **Problem or opportunity:** The current development session exposes one physical display, so independent drag, hot-plug, and click-through were not observed live on multiple monitors.
- **Desired outcome:** Each clock keeps its own unrestricted position; shared appearance, add-ons, Timer, and menu actions stay synchronized.
- **Scope:** [main.js](../main.js), [settings.js](../settings.js), and the native display manager in [displays.rs](../../src-tauri/src/displays.rs).
- **Acceptance criteria:** Move a secondary clock without moving the primary; change an add-on or style and see every clock update; unplug and reconnect a display and recover its position and visibility choice. General keeps each switch paired with the correct display label after reconnection and shows no Windows device prefix.
- **Dependencies and risks:** Include different scale factors and display order changes; preserve click-through and tray access if all displays are unchecked. An off-screen clock may require editing its saved position until the planned reset-position control is added.
- **Verification:** Run `npm run tauri:dev` with two physical monitors and exercise each case.
- **Priority:** High for the new display feature.

Use this file for unfinished work specific to [`src/`](../). Add actionable items with a problem, desired outcome, scope, acceptance criteria, risks, verification, and priority, following [the template](../../templates/doc/backlog.md).

Settings save rollback, shared shortcut rows, keyboard tab navigation, and focused frontend tests are implemented. Live Windows interaction checks remain in the multi-display item above and the [native smoke verification backlog](../../src-tauri/src/doc/backlog.md).

## Settings window live verification

- **Title:** Check tab navigation and save recovery in the running Settings window.
- **Problem or opportunity:** The frontend tests and Vite build pass, but the Alpine template and Tauri window were not exercised interactively after the refactor.
- **Desired outcome:** Settings remains operable by pointer and keyboard, and a failed write never leaves a clock showing an unsaved preview.
- **Scope:** [settings.html](../../settings.html), [settings.js](../settings.js), [settings-persistence.js](../settings-persistence.js), [settings-shortcuts.js](../settings-shortcuts.js), and the clock preview in [main.js](../main.js).
- **Acceptance criteria:** Arrow, Home, End, and Tab navigation reach the intended tab and panel; all four shortcut rows can be enabled, recorded, cleared, and show conflicts; a Settings change appears on every clock and persists after reopening; a simulated write failure restores native settings and Timer state in Settings and every clock.
- **Dependencies and risks:** Requires a live Tauri Windows session and a controlled way to cause a settings write failure without harming the user's settings file.
- **Verification:** Run `npm run tauri:dev`, exercise the controls, and use a temporary test configuration for the failure case.
- **Priority:** Medium because the automated checks cover logic and compilation, while native webview behavior remains to be observed.

TODO 2's Ctrl + right-click dropdown menu item for opening the Settings window and TODO 7's dedicated Shortcuts tab with conflict detection are complete. TODO 3's time format, installed font selection, outline, independent colon and number animation controls, and larger clock size range are complete. Hour padding and spacing are fixed: hours show without a leading zero beside the colon while minutes and seconds stay at two digits. See the [repository backlog](../../doc/backlog.md) for other proposals; verify each against current code before taking it on.

## Add-on layout verification

- **Title:** Constrain unusually tall add-on stacks to the visible monitor.
- **Problem or opportunity:** The stack prevents rows from overlapping, but many large region clocks can make the window taller than a small display.
- **Desired outcome:** Users can still see and control every enabled add-on on a small monitor.
- **Scope:** [main.js](../main.js), [style.css](../style.css), and the Add-ons dashboard in [settings.html](../../settings.html).
- **Acceptance criteria:** With 16 allowed instances and the largest clock size, the main clock remains reachable, rows do not overlap, and Settings explains any automatic size reduction or limit.
- **Dependencies and risks:** Preserve the clock anchor and native click-through while fitting content; do not silently remove an add-on or reintroduce position clamping. See the [edge-spacing report](../../doc/report/fix3_top_space_and_bounce_back.md).
- **Verification:** Test small and mixed-DPI monitors with above and below stacks, including the balanced gap around the main clock, dragging, menu opening and position restore.
- **Priority:** Medium because dense custom layouts can clip on small displays even though normal rows never overlap.
