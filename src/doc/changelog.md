# Frontend changelog

## Added

### 2026-10-22 - Clock tab customization

- Added selectable time layouts, optional AM/PM, outline thickness, installed font names and four animation modes to the Clock tab and desktop clock.
- The preview and desktop display share time formatting, and the clock window adjusts to rendered width. Removed network font requests so both pages work offline.
- Existing settings files without the new fields reset to defaults on launch; users can reapply their preferences. No other operator action is required.

## Fixed

### 2026-10-22 - Installed font selection

- Replaced the editable font field and short suggestion list with a dropdown of font families reported by Windows. A missing saved font falls back to an installed family. No operator action is required.

### 2026-10-22 - Folder documentation

- Added this folder's architecture, workflow, changelog, and backlog documents for frontend navigation.
- No operator action is required.
