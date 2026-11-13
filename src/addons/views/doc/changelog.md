# Bundled view changelog

### 2026-11-12 - Add Counter controls and reset confirmation

- The Settings Counter editor shows a Reset button with a confirmation dialog; its clock row uses signed-state color and a spoken label. The clock menu shows Count up, Count down, and Stop, without Reset.

## Latest update

### 2026-11-10 - Add Timer preset details

- The Timer editor opens a countdown preset Details dialog and permits mode selection while running. The Settings confirmation and menu disclosures let users reset through a deliberate choice; static fragments and text bindings remain in use.

### 2026-11-09 - Show countries in Region results

- Region results now show city and localized country above the exact zone ID. Country-name queries work without changing the saved IANA ID, and non-Region rows no longer mount the picker.

### 2026-11-09 - Add searchable Region menu

- Replaced the Region clock's full-ID select with a city-search combobox and scrollable results. Pointer and keyboard selection use the existing option editor and preserve saved IANA IDs.

### 2026-11-09 - Share combined-card Edit and fix divider

- A paired card now has one Edit/Done button for both detail panels. Stretching the grid members prevents the center line from ending early when the left editor is taller. Single cards retain their own Edit/Done control.

### 2026-11-09 - Show combined cards and rows

- Settings shows two member editors inside one card with a shared size and switch. The desktop clock and live preview show the members side by side at their retained size ratio. No dynamic HTML or new type fragment was added.
- The Settings card now also presents the two members and their individual editors in left/right columns, with compact controls and a vertical divider.

### 2026-11-08 - Keep Progress Details inside its modal

- The Progress detail fragment has its own content block; the shared footer no longer lays that block out horizontally. Catalog cards place Add left and Details right.

## Earlier updates

### 2026-11-08 - Add a shared Progress Details fragment

- The Progress instance and catalog use Details buttons to open one registered fragment for presets and warning preference. The catalog reserves the detail slot on every card to align Add buttons.


## Added

### 2026-11-07 - Create this folder's documentation

- Added architecture, workflow, changelog, and backlog documents for bundled add-on views.

## Changed

### 2026-11-08 - Link Progress details to shared presets

- Countdown-mode Progress details now expose the same shared preset editor as the Progress catalog card. No per-instance preset data is created.

### 2026-11-08 - Keep view composition with the add-on host

- The Vite fragment helper now lives in the parent `src/addons/` folder. The composed markup and runtime rendering behavior are unchanged; the shared reactive host supplies action labels to these views.

### 2026-11-07 - Compose add-on rows from local fragments

- Shared clock and preview rows plus four type-specific Settings controls now come from local fragments inserted before Alpine starts. The visible add-on order and existing controls remain; no saved data or user action changes. Runtime HTML injection is not used.
