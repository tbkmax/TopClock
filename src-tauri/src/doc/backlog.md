# Rust application backlog

TODO 4's settings-folder command and per-display windows, visibility and positions are implemented. Manual verification with multiple physical displays remains in the [frontend backlog](../../../src/doc/backlog.md).

The Clock tab's reset command now centers visible windows and stores their per-display positions. Its mixed-DPI, disabled-display, click-through, and restart behavior still needs the live Windows check in the [frontend backlog](../../../src/doc/backlog.md).

Use this file for verified unfinished native work. Each item should include problem, desired outcome, scope, acceptance criteria, risks, verification and priority, following [the template](../../../templates/doc/backlog.md).

The runtime module extraction is complete; [main.rs](../main.rs) remains a small entry point and [lib.rs](../lib.rs) owns startup wiring. TODO 7's shortcut persistence, modifier key validation, and dynamic Win32 modifier polling are complete. TODO 3's persistence, validation of independent animation choices and the 24–200 pixel size range, and Windows font enumeration are complete. Existing proposals in the [repository backlog](../../../doc/backlog.md) may be outdated; check [settings.rs](../settings.rs), [interaction.rs](../interaction.rs), and [fonts.rs](../fonts.rs) before adding them here.

## Packaged settings location and startup behavior

- **Title:** Verify the MSIX data path, folder action, and sign-in state in an installed package.
- **Problem or opportunity:** The code compiles but package redirection can make Explorer show a different path from the one Rust reads; StartupTask behavior cannot be proved in an unpackaged process.
- **Desired outcome:** General opens the real settings directory, and the sign-in toggle follows Windows Startup settings while preserving restart and upgrade state.
- **Scope:** [lib.rs](../lib.rs), [window_commands.rs](../window_commands.rs), [startup.rs](../startup.rs), and the generated MSIX manifest.
- **Acceptance criteria:** The folder command reveals the actual `settings.json`; edits, positions, and Timer state survive restart and higher-version package installation; a Windows user-disable cannot be overridden by the app; direct builds keep their Run-key behavior.
- **Dependencies and risks:** Requires signed package installation. If a path change is needed, preserve the schema and avoid an implicit import from direct builds.
- **Verification:** Inspect the file path in an installed package, reopen it from General, and repeat after upgrade and sign-out/sign-in.
- **Priority:** High for Store release correctness.

## Clean Windows WebView2 check

- **Title:** Verify missing-runtime guidance on supported Windows 10.
- **Problem or opportunity:** The [WebView2 preflight](../webview_runtime.rs) compiles, but its missing-runtime path has not run on a clean machine.
- **Desired outcome:** TopClock shows the Evergreen installation page before creating a blank webview and starts normally after installation.
- **Scope:** [webview_runtime.rs](../webview_runtime.rs) and the MSIX acceptance environment.
- **Acceptance criteria:** Windows 10 without WebView2 shows guidance and exits; after Evergreen installation the clock and Settings open; Windows 11 starts normally.
- **Dependencies and risks:** Requires a clean test VM and signed MSIX. Keep the package small and avoid silent runtime downloads.
- **Verification:** Install on clean Windows 10 and Windows 11 images and follow the message's link.
- **Priority:** High before Store submission because a missing runtime prevents startup.

## Timer clock-change resilience

- **Title:** Detect wall-clock jumps in a running Timer session.
- **Problem or opportunity:** Resume-after-restart uses a saved Unix start time. A manual clock change or time synchronization can change apparent elapsed time.
- **Desired outcome:** A running in-process Timer uses a monotonic clock; restart reconciliation explains or bounds an unexpected wall-clock jump.
- **Scope:** [addons.rs](../addons.rs), [timer.rs](../timer.rs), [config_store.rs](../config_store.rs), and Timer state tests.
- **Acceptance criteria:** Forward and backward system clock changes do not cause an in-process timer to jump; restart behavior is defined and tested.
- **Dependencies and risks:** Keep the persisted session format backward compatible and preserve countdown completion at zero.
- **Verification:** Simulate clock jumps in focused Timer tests and check a real Windows session.
- **Priority:** Medium because ordinary sessions work, but manual time adjustments can affect long timers.

## Native refactor smoke verification

- **Title:** Exercise the extracted runtime modules in a live Windows session.
- **Problem or opportunity:** Rust unit tests pass, but this structural refactor has not been manually checked through the clock and Settings windows.
- **Desired outcome:** Confirm that the unchanged command, event, window, and persistence behavior still works in the running app.
- **Scope:** [lib.rs](../lib.rs), [displays.rs](../displays.rs), [interaction.rs](../interaction.rs), [tray.rs](../tray.rs), [settings_commands.rs](../settings_commands.rs), and [window_commands.rs](../window_commands.rs).
- **Acceptance criteria:** Open Settings from the tray and clock menu; change and reload settings; use the configured modifier to interact with the clock and verify click-through after release; save and restore a clock position; confirm Quit and enabled shortcuts; check a second display if available.
- **Dependencies and risks:** Requires an interactive Windows desktop; preserve per-display preferences and the layered click-through style.
- **Verification:** Run `npm run tauri:dev` and exercise the listed flows, then remove this item once checked.
- **Priority:** Medium because the code movement compiled and passed tests, but native window and input behavior requires live confirmation.
