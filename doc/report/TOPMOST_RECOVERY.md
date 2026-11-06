# Clock topmost investigation and recovery

Date: 2026-11-06. Implementation branch: `codex/fix-clock-topmost-recovery`.

## Findings

The code has a confirmed recovery gap; the user's exact intermittent trigger has not yet been reproduced in the application.

1. The main clock gets `alwaysOnTop: true` in [tauri.conf.json](../../src-tauri/tauri.conf.json). Secondary clocks get `.always_on_top(true)` when [displays.rs](../../src-tauri/src/displays.rs) creates them. Neither previously reasserted their Z order after creation.
2. The [interaction monitor](../../src-tauri/src/interaction.rs) already polls every 30 ms, but previously maintained only input behavior, timers, proximity, and position saves. Its click-through frame refresh uses `SWP_NOZORDER`, so pressing/releasing Ctrl does not recover stacking order. This flag is correct for input-style changes and remains in place.
3. Windows topmost windows still have an order relative to other topmost windows. Another app can cover the clock while its `WS_EX_TOPMOST` flag remains set. Restarting recreates the clock and places it back in the topmost order, consistent with the reported workaround. Actual removal of the flag is also possible, but has not been observed in this incident.
4. The locked dependency is Tao 0.37.1. Its Windows `set_always_on_top` updates cached `WindowFlags`; `WindowFlags::apply_diff` returns immediately when there is no flag difference. Repeating the high-level `true` setter is therefore insufficient. Source: `tao-0.37.1/src/platform_impl/windows/window.rs` and `window_state.rs` in the Cargo registry, version recorded by [Cargo.lock](../../src-tauri/Cargo.lock).
5. True exclusive-fullscreen presentation is a separate limitation, not proof of a lost topmost flag. Ordinary desktop stacking cannot guarantee visibility there. Windows secure desktops are also outside this application's desktop.

Microsoft documents the native topmost/activation/geometry flags in [SetWindowPos](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowpos). Its [fullscreen explanation](https://devblogs.microsoft.com/directx/demystifying-full-screen-optimizations/) distinguishes exclusive presentation from composited borderless windows and discusses overlay performance and anti-cheat concerns. The likely incident mechanism above is an inference from source and the restart symptom, not a captured trace of the user's failure.

## Options and risks

| Solution | Status and coverage | Potential risk |
| --- | --- | --- |
| Periodic native `HWND_TOPMOST` refresh | **Implemented.** Repairs lost topmost status and ordering behind other topmost windows, on each visible clock every two seconds. | **Low–medium.** Roughly two seconds of coverage can remain; competing apps that also keep raising themselves can flicker. Small periodic window-manager/compositor work per clock; full-screen overlay presentation may affect game performance. |
| Foreground/Z-order WinEvent hooks plus a slower fallback | Alternative for faster response when desktop events occur. | **Medium.** Callback lifetime, event storms, self-generated events, UI-thread marshaling, and display teardown add complexity. Requires debouncing and still needs a fallback. |
| Tray “Restore clock on top” action | Possible manual fallback using the same native helper. | **Low.** Adds UI/localization work and still requires user action whenever the fault recurs. Does not solve automatic recovery alone. |
| Use borderless/windowed mode for affected games | Operational workaround for true exclusive-fullscreen limitations. No app code change. | **Low–medium.** Game-specific latency, performance, HDR, or presentation differences need checking. |
| Toggle topmost off/on or recreate the clock automatically | Not selected; native reassertion avoids needing either. | **Medium–high.** Temporary stacking loss/flicker; recreation can interrupt webview/menu/drag state and requires careful position restoration. |
| Inject a game overlay or use privileged desktop mechanisms | Not selected; a separate product/architecture decision. | **High.** Anti-cheat compatibility, security/deployment requirements, stability and graphics performance risks. Ordinary always-on-top recovery does not justify this scope. |

Checking only `WS_EX_TOPMOST` is insufficient: it misses ordering among topmost windows. Calling `set_always_on_top(true)` periodically is also insufficient with the cached Tao implementation described above.

## Implemented behavior

[topmost.rs](../../src-tauri/src/topmost.rs) queues native recovery on the Tauri UI thread. The HWND is resolved there instead of retaining another raw handle across display destruction. The callback rechecks that the clock is visible and not minimized, then calls `SetWindowPos(HWND_TOPMOST)` with `SWP_NOACTIVATE`, `SWP_NOMOVE`, `SWP_NOSIZE`, and `SWP_NOOWNERZORDER`.

The [existing monitor](../../src-tauri/src/interaction.rs) schedules recovery on the first visible pass, and at most once per two seconds afterward. Observing a hidden clock resets the timestamp so re-enabling it schedules immediate recovery. Hidden/minimized clocks are never shown or restored by this helper. Dispatch/native failures are written to stderr and retried on a later interval; release builds do not add a persistent diagnostic log.

The fix adds no thread, permission, saved field, migration, command, or frontend event. Click-through remains controlled by the existing code. Recovery does not request focus, size or position changes. It does not promise to defeat continuously competing overlays, exclusive fullscreen, a blocked UI thread, or other desktops.

## Verification

- Native regression tests create transparent, off-screen Win32 windows and exercise actual desktop stacking. They test both a still-topmost window covered by a competitor and forced removal of topmost status; recovery must preserve extended input styles, geometry, and the foreground window.
- A second native regression test checks that hidden/minimized windows remain excluded.
- `cargo test --manifest-path src-tauri/Cargo.toml`: **22 passed, 0 failed**, including both native recovery tests, input-style transitions in both directions, existing position restoration, settings round trips, and Timer/add-on tests. Used the repository-local Rust toolchain and Windows SDK with the installed MSVC compiler/include paths; initial attempts without the complete compiler environment failed before the final successful run.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` and `git diff --check`: passed.
- No frontend source or settings schema changes are needed.
- Full application UI acceptance was not run: tray/menu interaction, visual Ctrl behavior, actual sleep/resume, games, and physical monitor changes remain unverified. Native test windows do not substitute for those checks.

Manual acceptance still required with the affected applications:

1. Run the branch with `npm run tauri:dev`; move the pointer away to avoid confusing intentional proximity fade with coverage.
2. Launch a competing topmost application after the clock, then repeatedly Alt-Tab and enter/leave borderless fullscreen. Check recovery without restarting and confirm the active app keeps keyboard focus.
3. Repeat after sleep/resume, lock/unlock, and monitor reconnect. Check every enabled display, disable/re-enable a display, and confirm disabled clocks remain hidden.
4. Hold/release Ctrl (or the saved modifier), drag, use the clock menu, and click through the clock area. Check the first-Ctrl white-background regression does not return.
5. Open Settings via tray and clock menu, save a change, move clocks, quit from tray, and restart. Confirm settings and per-display positions restore.
6. Test true exclusive fullscreen separately and record any remaining limitation without claiming that desktop Z order fixes it.

The [native backlog](../../src-tauri/src/doc/backlog.md) tracks this acceptance work. Rollback consists of reverting the recovery module and its monitor wiring; no user-data rollback is necessary.
