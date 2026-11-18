# Frontend add-on host backlog

The add-on test-file split is complete. New built-in add-ons can add a matching file in [tests/](../tests/) without updating the npm script. The live WebView checks below remain open.

The 2026-11-17 import move is complete. Existing live WebView checks below remain open for add-on labels and events; there is no new add-on action or state item from the localization refactor.

The [palette live acceptance](../../palette/doc/backlog.md) must verify that one key release runs the chosen host action, while a center release cancels. Check fitted combined names, switches, stale-selection checks, and session events against the existing clock menu. It adds no new add-on kind; physical input and window checks are tracked in that folder and the [frontend backlog](../../doc/backlog.md#mouse-palette-live-windows-acceptance).

Check switch row names, pair grouping, multiple Progress instances, and native event refresh in a running WebView. The [frontend Add-on menu checklist](../../doc/backlog.md#add-on-menu-live-verification) covers the physical menu, persistence, and click-through checks; the controller test covers list composition and command routing.

Verify Counter actions across the clock menu, Settings, a paired row, and a second display in a live Windows session. Confirm the menu contains Count up, Count down, and Stop, with Reset only in Settings; open Counter Details from the catalog before and after adding Counter. Inspect `D:HH:MM` near the 100-hour boundary and compare running/stopped text plus the adjustable active direction glyph glow in both the clock and preview. Check both pair orders, shared 0/50/100% intensity, the 50% match to the Ctrl-held clock, restart persistence, and a sign reversal while counting. This extends the [frontend Counter checklist](../../doc/backlog.md#counter-live-windows-acceptance).


Timer mode and preset routing pass frontend tests; verify its event ordering and cross-window labels in the [Timer menu live Windows checklist](../../doc/backlog.md#timer-menu-live-windows-acceptance). A physical menu and write-failure profile are still needed.

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
