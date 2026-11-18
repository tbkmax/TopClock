# Window and tray backlog

## Live window acceptance

- **Title:** Verify menu, Settings, tray, and topmost behavior after regrouping.
- **Problem or opportunity:** Geometry and topmost tests cannot prove Webview focus, tray dispatch, or interaction with another topmost application.
- **Desired outcome:** Existing window routes work without focus theft or loss of click-through.
- **Scope:** [menu_window.rs](../menu_window.rs), [window_commands.rs](../window_commands.rs), [tray.rs](../tray.rs), [topmost.rs](../topmost.rs).
- **Acceptance criteria:** Open and dismiss the menu; open Settings from menu/tray; save edits; exercise topmost recovery, Ctrl interaction, normal Quit, and restart with positions restored.
- **Dependencies and risks:** Requires an interactive Windows desktop and a disposable profile. The original intermittent topmost trigger may require the affected third-party application.
- **Verification:** Run `npm run tauri:dev` and use the [parent native checklist](../../doc/backlog.md#native-refactor-smoke-verification).
- **Priority:** High because focus and input regressions would interrupt ordinary desktop use.
