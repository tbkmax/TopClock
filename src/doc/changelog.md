# Frontend changelog

## Added

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

## Fixed

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
