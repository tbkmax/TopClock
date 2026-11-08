# Frontend add-on host changelog

## Added

### 2026-11-07 - Create this folder's documentation

- Added architecture, workflow, changelog, and backlog documents for the add-on host.

## Changed

### 2026-11-07 - Route built-in add-ons through a shared host

- Date, Region clock, Timer, and Progress now use registered definitions for display and action availability. Clock clicks, Settings buttons, and the existing Timer Reset menu item use one controller and the original native commands. Native session events remain authoritative across windows. Saved settings need no migration or user action.
