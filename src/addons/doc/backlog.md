# Frontend add-on host backlog

The Region city/country search and exact-ID selection have a focused unit test, including country coverage for every zone reported by the test runtime. Pointer, keyboard, language switching, paired-card, and saved-value behavior still need the [live Add-ons dashboard check](../../doc/backlog.md#add-on-dashboard-live-verification).

Pair operations and a horizontal swap have regression tests. Physical pointer capture, combined-card focus, the two-column Settings layout, and two-display synchronization remain in the [frontend combined add-on acceptance](../../doc/backlog.md#combined-add-on-live-acceptance).

The separate menu host still needs physical pointer and multi-display acceptance for action dispatch and live label updates. See the [frontend checklist](../../doc/backlog.md#separate-menu-live-acceptance).


See the [frontend backlog](../../doc/backlog.md) for the full native WebView and multi-display acceptance checks.

The Progress preset menu needs the same live cross-window synchronization check: restart one of two countdowns from a preset while Settings is open and verify both instance buttons, the other session, and every clock. See [frontend preset acceptance](../../doc/backlog.md#progress-preset-menu-live-acceptance).

## Live action synchronization

- **Title:** Verify add-on actions in multiple running webviews.
- **Problem or opportunity:** Unit tests cover routing and stale events, but cannot prove native WebView event delivery or modifier input.
- **Desired outcome:** Timer and at least two Progress countdowns remain independent and synchronized in the clock, Settings, and a second display.
- **Scope:** [controller.js](../controller.js), [state.js](../state.js), [native-adapter.js](../native-adapter.js), and both Alpine pages.
- **Acceptance criteria:** Modifier-click targets one instance; drag suppresses click; Settings actions flush drafts first; Timer Reset appears only when enabled; closing the menu restores click-through; restart restores sessions.
- **Dependencies and risks:** Requires an interactive Windows desktop, a disposable settings profile, and a second display for cross-window coverage. Preserve current command and event names.
- **Verification:** Run `npm run tauri:dev` and exercise the cases above, including immediate Start/Pause button updates, a failed settings write, and release/restart. The add-on host unit test covers independent reactive labels and native event updates; live WebView behavior remains open.
- **Priority:** High before release because static tests cannot verify native input and event timing.
