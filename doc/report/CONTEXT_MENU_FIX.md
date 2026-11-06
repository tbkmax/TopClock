# Context menu shadow and outside-click dismissal

Date: 2026-11-06. Implementation branch: `codex/fix-context-menu`.

## Causes

The supplied screenshot is consistent with native viewport clipping. The menu's [CSS](../../src/style.css) draws `0 8px 24px` and `0 2px 6px` shadows. The old [resize code](../../src/main.js) allowed only four logical pixels after the menu's right edge and roughly six after its bottom edge. CSS shadows do not enlarge the element's measured box; neither `overflow: visible` nor a larger z-index can paint outside the native WebView window. Both the document and the native surface have finite bounds. Measuring a transformed menu during its enter animation could also underestimate its final dimensions.

The old [markup](../../index.html) used Alpine `@click.outside`. That observes clicks delivered to the document, not clicks in other applications. There was no native outside-click or focus-loss dismissal. Meanwhile [interaction.rs](../../src-tauri/src/interaction.rs) deliberately kept the whole clock window interactive while `menu_open` was set, so releasing Ctrl did not close the menu or restore click-through.

Window growth also interacted with the centered clock layout: expanding the native width changed the clock's local position and required a compensating native move. Temporary menu geometry could therefore affect the window origin observed by position persistence.

## Solutions and risks

| Solution | Decision | Potential risk |
| --- | --- | --- |
| Reserve shadow space, measure untransformed layout, reveal after resize; reuse the native input monitor plus focus-loss events | Implemented. Retains the custom dark menu and existing menu actions. | **Medium:** touches native sizing and input coordination. Polling can miss a press/release entirely between samples; UI stalls delay dismissal. Test mixed DPI and click-through. |
| Remove or shrink the shadow | Alternative for clipping alone. | **Low:** changes appearance and does not fix outside-click dismissal. A small nonzero shadow can still clip without sufficient bounds. |
| Close only on focus loss | Included as a fallback, insufficient alone. | **Low implementation risk, incomplete coverage:** clicking a window that does not activate, or opening a menu without clock focus, need not generate a focus-loss event. |
| Use the native Windows/Tauri popup menu | Alternative that delegates popup sizing and dismissal to Windows. | **Medium:** changes styling, icons, shortcut presentation, and localization wiring; must preserve Settings, Quit and conditional Timer reset actions. |
| Put the custom menu in a separate native window, with event-driven global mouse observation | Deferred architectural alternative. | **High:** extra window lifecycle, focus ownership, per-display DPI/position coordination, hook cleanup and threading; higher regression surface for a small menu. |

## Implemented behavior

- [menu-layout.js](../../src/menu-layout.js) reserves 48 logical pixels on each side of the menu, including the downward shadow offset. It measures actual menu width and height, including shortcuts, translated labels, and the optional Timer row.
- [main.js](../../src/main.js) uses untransformed element sizes and clock layout offsets. The menu stays hidden until native resizing/repositioning succeeds. Closing hides it immediately before shrinking the native window; the old scale/leave transitions were removed to avoid transient clipping.
- [style.css](../../src/style.css) fixes the clock container at a two-pixel horizontal inset instead of centering it in the temporarily wider window. Opening and closing the menu no longer requires moving the clock's origin. Existing top/right anchoring still accommodates clock content changes.
- DOM capture-phase pointer-down closes the menu outside its element. Native window focus loss and a per-clock `dismiss-menu` event also close it. Escape remains supported.
- The existing 30 ms [Windows monitor](../../src-tauri/src/interaction.rs) observes new left, right, middle and side-button presses and foreground changes. Presses outside the physical window request dismissal; presses inside it send logical coordinates through `menu-pointer-down` so the frontend can distinguish the actual menu from transparent padding. Each event targets its owning clock.
- Held buttons and releases alone do not dismiss the menu. Menu-item mouse-down does not start clock dragging. The monitor observes input without capturing or suppressing another application's click.
- Open/close native commands are serialized. Dismissal uses the existing `set_menu_open(false)` path, after which the monitor restores click-through when the interaction modifier is released. There are no new capabilities, dependencies, threads, persisted fields, or migrations.

The monitor uses only the high current-state bit of `GetAsyncKeyState`. Microsoft documents its low "pressed since" bit as unreliable across applications, so it cannot safely fill gaps between polls. See [Microsoft's API contract](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getasynckeystate).

## Residual risks and verification

**Polling limitation:** A very short click in a nonactivating window can fall entirely between 30 ms samples. Focus-loss/foreground-change detection covers common activating clicks, but this is not a guaranteed global mouse event stream. Pointer motion during a sampling interval can also make the sampled location differ from the exact press location. An event-driven hook or native popup would be the follow-up if this is observable in normal use.

**Display edges:** The fix addresses clipping by the clock's own window. It preserves the repository's unrestricted clock positioning; it does not flip the menu above the clock or clamp it to the monitor work area. A menu placed beyond a physical display edge can still be off-screen. Larger temporary bounds also mean more blank area belongs to the interactive clock window while its menu is open.

**Timing/error handling:** Native events and resizing are asynchronous. A stalled WebView delays acknowledgement and shrinking. Failed commands are logged to the console; a failed resize leaves the menu hidden rather than exposing a clipped surface. No new recovery UI is added.

Verified on this branch:

- `npm run test:frontend`: 20 passed, including shadow-space cases for narrow/large clocks, wide labels and extra rows.
- `npm run build`: passed. The sandbox initially blocked esbuild spawning; the approved build outside the sandbox succeeded.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 25 passed, including three new tests for mouse edges, focus changes, and physical bounds with negative display origins. Existing settings/position round trips, Timer, and native topmost tests also passed. Used repository-local Rust/SDK and installed MSVC paths; the unconfigured shell initially lacked `link.exe`.
- Headless Edge rendered the production frontend with mocked Tauri commands: 48-pixel margins on all sides, unchanged clock anchor over repeated menu cycles, Settings dispatch without drag, DOM outside click, native dismissal, blur, transparent-padding hit tests, Escape, and Japanese labels with a shortcut and Timer row passed. Screenshot inspection showed a continuous shadow. This verifies browser rendering/event wiring, not actual Windows cross-app input.

Live Windows acceptance remains open; native desktop control was unavailable in this session. Run `npm run tauri:dev` and verify:

1. Ctrl-right-click on small and large clocks; release Ctrl and select Settings, Quit, or Timer reset. Check all four shadow edges while opening and closing.
2. Dismiss by left/right/middle/side-button clicks in another app, desktop, another clock, and blank menu padding; verify the destination still gets its click. Repeat while Ctrl is held and after releasing it, plus Alt-Tab and Escape.
3. Check ordinary clock Ctrl-click and Ctrl-drag, proximity fade, and click-through after dismissal. Verify the first-Ctrl white-background regression does not return.
4. Open Settings from both menu and tray; save a change, move the clock, quit and restart. Confirm settings and per-display positions restore. Include a restart after leaving the menu open.
5. Repeat on mixed-DPI monitors, negative desktop coordinates, and screen edges. Record physical off-screen placement separately from clipping at the WebView boundary.

The [frontend backlog](../../src/doc/backlog.md) owns this acceptance checklist, with a cross-reference in the [native backlog](../../src-tauri/src/doc/backlog.md). Rollback is a source revert; user data needs no conversion.
