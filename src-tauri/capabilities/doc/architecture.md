# Capabilities architecture

[default.json](../default.json) is the Tauri capability for `main`, `settings`, and runtime `clock-*` windows. It includes core permissions plus frontend event emission, start-dragging and window geometry access. Geometry reads and writes let [src/main.js](../../../src/main.js) fit each transparent clock window to its rendered text and position it without display-edge limits; [src/settings.js](../../../src/settings.js) broadcasts previews to all clocks. See the [parent architecture](../../doc/architecture.md) for the full package.

This folder is a configuration boundary: add permissions only when a frontend feature needs them. `main` and `settings` are configured in [tauri.conf.json](../../tauri.conf.json); `clock-*` labels are created by [main.rs](../../src/main.rs). The schema path points to generated metadata in `gen/`; do not hand-edit generated schema files.
