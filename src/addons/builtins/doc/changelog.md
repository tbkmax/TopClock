# Built-in definitions changelog

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
