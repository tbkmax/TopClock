# Frontend backlog

## Memory failure release acceptance

- **Problem and outcome** — Partner Center reported uncategorized memory failures for 1.0.0.0. The hidden preview timer has been corrected, while the production failure cause remains open.
- **Scope and acceptance** — Run the [memory sampler](../../scripts/Measure-TopClockMemory.ps1) for at least an hour per scenario with one/two displays, Settings closed/open, and representative add-ons. Compare baseline and patched builds under the same conditions and investigate sustained private-memory growth or process exits.
- **Dependencies and verification** — Use a Store-installed candidate for package-specific behavior. Include minimize/restore, tray opening, Ctrl interactions, timer completion, display reconnects, persisted settings and positions. Short standalone tests supplement this coverage.
- **Priority** — High before claiming the Store-reported memory failures are resolved.

## Context menu live Windows acceptance

- **Problem and desired outcome:** Automated layout and mocked-native browser checks pass, but the actual WebView must show an unclipped shadow and dismiss on outside input without leaving click-through disabled or shifting saved positions.
- **Scope:** [main.js](../main.js), [menu-layout.js](../menu-layout.js), [style.css](../style.css), [index.html](../../index.html), and [interaction.rs](../../src-tauri/src/interaction.rs).
- **Acceptance criteria:** Complete the [five-step native checklist](../../doc/report/CONTEXT_MENU_FIX.md#residual-risks-and-verification), including menu actions, tray, all mouse buttons, modifier hold/release, Escape, Alt-Tab, settings persistence and restart, and mixed-DPI/negative-origin displays. Distinguish off-screen placement from WebView clipping.
- **Dependencies and risks:** Requires an interactive Windows desktop; 30 ms polling can miss short nonactivating clicks and samples pointer location after the exact press. The enlarged menu surface and native resize timing need live checks. Physical display-edge fitting remains a separate limitation.
- **Verification:** Run `npm run tauri:dev`; record results against the report. Browser rendering alone cannot verify Windows input delivery.
- **Priority:** High before release because this change touches input and window geometry.

## Add-on dashboard live verification

- **Title:** Check the compact Add-ons tab in the running Settings window.
- **Problem or opportunity:** The redesigned Alpine markup and Vite build have not been checked in the native WebView at the fixed 760 × 650 window size.
- **Desired outcome:** Configured add-ons are reachable immediately, drag ordering and placement work across the clock block, and catalog, detail, and preview disclosures stay usable with many instances and translated labels.
- **Scope:** [settings.html](../../settings.html), [settings-addons.js](../settings-addons.js), [settings.css](../settings.css), and [i18n.js](../i18n.js).
- **Acceptance criteria:** With zero, one, and 16 instances, the first view exposes the configured list; Add scrolls to a catalog that opens and closes; adding an item returns to the list; each Edit button controls only its own details. A dragged card visibly follows the pointer, shows a drop indicator, and settles before or after another row, across the clock block, or into an empty stack when released; releasing outside cancels the move. The main clock and preview match the saved order after reopening. Arrow keys on a focused handle make the same moves. Enable switches and Timer actions still work; the preview opens and updates; keyboard focus and labels remain usable in all supported languages.
- **Dependencies and risks:** Requires a running Windows Tauri session. Use a disposable settings file when filling the list.
- **Verification:** Run `npm run tauri:dev` and exercise the Add-ons tab at the fixed Settings size and with keyboard navigation.
- **Priority:** Medium because automated frontend checks and build do not render the native WebView.

## Progress add-on live verification

- **Title:** Verify Progress bars in the running Windows clock and Settings.
- **Problem or opportunity:** Frontend tests, Vite build, and native validation tests pass, but the Tauri clock and Settings UI have not been exercised interactively after the new controls and bars were added.
- **Desired outcome:** Multiple independent date, daily-time, and countdown instances render, save, restore, and resize cleanly without affecting other add-ons or clock input behavior.
- **Scope:** [progress.js](../progress.js), [progress.css](../progress.css), [settings-addons.js](../settings-addons.js), [settings.html](../../settings.html), and [index.html](../../index.html).
- **Acceptance criteria:** Add and edit several Progress instances; switch modes while retaining prior values; reject invalid times and overlapping ranges on a shared weekday while accepting overlap on different weekdays without losing saved values. Confirm bars have no visible captions, percentages start off and can be switched on per instance, and length and thickness sliders affect only the selected instance in both clock and preview. Check an older Progress configuration without the new fields. Confirm the week grid remains usable with eight ranges at the fixed window size, time-row editing and removal, one-day and multi-day selections, Every day reset, legacy ranges with no weekday field, no bars on unscheduled days, the final scheduled range's auto-hide time, and the next scheduled day's reset. Confirm every scheduled range's fill and pulse. Start, pause, reset, finish, and restart two independent Progress countdowns while the numeric Timer runs; verify modifier-click targets only its bar and saved state survives restart. Verify Minutes saves before Start, stays locked through Pause and restart, then becomes editable after finish or Reset; check the running hint and Start hover contrast. Check tray actions, modifier drag/click-through, settings persistence, and position restore with above and below stacks.
- **Dependencies and risks:** Requires a running Tauri Windows desktop. Large stacks can exceed a small display; see the add-on layout item below. Daylight-saving transitions can skip or repeat local wall-clock times and need explicit observation.
- **Verification:** Run `npm run tauri:dev` with a disposable settings file and inspect the listed flows around short test ranges, then restart. Check a small display or reduced resolution and a second display if available.
- **Priority:** High before treating the UI as fully verified because the browser-only preview cannot initialize Tauri APIs.

## Language layout and live package check

- **Title:** Verify translated Settings and weekday display in running direct and MSIX builds.
- **Problem or opportunity:** Automated locale tests and the Vite build cannot show clipping, installed font fallback, or packaged Windows language selection.
- **Desired outcome:** All four explicit languages and System default remain readable in Settings, the clock menu, Date preview, and desktop clocks.
- **Scope:** [i18n.js](../i18n.js), [settings.html](../../settings.html), [index.html](../../index.html), and the native locale command in [locale.rs](../../src-tauri/src/locale.rs).
- **Acceptance criteria:** On Chinese and Japanese Windows UI languages, a new or `system` preference shows the corresponding short weekday; explicit choice overrides Windows; Settings and menu text fit without clipping; a restart keeps the choice.
- **Dependencies and risks:** Requires Windows installations with those UI languages and a signed MSIX for the package check. Preserve click-through and existing numeric time layouts.
- **Verification:** Run `npm run tauri:dev`, exercise all language choices and Date weekday on the clock and preview, then repeat System default and restart checks in an installed MSIX.
- **Priority:** High before claiming packaged localization is visually verified.

TODO 4's Settings files button and multiple-display controls are implemented. Manual verification on two or more physical displays remains; see the item below.

## Packaged General-tab verification

- **Title:** Check General from an installed MSIX.
- **Problem or opportunity:** Frontend tests and build confirm the code paths, but a packaged webview has not been exercised interactively.
- **Desired outcome:** Store users can check for and install a published Store update inside Settings without seeing a GitHub download prompt, and the sign-in switch reflects Windows Startup settings.
- **Scope:** [settings.html](../../settings.html), [settings.js](../settings.js), and [settings-updates.js](../settings-updates.js).
- **Acceptance criteria:** A first Store version shows Check Microsoft Store and no GitHub request; after a higher-version private submission is published, the button becomes Update, the Store permission dialog appears, and the update installs. Cancellation or failure keeps a retry action. Windows disabling startup is reflected and reported; direct builds identify GitHub Releases and only open the release page.
- **Dependencies and risks:** Requires signed MSIX installation; keep the direct build behavior intact.
- **Verification:** Open General in both installed MSIX and direct builds, test two increasing private Store versions, and check Windows Startup settings changes.
- **Priority:** High before Store submission.

## Multi-display interaction verification

- **Title:** Exercise clock controls on mixed-DPI displays and after display reconnection.
- **Problem or opportunity:** The current development session exposes one physical display, so independent drag, hot-plug, and click-through were not observed live on multiple monitors.
- **Desired outcome:** Each clock keeps its own unrestricted position; shared appearance, add-ons, Timer, and menu actions stay synchronized.
- **Scope:** [main.js](../main.js), [settings.js](../settings.js), and the native display manager in [displays.rs](../../src-tauri/src/displays.rs).
- **Acceptance criteria:** Move a secondary clock without moving the primary; change an add-on or style and see every clock update; unplug and reconnect a display and recover its position and visibility choice. General keeps each switch paired with the correct display label after reconnection and shows no Windows device prefix.
- **Dependencies and risks:** Include different scale factors and display order changes; preserve click-through and tray access if all displays are unchecked. The Clock tab now resets visible clocks to their display centers; a display switched off in General keeps its saved position.
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
