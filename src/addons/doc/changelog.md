# Frontend add-on host changelog

### 2026-11-17 - Split add-on regression tests by responsibility

- Moved 27 tests from one add-on test file into eight files under `src/addons/tests/`, separating shared registry, runtime, and layout checks from Date, Region clock, Timer, Counter, and Progress checks. `npm run test:frontend` now discovers test files automatically; add-on behavior and saved data are unchanged.

### 2026-11-17 - Follow shared localization folder

- The add-on model now imports the relocated localization module. Menu and Settings add-on labels retain their existing keys and behavior; no saved settings change is required.

### 2026-11-17 - Open shared Counter glow setting in Details

- Counter now declares an allowlisted Details view for the app-wide 0–100% glow setting, opened only from the catalog. The display model scales the clock's Ctrl-style text glow for clock and preview; older settings use the 50% default without a migration. Counter instance options remain empty.

### 2026-11-17 - Keep Counter direction on its own display member

- Counter's display result now carries active count direction separately from the signed balance color. Single and paired layouts preserve the glyph glow on Counter alone in the desktop clock and Settings preview; saved instances and native sessions are unchanged.

### 2026-11-16 - Remove palette implementation from add-ons

- The palette now consumes the add-on host from `src/palette/`; add-on kinds, actions, and sessions remain unchanged.

### 2026-11-16 - Fit combined palette names

- The palette now scales labels such as Date+Counter to the available sector width. The shared add-on host and saved instance names remain unchanged.

### 2026-11-16 - Dismiss palette before host actions

- Palette release now closes the overlay before the shared host runs a selected add-on action. The action definitions, command routing, and add-on instance data remain unchanged.

### 2026-11-16 - Place the mouse palette beside the add-on host

- Added a dedicated `palette/` folder and its documentation. The palette reads current menu actions and switches from the existing host; it does not create an add-on instance or duplicate action definitions. Its General and Shortcuts controls remain outside the instance dashboard.

### 2026-11-13 - Cover Counter running and stopped colors

- The display regression test now checks positive and negative balances while running and stopped. The clock and preview continue to use the same definition result; action routing and saved sessions are unchanged.

### 2026-11-12 - Supply configured menu switch rows

- The add-on host now lists enabled and disabled instances for the clock menu, combines paired members into one switch row, and routes switch requests to the native settings command. Existing runtime action descriptors remain unchanged; no saved schema changes are required.

### 2026-11-12 - Test Counter's minute-preserving day format

- Display regression coverage now checks two-digit hours and the `D:HH:MM` boundary at 100 hours. The shared host and session routing are unchanged.

### 2026-11-12 - Allow Counter in combined rows

- Counter can now share the existing two-member layout with Date, Region clock, or Timer. Both members keep independent settings and runtime sessions; the shared pair switch and size work as before. Existing saved pairs need no migration.


### 2026-11-12 - Add an independent Counter channel

- The shared add-on host now observes Counter sessions, routes Count up, Count down, and Stop from the clock menu, and permits confirmed Reset from Settings. Existing Timer and Progress state remains separate. No action is required for existing settings.

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
