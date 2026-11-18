# Display backlog

## Live display acceptance

- **Title:** Verify display reconciliation and position restore on Windows.
- **Problem or opportunity:** Unit tests cover position arithmetic, while physical reconnect, mixed DPI, and Webview input behavior require a desktop session.
- **Desired outcome:** Each enabled monitor shows the intended clock, with its saved position and click-through behavior after restart and reconnect.
- **Scope:** [manager.rs](../manager.rs), [positions.rs](../positions.rs), and [input interaction](../../input/interaction.rs).
- **Acceptance criteria:** Check primary and secondary windows, disabled displays, Ctrl-drag and reset, monitor disconnect/reconnect, Settings visibility, and restart with a disposable profile.
- **Dependencies and risks:** A second physical display and interactive Windows session are required. Preserve the user's existing settings during the check.
- **Verification:** Run `npm run tauri:dev` and follow the [parent native checklist](../../doc/backlog.md#native-refactor-smoke-verification).
- **Priority:** High because display restoration is user-visible and cannot be established by unit tests alone.
