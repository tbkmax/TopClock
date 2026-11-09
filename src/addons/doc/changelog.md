# Frontend add-on host changelog

## Added

### 2026-11-07 - Create this folder's documentation

- Added architecture, workflow, changelog, and backlog documents for the add-on host.

## Changed

### 2026-11-08 - Expose Progress actions in the clock menu

- Progress countdown action descriptors now provide Start/Pause and Reset to the clock menu for each enabled instance. Existing host dispatch and reactive session updates remain the source of those labels.

### 2026-11-08 - Give each webview one reactive add-on host

- `host.js` now constructs the controller and one reactive Timer/Progress session store. The clock, Settings, and action descriptors read that same store, removing page-side session copies that left Start/Pause labels stale.
- Moved the shared instance/display model, Progress styles, and Vite fragment helper into `src/addons/`; removed the top-level add-on import shims. Add-on regression tests now live in this folder. Saved settings, native commands, and events are unchanged.

### 2026-11-07 - Route built-in add-ons through a shared host

- Date, Region clock, Timer, and Progress now use registered definitions for display and action availability. Clock clicks, Settings buttons, and the existing Timer Reset menu item use one controller and the original native commands. Native session events remain authoritative across windows. Saved settings need no migration or user action.
