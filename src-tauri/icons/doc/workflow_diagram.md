# Icon workflow

This folder has a single image asset and no classes or internal workflow, so a class diagram would be misleading. [tauri.conf.json](../../tauri.conf.json) references [icon.ico](../icon.ico) for packaging; [main.rs](../../src/main.rs) reads the configured default icon for the tray at startup.
