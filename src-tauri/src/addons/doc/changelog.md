# Native add-on changelog

## Added

### 2026-11-07 - Create this folder's documentation

- Added architecture, workflow, changelog, and backlog documents for native add-on modules.

## Changed

### 2026-11-07 - Separate native validators and action service

- Built-in options and session rules now have named modules, while Timer commands and shortcuts route through one typed action service. Saved fields, command names, events, rollback, and existing cleanup behavior remain compatible. No user migration is required.
