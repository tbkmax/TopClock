# TopClock

![TopClock Banner](src/assets/images/banner.png)

<p align="center">
  <strong>Always On Top. Zero Interruption.</strong><br>
  A transparent, click-through desktop clock for Windows built with Tauri 2, Rust, and Alpine.js.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows-0078D4?style=flat-square&logo=windows&logoColor=white" alt="Platform" />
  <img src="https://img.shields.io/badge/Tauri-v2-24C8DB?style=flat-square&logo=tauri&logoColor=white" alt="Tauri" />
  <img src="https://img.shields.io/badge/Rust-2021-DEA584?style=flat-square&logo=rust&logoColor=white" alt="Rust" />
  <img src="https://img.shields.io/badge/Alpine.js-v3-8BC0D0?style=flat-square&logo=alpinedotjs&logoColor=white" alt="Alpine.js" />
  <img src="https://img.shields.io/badge/Network-100%25_Offline-success?style=flat-square" alt="Offline" />
</p>

---

## Overview

**TopClock** is a sleek, ultra-lightweight desktop clock that stays pinned above your windows, full-screen games, videos, and IDEs without ever getting in your way. 

By default, the clock is non-intrusive and transparent to input: mouse clicks pass directly through to whatever window is underneath, and approaching the clock with your cursor smoothly fades it out. When you want to adjust or position it, simply hold <kbd>Ctrl</kbd> to unlock full HUD control.

## Key Features

- 👻 **Ghost Click-Through** — Clicks pass straight through the clock window. Play games, click browser tabs, or code without ever misclicking the widget.
- 🖥️ **Multiple Displays** — Show the clock on every connected display by default, choose visible displays in General, and save a separate Ctrl-drag position for each. Clock styling and add-ons stay shared.
- 💨 **Proximity Fade** — As your cursor approaches the clock, it automatically fades to prevent obscuring important UI or text underneath.
- ⌨️ **Ctrl-Driven Interaction** — Hold <kbd>Ctrl</kbd> to drag, reposition, toggle time formats, or open the context menu.
- 🎨 **Deep Customization** — Tailor the clock to your aesthetic:
  - **Layouts**: 6 layout presets (`H:M:S`, `H:M`, `M:S`, `H M S`, `H M`, `M S`).
  - **12 / 24-Hour Modes**: Instant toggle with optional `AM`/`PM` badge.
  - **System Font Picker**: Enumerates fonts installed directly on your Windows PC—works 100% offline.
  - **Styling**: Independent text color, outline color, outline size slider, and font size from 24px to 200px.
  - **Animations**: Independent colon animations and numeric transition effects (fade, slide, flip, pulse, or none).
- 🧩 **Built-in Add-ons** — Add a local date, multiple region clocks, a numeric Countdown/Stopwatch Timer, or multiple Progress bars above or below the clock. Progress can track a date range, separate daily time ranges, or an independent countdown per bar. Bars have no visible captions, an optional percentage, and adjustable length and thickness; daily ranges can hide after finishing. Set add-on order and relative text size (10%–100%) in Settings, optionally show a short weekday after the date, and choose whether region names appear.
- 🌐 **Language choices** — General can follow the Windows user language or use English, Simplified Chinese, Traditional Chinese, or Japanese. The Date add-on's weekday follows the same choice.
- ⌨️ **Optional System-wide Shortcuts** — Enable individual Open Settings, Quit, Timer Start/Pause, and Timer Reset bindings in the Shortcuts tab. They are off by default; the interaction modifier remains active.
- ⚡ **Native Windows Performance** — Written in Rust with direct Win32 API integration, ensuring virtually zero CPU overhead and minimal memory usage.
- 🔒 **Private & Offline** — No network telemetry, no external font CDNs, no web requests. Settings stay on your machine.

---

## Controls & Shortcuts

| Action | Control | Description |
| :--- | :--- | :--- |
| **Move / Reposition** | <kbd>Ctrl</kbd> + **Left Drag** | Drag a clock freely; each display's clock position is saved independently. |
| **Toggle 12 / 24-Hour** | <kbd>Ctrl</kbd> + **Left Click** | Quick-toggle between 12-hour and 24-hour time formats. |
| **Context Menu** | <kbd>Ctrl</kbd> + **Right Click** | Open the clock menu (access Settings or Quit). |
| **Quit Application** | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Q</kbd> | Optional system-wide shortcut, off by default. Enable it in Shortcuts. |
| **Open Settings** | **Left Click Tray Icon** | Open the modern ClickHouse-inspired Settings panel. |
| **Tray Context Menu** | **Right Click Tray Icon** | Access tray options and application exit. |

---

## Configuration & Storage

Current direct-download builds store your configuration locally in your Windows user profile:

- **Settings File**: `%APPDATA%\topclock\settings.json`
- **Auto-Start**: Controlled via the current user's Windows Run registry key (`HKCU\Software\Microsoft\Windows\CurrentVersion\Run\TopClock`).

Settings and desktop positions automatically persist across reboots and app launches.
The MSIX development package may use Windows' per-package AppData redirection. Its installed location and upgrade persistence still need the [package acceptance checks](doc/plan/MSIX_STORE_PLAN.md).

---

## Building from Source

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (MSVC toolchain)
- Visual Studio C++ Build Tools with Windows SDK

If the repository's `.tools/` folder is present, the included scripts configure the toolchain paths automatically.

### Development

```powershell
# Install frontend dependencies
npm install

# Run the app in live development mode
npm run tauri:dev

# Check the frontend logic and build
npm run test:frontend
npm run build
```

### Production Build

To build a standalone executable:

```powershell
npm run tauri:build -- --no-bundle
```

The compiled binary will be placed at:
```
src-tauri/target/release/top_clock.exe
```

To build a full Windows installer (NSIS setup):

```powershell
npm run tauri:build
```

### MSIX Store candidate

An unsigned MSIX can be built with the Windows SDK's MakeAppx:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Build-Msix.ps1 -Version v1.0.0
```

The output is `release-assets/TopClock_tbkmax.TopClock_1.0.0.0_x64.msix`. The default manifest identity is the reserved Partner Center identity (`tbkmax.TopClock`, `CN=508EFCDF-2961-4370-827D-3736CE5AC66A`, publisher display name `tbkmax`). The package is unsigned for Partner Center submission; direct local installation requires a matching trusted signature. Override the three identity parameters only for a separate development identity. Build the Store package locally with this script; GitHub Actions does not build it. **Do not launch `TopClock.exe` from `release-assets/msix-stage-tbkmax.TopClock` to test Store updates:** that directory is packaging input, and a direct executable launch uses the GitHub update path. The tested development registration used a loose manifest, so the Store identity's installed behavior and upgrades still need the [package acceptance checks](doc/plan/MSIX_STORE_PLAN.md). GitHub tag releases provide only the portable ZIP; local NSIS builds remain available with `npm run tauri:build`.

The MSIX uses Evergreen WebView2. If the runtime is missing, TopClock shows a native message pointing to Microsoft's download page before exiting. The runtime is not bundled in the package.

---

## Updates & Releases

Direct builds check GitHub Releases for newer versions and open the release page for the portable ZIP; TopClock does not install that download. Store-installed MSIX builds can check Microsoft Store from Settings and request an available update there. Each new Store version must first be submitted and certified in Partner Center. See the [release guide](doc/feature/UPDATE_SYSTEM.md) for both paths.

## Uninstalling

- **NSIS installer (local or older GitHub build):** Quit TopClock, then use Windows **Settings > Apps > Installed apps > TopClock > Uninstall**. The NSIS uninstaller removes the installed application and its sign-in entry. Select **Delete the application data** in the uninstaller if you also want to erase TopClock settings and cache for this Windows user.
- **Portable ZIP:** Quit TopClock, then run `Uninstall-TopClock.cmd` from the same extracted folder as `TopClock.exe`. It removes that executable and its matching sign-in entry, then asks separately whether to erase shared settings and cache. Delete the remaining cleanup scripts and extracted folder afterward if they contain nothing else you need.

Installer and portable copies share the same TopClock user-data directories and sign-in entry. Deleting data affects both copies. The portable script does not remove other copies in different folders. If both types are present, uninstalling the installed copy also clears their shared sign-in entry; re-enable launch at sign-in from the remaining portable copy if needed. The NSIS data checkbox removes the current TopClock data directories; an older `%APPDATA%\com.maxtc.topclock` migration folder may remain.

