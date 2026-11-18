# Mouse palette frontend changelog

### 2026-11-17 - Follow shared localization folder

- The palette now imports the relocated translation module. Labels and selection behavior remain compatible.

### 2026-11-16 - Move palette into its own frontend folder

- This folder and its four documentation files now sit under `src/` beside the other pages. The palette still uses the shared add-on host and existing native commands; settings require no migration.

### 2026-11-16 - Fit sector labels and toggle Settings

- Measured sector labels now shrink to fit their ring and sector, keeping combined names such as Date+Counter visible when possible; very long names use an ellipsis at the minimum size. Selecting Settings again requests its existing save-and-close flow instead of reopening it.

### 2026-11-16 - Close on release and fit the center label

- The page now hides before awaiting a selected action, so a slow action cannot keep the palette on screen. The center label is the short localized “Cancel”; action errors can still appear briefly after release. The native monitor also hides on release.

### 2026-11-16 - Create the palette folder

- Added this folder and its four documentation files. The optional palette reuses current add-on menu actions and switches, displays up to three rings, and pages crowded first-ring entries. Confirmation-required choices open the existing clock-menu panel. It remains off by default; existing saved add-ons require no migration.
