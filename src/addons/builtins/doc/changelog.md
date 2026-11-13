# Built-in definitions changelog

### 2026-11-12 - Retain minutes in the long Counter format

- At 100 total hours, Counter now displays `D:HH:MM`. The shorter `H:MM:SS` format remains, including two-digit hour values from 10 through 99.

### 2026-11-12 - Show Counter seconds below 100 hours

- Counter now shows `H:MM:SS` while its total hours are below 100. At 100 hours it still switches to `D:HH`; its signed color and saved balance are unchanged.


### 2026-11-12 - Add signed Counter display and actions

- A new Counter shows accrued or spent time in green or rose without a minus sign. It scales from hours and minutes to days and hours at 100 hours, and offers Count up, Count down, and Stop through its menu group. It has no modifier-click action.

## Latest update

### 2026-11-10 - Add Timer modes and independent presets

- Timer now declares Mode and countdown Set choices, its own preset editor, and Start/Pause in the clock menu. Shared preset helpers keep list bounds and confirmation behavior aligned with Progress without sharing saved lists.

### 2026-11-09 - Bundle IANA country associations

- Added a versioned IANA zone-to-country map and indexed localized/English country names alongside cities and IDs. Tests cover country queries and map coverage for every zone reported by the test runtime.

### 2026-11-09 - Add Region city search state

- Added city/full-ID filtering and local keyboard selection state for the Region picker. Selecting a result still stores the exact IANA zone ID; an unselected query is discarded.

### 2026-11-08 - Declare Progress menu choices and Details

- Progress now declares shared preset choices, reset warning metadata, and its details view key alongside its existing action descriptors.


## Added

### 2026-11-07 - Create this folder's documentation

- Added architecture, workflow, changelog, and backlog documents for the four built-in definitions.

## Changed

### 2026-11-08 - Make Progress countdown actions available in the menu

- Progress's existing toggle and reset descriptors now include the clock-menu role. Their per-instance state and Settings controls remain shared through the add-on host.

### 2026-11-08 - Keep Progress styling and session edits with its type

- Moved `progress.css` beside Progress calculations and controls. Timer and Progress editors now reset draft sessions through the single reactive add-on host; the former top-level Progress import shim was removed. Saved options and native action behavior are unchanged.

### 2026-11-07 - Give each add-on its own behavior module

- Defaults, descriptions, display formatting, Settings rules, and available actions now live with their add-on type. The existing options, display values, and saved settings format remain compatible; no user action is required.
- Moved Progress date, range, countdown, and pulse calculations into `progress-display.js`; the prior top-level import path remains a re-export.
