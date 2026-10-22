# On-Top Clock

A small Windows clock built with Tauri 2, Rust, Alpine.js, and Vite. The Alpine frontend draws the clock and menu; Rust handles the transparent, always-on-top window, pointer pass-through, Ctrl key state, and mouse proximity.

Without Ctrl, clicks pass through the clock to the window underneath. Move the pointer near the clock to fade it. Hold Ctrl to interact:

- Ctrl + drag: move the clock.
- Ctrl + left click: switch between 12-hour and 24-hour time.
- Ctrl + right click: open the Quit menu.
- Ctrl + Q while the clock has focus: quit.

The Windows notification area icon opens Settings on left click and shows Quit on right click. Settings has Clock, Add-ons, and General tabs. Clock colors, size, blinking separators, time format, and the clock's desktop position are saved across launches. General also has a Windows sign-in launch switch. The Add-ons tab previews planned timer and world clock features.

Settings are stored in `%APPDATA%\com.maxtc.ontopclock\settings.json`, not beside the executable. The file is created on first launch. The Windows sign-in launch switch is stored in the current user's Windows Run registry key.

## Build on Windows

Install Node.js, Rust with the MSVC toolchain, and Visual Studio C++ Build Tools with a Windows SDK. If the local toolchain in `.tools/` is present, the npm scripts use it automatically. From the repository root, run:

```powershell
npm install
npm run tauri:dev
```

To build a standalone executable:

```powershell
npm run tauri:build -- --no-bundle
```

The executable is `src-tauri/target/release/on_top_clock.exe`. Run `npm run tauri:build` to also create an NSIS installer.
