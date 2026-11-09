# Bundled view changelog

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
