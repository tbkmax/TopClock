# Frontend add-on host architecture

This folder owns the fixed built-in registry and the shared add-on host. The [frontend architecture](../../doc/architecture.md) covers the two Alpine pages; [built-in definitions](../builtins/doc/architecture.md) own type behavior, and [bundled views](../views/doc/architecture.md) own markup.

| File | Responsibility |
| --- | --- |
| [registry.js](../registry.js) | Registers Date, Region clock, Timer, and Progress; validates definition shape and known actions; supplies catalog metadata |
| [controller.js](../controller.js) | Resolves current instances, checks action role and enabled state, and composes clock-menu contributions |
| [state.js](../state.js) | Holds per-webview native session snapshots, subscribes to both session events, rejects stale command responses, and disposes listeners |
| [native-adapter.js](../native-adapter.js) | Maps typed actions to existing Tauri commands and events |
| [instance-editor.js](../instance-editor.js) | Adds, removes, and reorders instances around the clock block, and mixes type editors into Settings |
| [contracts.json](../contracts.json) | Checked kind and action IDs shared by frontend and Rust tests |

The registry contains compiled definitions only. A definition supplies fresh options, a pure display result, Settings descriptions and rules, bundled view keys, and action descriptors. [addons.js](../../addons.js) retains the older exports while callers use the new host. The host does not own Settings persistence or clock pointer geometry. Each webview creates its own controller and state object; Rust remains authoritative for saved settings and sessions.

The controller checks actions before and after the Settings save flush. The adapter exposes only the existing `timer_action` and `progress_timer_action` commands, with their existing event names. Rust revalidates targets and persists before broadcasting. A command result cannot overwrite a session event received while that command was pending. `dispose()` removes the add-on event subscriptions when Alpine destroys the page.

All views are local files inserted by [the Vite helper](../../../scripts/addon-fragments.js) before Alpine starts. The host never renders settings, server responses, or arbitrary paths as HTML. Text values use Alpine text bindings; the native validator remains the final settings boundary. No package installer, remote code, account, credential, or network service is present.
