# Frontend changelog

## Added

### 2026-10-29 - Check and install Store updates from Settings

- Store-installed builds now show **Check for updates** in General and change it to **Update** when Microsoft Store reports a published package. The action asks the Store to install it, while GitHub builds still only open a release page. No settings migration is required; Store-signed installation and update delivery still need live verification.

### 2026-10-29 - Chinese and Japanese language selection

- General now offers System default, English, Simplified Chinese, Traditional Chinese, and Japanese. Settings and clock menu labels switch immediately, and the Date add-on's short weekday follows the effective language in both preview and desktop clocks. Existing settings default to the Windows UI language. No user action is required.

## Changed

### 2026-10-29 - Simplify Settings and keyboard navigation

- Settings now groups add-on, shortcut, update, and save behavior into focused JavaScript modules. Shortcut actions share one row template, and arrow keys plus Home and End navigate the four accessible Settings tabs. No operator action is required.

### 2026-10-29 - Group display controls in General

- General now puts display switches in their own section, separate from app behavior controls. Display labels omit the Windows `\\.\` prefix and space the display number for readability; display identities and saved choices are unchanged. No operator action is required.

## Fixed

### 2026-10-29 - Restore clock preview after a failed Settings save

- If the latest Settings command fails, Settings checks the native saved state. A completed write remains accepted even if its event failed; otherwise Settings and every clock return to saved appearance and add-ons, and Settings reloads the native Timer session. No operator action is required.

### 2026-10-29 - Restore unrestricted clock placement

- Removed the display-edge limits added to Ctrl-drag and resize anchoring during multi-display support. Clocks can again be placed flush with or beyond an edge without being pushed back. No operator action is required.

## Added

### 2026-10-29 - Package-aware update and sign-in Settings

- General shows Microsoft Store update delivery for an MSIX process and hides GitHub installer checks and download actions. Direct builds retain their existing GitHub reminder. The sign-in switch reads Windows' current state after a change and reports a user-disabled task. No saved settings migration is required.

### 2026-10-29 - Reset visible clock positions

- Added a Reset positions button at the bottom of the Clock tab. It centers clocks currently shown on connected displays and reports failures in Settings. Displays switched off in General keep their saved positions. No operator action is required.

### 2026-10-29 - Focused frontend tests

- Added `npm run test:frontend` for save ordering and rollback, shortcut conflicts, tab navigation, and time, Timer and number display helpers. No operator action is required.

### 2026-10-29 - Clock on selected displays

- General now lists connected displays with all clocks enabled by default. A new display appears automatically, and each display can be switched off independently. Ctrl-drag moves only that display's clock; appearance, add-ons, and preview changes reach every clock. No operator action is required.

### 2026-10-29 - Open settings files from General

- Added an Open folder button in General that opens the directory containing `settings.json` and reports an error if Explorer cannot start. No operator action is required.

### 2026-10-27 - Update indicator on General tab

- The General sidebar tab now shows a yellow alert badge when an update is available. The badge clears when a successful check finds the installed version current, and the update status is announced to assistive technology. No operator action is required.

### 2026-10-27 - Date weekday and Region label controls

- Added a Date switch to append a smaller English weekday, such as `10-27 (Tue)`, and a Region clock switch to hide or show its name. Existing add-ons keep their previous display until the user changes these options. No operator action is required.

### 2026-10-27 - Built-in add-ons and system-wide shortcut controls

- Added Date, multiple Region clocks, and a Timer with Countdown and Stopwatch modes to the Add-ons dashboard. Users can place, size, enable, remove and reorder instances above or below the clock. The transparent window measures the combined layout and keeps the main clock anchored where monitor bounds allow.
- Added native Timer Start/Pause and Reset actions from the clock, Settings, conditional clock menu and optional shortcuts. Timer progress resumes after restart; a countdown stops at zero with a visible finished state. Mode or duration changes require a paused timer and warn before clearing recorded time, with an optional saved dismissal.
- Added off-by-default switches for each action shortcut and a warning when Windows cannot register an enabled binding. The interaction modifier remains active. Fresh default Quit binding is `Ctrl+Alt+Q`; an older `Ctrl+Q` binding is migrated. Other stored bindings remain saved. No operator action is required.

### 2026-10-26 - Dedicated Shortcuts tab with conflict detection and modifier selection

- Added a dedicated "Shortcuts" tab to the Settings sidebar and panel in [settings.html](../../settings.html) following DESIGN.md dark theme tokens.
- Provided configurable interaction modifier key (`Ctrl`, `Alt`, `Shift`) and hotkeys for core actions (`open_settings`, `quit`).
- Implemented interactive key capture recording, "Clear" unbind functionality ("None"), and "Reset All Shortcuts to Default".
- Added real-time internal shortcut conflict detection flagging duplicate key combinations with warning banners and badges.
- Visually separated TopClock default shortcuts from Add-on shortcuts, enforcing that add-on shortcuts can only be edited when the add-on is active.
- Added toggle switch for Timer add-on in [settings.html](../../settings.html) to control add-on activation state.
- Bound desktop clock keyboard listeners in [main.js](../main.js) and menu badges in [index.html](../../index.html) to dynamically reflect configured shortcuts.

### 2026-10-26 - Settings option in Ctrl + right-click dropdown menu

- Added a "Settings" action to the clock's Ctrl + right-click dropdown menu in [index.html](../../index.html), invoking `open_settings` to display and focus the Settings window.
- Added a subtle hairline divider between Settings and Quit actions in [index.html](../../index.html) and styled `.menu-icon.settings-icon`, `.menu-icon.quit-icon`, and `.menu-divider` in [style.css](../style.css).
- Updated `scheduleResize()` in [main.js](../main.js) to dynamically calculate dropdown menu height using `$refs.dropdownMenu`, ensuring complete visibility of menu items without window clipping.

### 2026-10-25 - Lightweight GitHub Release update reminder

- Added dynamic version indicator to the Settings sidebar and General preferences tab using `getVersion()` from `@tauri-apps/api/app`.
- Switched update mechanism to lightweight GitHub Releases API polling, replacing heavy in-app dropper plugins to eliminate Windows Defender false positives.
- Added an automatic update check toggle switch ("Automatically check for updates") in [settings.html](../../settings.html) that persists via `update_settings`.
- Added "Check for updates" and "Download Update ↗" buttons opening the browser directly in [settings.html](../../settings.html) and [settings.css](../settings.css).
- Set default development fallback version to `0.0.0` in [settings.js](../settings.js) and [settings.html](../../settings.html).

### 2026-10-24 - Project rename to TopClock in UI

- Updated page titles in [index.html](../../index.html) and [settings.html](../../settings.html) to `TopClock` and `TopClock Settings`.
- Updated settings titlebar brand text to `TOPCLOCK / SETTINGS` and description text.

### 2026-10-22 - Larger clock sizes

- Raised the Clock size slider maximum from 60 to 200 pixels, sized the desktop window vertically with the rendered clock, and made the AM/PM label scale with the clock.
- Scaled large text down in the Settings preview and labeled the scaled view. No operator action is required.

### 2026-10-22 - Independent clock animations

- Added separate colon and number change selectors with independent None choices for the desktop clock and live preview.
- Tracked changes to every displayed numeric part so hour and minute changes animate even when seconds are hidden. No operator action is required.

### 2026-10-22 - Clock tab customization

- Added selectable time layouts, optional AM/PM, outline thickness, installed font names and four animation modes to the Clock tab and desktop clock.
- The preview and desktop display share time formatting, and the clock window adjusts to rendered width. Removed network font requests so both pages work offline.
- Existing settings files without the new fields reset to defaults on launch; users can reapply their preferences. No other operator action is required.

## Changed

### 2026-10-27 - Smaller add-on defaults and concise Timer display

- New add-ons start at 30% of the main clock size, and the size control now reaches 10%. Timer rows show only the time value; the selected mode remains visible in Settings. Existing saved sizes remain unchanged. No operator action is required.

## Fixed

### 2026-10-27 - Add-on slider visibility and clock spacing

- Supplied the missing slider progress value so its track is visible, and shortened the gap above the main clock to balance the space below it. No operator action is required.

### 2026-10-25 - Custom pointer dragging and tight window fit

- Replaced native OS titlebar drag (`startDragging`) with direct pointer coordinate dragging via `requestAnimationFrame` in [main.js](../main.js) and [index.html](../../index.html), bypassing Windows caption clamping and Aero Snap so the window can be placed flush at screen edges without bouncing back.
- Removed top padding from `#app` and `.clock-container` in [style.css](../style.css) so clock numerals can be placed flush against the top edge of the display without an artificial gap.
- Tightened window sizing in [main.js](../main.js) to wrap directly around the clock container instead of forcing an oversized transparent box, dynamically expanding height only when the dropdown menu is opened.
- Preserved initial window position on first resize so the clock does not drift to the right on application launch. No operator action is required.

### 2026-10-22 - Hour display padding and spacing

- Show hours without a leading zero in the desktop clock and Settings preview while keeping minutes and seconds at two digits. The desktop clock now keeps single-digit hours beside the colon. No operator action is required.

### 2026-10-22 - Installed font selection

- Replaced the editable font field and short suggestion list with a dropdown of font families reported by Windows. A missing saved font falls back to an installed family. No operator action is required.

### 2026-10-22 - Folder documentation

- Added this folder's architecture, workflow, changelog, and backlog documents for frontend navigation.
- No operator action is required.
