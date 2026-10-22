# Project Backlog & Customization Roadmap

This backlog tracks upcoming features, configurability milestones, and planned improvements for the Always-On-Top Clock widget.

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
- **Problem or opportunity:** Currently `Ctrl` is hardcoded as the interaction modifier key. Some users may prefer `Alt`, `Shift`, or `Windows` key, or want a permanent "click-through lock" toggle.
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

## 3. Clock Appearance & Typography Customization

- **Title:** User-customizable fonts, colors, and outline styles
- **Problem or opportunity:** The font color defaults to white (`#ffffff`) with a 1.5px black outline (`#000000`). While CSS variables `--clock-font-color`, `--clock-outline-color`, and `--clock-outline-width` are structured for customization, there is currently no runtime UI or config mechanism to change them.
- **Desired outcome:**
  - Custom font color picker (supporting `#ffffff`, electric yellow `#faff69`, neon cyan, etc.).
  - Custom outline thickness (0px to 4px) and outline color.
  - Font family selection (JetBrains Mono, Inter, Consolas, Segoe UI).
  - Font size scaling slider (e.g. 24px to 72px).
- **Scope:**
  - `src/style.css`: `:root` CSS variables update dynamically.
  - `src/main.js`: Color and font state management.
  - `src-tauri/src/main.rs`: Dynamic window resize if font size scale changes.
- **Acceptance criteria:**
  - Applying custom outline thickness and color updates text stroke and shadow instantly.
  - Preserves legibility over both bright and dark backgrounds.
- **Dependencies and risks:** High stroke thickness (>4px) can distort smaller fonts if `paint-order: stroke fill` is not respected.
- **Verification:** Test custom color combinations against various wallpaper backgrounds.
- **Priority:** Medium — Visual personalization.

---

## 4. Time Formatting & Display Options

- **Title:** Extended clock display formats (Seconds toggle, Timezone, Date)
- **Problem or opportunity:** Clock currently displays `HH:MM:SS` (24h/12h). Users may want to hide seconds for minimal distraction, show the date, or select an alternate timezone.
- **Desired outcome:**
  - Toggle seconds display on/off (`HH:MM` vs `HH:MM:SS`).
  - Optional date subtitle badge (e.g. `Mon, Oct 21`).
  - Custom timezone offset or UTC display.
  - Colon animation toggle (pulsing vs static).
- **Scope:**
  - `src/main.js`: Time format string builder.
  - `index.html`: Conditional rendering of seconds and date pill.
- **Acceptance criteria:**
  - Hiding seconds stops the second-tick animation and reduces window width appropriately.
- **Dependencies and risks:** Minimal.
- **Verification:** Toggle seconds, check layout centering and synchronization with system clock.
- **Priority:** Medium — Functional utility.

---

## 5. Persistent Local Configuration File (JSON)

- **Title:** Local JSON settings persistence and auto-load
- **Problem or opportunity:** Any customized settings are lost upon closing the app.
- **Desired outcome:**
  - Settings automatically persist to `%APPDATA%/On_top_clock/config.json`.
  - Loaded automatically during app startup in `src-tauri/src/main.rs`.
- **Scope:**
  - `src-tauri/src/main.rs`: Config read/write commands.
  - `src/main.js`: Tauri command calls for configuration loading.
- **Acceptance criteria:**
  - If config file does not exist, default values are generated safely.
  - Modifying settings immediately saves without file corruption.
- **Dependencies and risks:** File permission handling on Windows.
- **Verification:** Modify settings, restart application, verify all settings persist.
- **Priority:** High — Prerequisite for all custom settings to be meaningful across sessions.

---

## 6. ClickHouse-Styled Settings Modal UI

- **Title:** In-app settings panel conforming to DESIGN.md
- **Problem or opportunity:** Need an intuitive UI to adjust all the above settings rather than manually editing config files.
- **Desired outcome:**
  - A modal panel opened from the Ctrl+Right-Click dropdown menu ("Settings...").
  - Designed strictly following `doc/DESIGN.md` (canvas `#0a0a0a`, cards `#1a1a1a`, yellow `#faff69` primary controls, Inter typography).
- **Scope:**
  - `index.html`: Settings modal component with tabs.
  - `src/style.css`: Settings form controls and slider styles.
- **Acceptance criteria:**
  - Modal animations follow Alpine.js transition styling.
  - Modal can be closed with `Esc` or clicking the close button.
- **Dependencies and risks:** Requires expanding window size or opening a secondary settings window.
- **Verification:** Open settings, change settings, verify instant feedback.
- **Priority:** Medium — Polish and user experience.
