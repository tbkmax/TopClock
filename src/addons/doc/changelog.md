# Frontend add-on host changelog
## Latest update

### 2026-11-10 - Route Timer menu sections through the host

- Grouped add-ons can expose named menu sections. Timer Mode and Set choices use the same current-instance checks and reactive session store as Progress; native command results cannot replace newer session events.

### 2026-11-09 - Index Region countries for search

- Region editing now matches country names in English and the selected language, city names, and full IANA IDs. The option editor still receives only a selected zone ID; add-on storage and action routing are unchanged.

### 2026-11-09 - Filter Region time zones in Settings

- The Region editor now searches by city or full zone ID while preserving the exact selected `time_zone` value and normal add-on save path. A focused regression test covers `taipei` and exact-ID selection.

### 2026-11-09 - Derive and edit two-member add-on rows

- Added reusable pair layout and editing operations while retaining stable instance IDs and type-specific behavior. Group movement preserves both members; dragging one member out dissolves the pair and removes its shared scale.
- Pointer hit testing now supports left/right member panels and requires a substantial move before splitting on empty space.

### 2026-11-08 - Centralize add-on menu and detail contributions

- Definitions can contribute grouped menu choices and an optional Details fragment. The controller validates menu choices against current instances; the native adapter keeps the preset command mapping in one place.


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
