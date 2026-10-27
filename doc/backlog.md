# Project Backlog & Customization Roadmap

This backlog tracks upcoming features, configurability milestones, and planned improvements for TopClock.

## Uninstall coexistence and legacy data

- **Title:** Preserve portable startup and remove legacy data during installed uninstall.
- **Problem or opportunity:** Tauri's NSIS uninstaller removes the shared `TopClock` Run value by name, even if it points to a separate portable copy. Its optional data deletion does not cover the legacy `%APPDATA%\com.maxtc.topclock` migration folder.
- **Desired outcome:** Uninstalling the installed copy leaves a portable copy's sign-in setting intact, while still removing an entry that points to the installed executable. The explicit data-deletion choice also removes legacy TopClock data.
- **Scope:** NSIS uninstall behavior and release documentation.
- **Acceptance criteria:** With both copies present, uninstalling the installed copy preserves a Run value for the portable path; uninstalling when the Run value points to the installed path removes it. Selecting application-data deletion removes the legacy folder, while leaving it untouched when the user does not select deletion.
- **Dependencies and risks:** Any customization must preserve Tauri's update and uninstall behavior. App data is also shared, so users still need an explicit choice before deleting it.
- **Verification:** Test both Run-value cases with an actual NSIS install and uninstall on Windows.
- **Priority:** Medium — affects only users who keep both distribution types, but can silently disable launch at sign-in.

---

## 1. Configurable Proximity Fade Settings

- **Title:** Configurable mouse proximity fade distance and opacity levels
- **Problem or opportunity:** Currently, mouse proximity detection uses a fixed distance threshold (50px) and a fixed faded opacity (8%). Different users have different display DPIs, screen sizes, and preferences for how transparent the clock becomes and at what distance the fade triggers.
- **Desired outcome:** Users can configure:
  - **Proximity trigger distance** (e.g. 0px to 200px, or 0 to disable proximity fade).
  - **Faded opacity level** (e.g. 0% completely invisible to 30% faintly visible).
  - **Transition speed** (e.g. 150ms instant to 500ms smooth fade).
- **Scope:**
  - `src-tauri/src/main.rs`: Dynamic distance calculation threshold in `start_monitor()`.
  - `src/style.css`: Dynamic CSS variable `--faded-opacity`.
  - `src/main.js`: Reactive bindings for proximity preferences.
- **Acceptance criteria:**
  - Setting trigger distance to `0` disables proximity fade entirely.
  - Setting faded opacity to `0%` renders the clock completely invisible when hovered.
  - Changes take effect in real time without restarting the application.
- **Dependencies and risks:** None.
- **Verification:** Adjust settings via UI/config, move cursor towards clock, observe fade behavior and opacity.
- **Priority:** High — Direct follow-up to user request for customizable mouse proximity transparency.

---

## 2. Configurable Modifier Key & Click-Through Behavior

- **Title:** Custom modifier key selection and click-through toggle
- **Status:** Modifier key selection (`Ctrl`, `Alt`, `Shift`) completed in TODO 7. Permanent click-through lock toggle remains on backlog.
- **Problem or opportunity:** Currently `Ctrl` was hardcoded as the interaction modifier key. Some users may prefer `Alt`, `Shift`, or `Windows` key, or want a permanent "click-through lock" toggle.
- **Desired outcome:**
  - Support choosing modifier key: `Ctrl`, `Alt`, `Shift`, or `Win`.
  - Option to toggle click-through mode on/off permanently (e.g. for users who want the widget permanently clickable or locked).
- **Scope:**
  - `src-tauri/src/main.rs`: Virtual key code mapping in `GetAsyncKeyState()`.
  - Frontend dropdown menu: Click-through toggle option.
- **Acceptance criteria:**
  - Changing modifier key to `Alt` properly enables dragging and right-click menu with `Alt`.
  - Releasing modifier key immediately restores `WS_EX_TRANSPARENT`.
- **Dependencies and risks:** Need to avoid conflicting with common OS system shortcuts.
- **Verification:** Change key to `Shift`, hold `Shift`, verify drag and right-click menu work.
- **Priority:** High — Enhances accessibility and workflow integration.

---

## 4. Time Formatting & Display Options

- **Title:** Add optional date and timezone display
- **Problem or opportunity:** The Clock tab now supports H:M:S, H:M, M:S, H, M and S layouts, but the clock only reads local system time and shows no date.
- **Desired outcome:**
  - Optional date subtitle badge (e.g. `Mon, Oct 21`).
  - Custom timezone offset or UTC display.
- **Scope:**
  - `src/time-format.js`: Timezone-aware time parts and date formatting.
  - `index.html`: Conditional rendering of the date.
- **Acceptance criteria:**
  - Selected date and timezone persist and render correctly after restart.
- **Dependencies and risks:** Minimal.
- **Verification:** Change timezone and date display, then restart and compare the clock against known times.
- **Priority:** Medium — Functional utility.

---

## 6. Open Settings from the Clock Menu (Completed)

- **Title:** Add Settings to the Ctrl + right-click menu
- **Problem or opportunity:** The existing separate Settings window opens from the tray, while the clock's Ctrl + right-click menu only shows Quit.
- **Desired outcome:** A Settings item opens the existing Settings window.
- **Scope:**
  - `index.html`: Add the menu item.
  - `src/main.js`: Invoke the existing `open_settings` command.
- **Acceptance criteria:**
  - Ctrl + right-click then Settings opens and focuses the existing window without changing click-through behavior.
- **Dependencies and risks:** Keep the current menu and tray behavior.
- **Verification:** Open Settings from the clock and tray; verify clock interaction returns after closing the menu.
- **Status:** Completed (2026-10-26).
- **Priority:** Medium — Polish and user experience.
