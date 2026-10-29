# Icon workflow

This folder has static image assets and no classes or internal workflow, so a class diagram would be misleading. [tauri.conf.json](../../tauri.conf.json) references [icon.ico](../icon.ico) for the direct build; [Build-Msix.ps1](../../../scripts/Build-Msix.ps1) copies the three MSIX PNGs into its staged package. [main.rs](../../src/main.rs) reads the configured default icon for the tray at startup.
