# Capabilities changelog

## Added

### 2026-10-29 - Allow runtime clock windows

- Extended the existing clock permissions to `clock-*` windows so every connected display's clock can receive events and resize or move within its display. No operator action is required.

### 2026-10-25 - Lightweight release reminder transition

- Removed `updater:default` and `process:default` permissions from [default.json](../default.json) in favor of lightweight in-browser GitHub Release reminders, avoiding antivirus heuristic dropper flags. No operator action is required.

### 2026-10-22 - Clock window fit

- Allowed the clock frontend to read and set window geometry so long formats and fonts can fit. No operator action is required.

### 2026-10-22 - Folder documentation

- Added this folder's architecture, workflow, changelog and backlog documents.
- No operator action is required.
