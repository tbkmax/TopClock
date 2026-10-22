# Capabilities architecture

[default.json](../default.json) is the Tauri capability for the `main` and `settings` windows. It includes core permissions plus frontend event emission to a window and start-dragging access. These permissions support calls in [src/main.js](../../../src/main.js) and [src/settings.js](../../../src/settings.js). See the [parent architecture](../../doc/architecture.md) for the full package.

This folder is a configuration boundary: add permissions only when a frontend feature needs them, and keep window labels aligned with [tauri.conf.json](../../tauri.conf.json). The schema path points to generated metadata in `gen/`; do not hand-edit generated schema files.
