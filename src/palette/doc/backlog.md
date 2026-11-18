# Mouse palette frontend backlog

The localization import move is complete. Existing live palette checks below still cover language layout and modifier release behavior.

## Live radial interaction acceptance

- **Title:** Check the palette with physical mouse and modifier input.
- **Problem or opportunity:** Pure model tests and a Vite build cannot prove WebView event timing, the handoff to the existing menu confirmation, or SVG visibility at monitor edges.
- **Desired outcome:** Holding the configured key shows the current menu tree; changing branches and releasing acts once or cancels, without catching desktop clicks.
- **Scope:** [palette.js](../palette.js), [palette-model.js](../palette-model.js), [palette.css](../palette.css), and the [native monitor](../../../src-tauri/src/palette.rs).
- **Acceptance criteria:** Exercise all three rings, More/Back, one-key-release action and center cancellation, fast release, confirmation/cancel, disabled choices, changed add-on state, multiple displays, mixed DPI, screen edges, Alt-Tab, Escape, and mouse-click cancellation. Check Date+Counter and longer localized/custom names in crowded sectors. Select Settings twice to verify open, pending-save flush, and close; check minimized Settings restores. Verify Quit, error display, and click-through restoration.
- **Dependencies and risks:** Requires an interactive Windows desktop and disposable settings profile. The user chose to keep circles centered on the pointer even near a screen edge, so clipped sectors are expected. Verify that releasing in the center cancels and the user can retry from farther inward.
- **Verification:** Use `npm run tauri:dev` and the [parent checklist](../../doc/backlog.md#mouse-palette-live-windows-acceptance); record physical results.
- **Priority:** High before release because input and window behavior are the feature's core contract.
