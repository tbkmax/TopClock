# Capabilities architecture

[default.json](../default.json) is the Tauri capability for the `main` and `settings` windows. It includes core permissions plus frontend event emission, start-dragging and window geometry access. Geometry reads and writes let [src/main.js](../../../src/main.js) fit the transparent clock window to its rendered text; [src/settings.js](../../../src/settings.js) uses the event permission. See the [parent architecture](../../doc/architecture.md) for the full package.

This folder is a configuration boundary: add permissions only when a frontend feature needs them, and keep window labels aligned with [tauri.conf.json](../../tauri.conf.json). The schema path points to generated metadata in `gen/`; do not hand-edit generated schema files.
