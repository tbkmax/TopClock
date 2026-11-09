# Native add-on backlog

Verify a Progress preset restart with two running countdowns in live Windows WebViews, including save failure and a stale unconfirmed request. The shared [frontend preset checklist](../../../../src/doc/backlog.md#progress-preset-menu-live-acceptance) covers menu and cross-window behavior.

## Failed action write verification

- **Title:** Exercise native action rollback on a controlled write failure.
- **Problem or opportunity:** The action service retains its rollback code and Rust tests cover validation and cleanup, but a live Tauri command failure has not been induced against a disposable config.
- **Desired outcome:** Failed Timer or Progress Start/Pause/Reset leaves the prior durable and in-memory session intact, emits no successful state event, and shows a recoverable UI error.
- **Scope:** [actions.rs](../actions.rs), [config_store.rs](../../config_store.rs), and the frontend [state adapter](../../../../src/addons/state.js).
- **Acceptance criteria:** Test both action kinds with an unwritable disposable settings path, then restore writes and confirm the next action succeeds. Do not alter the user's normal settings.
- **Dependencies and risks:** Requires an interactive Windows test profile and a controlled file lock or permissions setup.
- **Verification:** Run `npm run tauri:dev` with disposable data and observe command result, events, and restart state.
- **Priority:** High for persistence confidence before release; unit tests cannot create a full AppHandle action failure path here.
