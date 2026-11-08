# Frontend add-on host backlog

See the [frontend backlog](../../doc/backlog.md) for the full native WebView and multi-display acceptance checks.

## Live action synchronization

- **Title:** Verify add-on actions in multiple running webviews.
- **Problem or opportunity:** Unit tests cover routing and stale events, but cannot prove native WebView event delivery or modifier input.
- **Desired outcome:** Timer and at least two Progress countdowns remain independent and synchronized in the clock, Settings, and a second display.
- **Scope:** [controller.js](../controller.js), [state.js](../state.js), [native-adapter.js](../native-adapter.js), and both Alpine pages.
- **Acceptance criteria:** Modifier-click targets one instance; drag suppresses click; Settings actions flush drafts first; Timer Reset appears only when enabled; closing the menu restores click-through; restart restores sessions.
- **Dependencies and risks:** Requires an interactive Windows desktop, a disposable settings profile, and a second display for cross-window coverage. Preserve current command and event names.
- **Verification:** Run `npm run tauri:dev` and exercise the cases above, including a failed settings write and release/restart.
- **Priority:** High before release because static tests cannot verify native input and event timing.
