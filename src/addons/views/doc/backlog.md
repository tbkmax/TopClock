# Bundled view backlog

Check the Region search list with country, city, and ID queries; keyboard selection and dismissal; localized country labels; no-match text; and single/paired card layout in the running 760 × 650 Settings window. Confirm a selected zone persists after reopening; see the [frontend dashboard checklist](../../../doc/backlog.md#add-on-dashboard-live-verification).

Check combined-card left/right columns, shared Edit/Done focus and toggle behavior, divider height, expanded editor fit, drag cues, translated labels, and narrow-window wrapping in the [frontend combined add-on acceptance](../../../doc/backlog.md#combined-add-on-live-acceptance).

The catalog Add/Details alignment and Progress dialog layout passed a native 760 × 650 WebView visual check. Verify translated labels, keyboard focus, and an empty preset list in the broader acceptance pass.


Verify that the Progress details entry button opens the same preset dialog as the catalog card at the fixed Settings window size and in every supported language. This is part of the [frontend preset live acceptance](../../../doc/backlog.md#progress-preset-menu-live-acceptance).

## Native WebView layout check

- **Title:** Inspect all extracted views in the running clock and Settings window.
- **Problem or opportunity:** Vite and unit tests verify composition, but they cannot prove Alpine scope, focus, or pixel layout in WebView2.
- **Desired outcome:** Date, Region clock, Timer, and Progress controls render and update in both stacks and the live preview without clipped content or duplicate IDs.
- **Scope:** [clock-row.html](../clock-row.html), [settings-row.html](../settings-row.html), [preview-row.html](../preview-row.html), the four Settings type fragments, and [the Vite helper](../../build-fragments.js).
- **Acceptance criteria:** Check zero and 16 instances, every type, above/below placement, expanded Settings details, progress week grid, immediate Start/Pause labels, menu geometry, translated labels, and keyboard focus at the fixed Settings size. Confirm development and production builds show the same controls.
- **Dependencies and risks:** Requires an interactive Windows WebView2 session and disposable settings. Multiple monitors and mixed DPI broaden the acceptance pass.
- **Verification:** Run `npm run tauri:dev`; compare with a production build where available. Record screenshots and input behavior.
- **Priority:** High before release because build success does not prove Alpine runtime scope.
