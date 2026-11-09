# Frontend add-on host architecture

Progress's `toggle` and `reset` actions now include the clock-menu role. The controller still validates the current enabled instance before dispatch; the clock menu places those descriptors in a row per enabled countdown. Preset selection is a separate native transaction because it changes both shared settings and one durable session. The two Settings entry buttons call one dialog method and edit one global preset list, so there are no duplicate persistence paths.

This folder owns the fixed built-in registry and the shared add-on host. The [frontend architecture](../../doc/architecture.md) covers the two Alpine pages; [built-in definitions](../builtins/doc/architecture.md) own type behavior, and [bundled views](../views/doc/architecture.md) own markup.

| File | Responsibility |
| --- | --- |
| [registry.js](../registry.js) | Registers Date, Region clock, Timer, and Progress; validates definition shape and known actions; supplies catalog metadata |
| [controller.js](../controller.js) | Resolves current instances, checks action role and enabled state, and composes clock-menu contributions |
| [host.js](../host.js) | Constructs one reactive store and controller for each clock or Settings webview |
| [state.js](../state.js) | Owns the reactive native session snapshot, subscribes to session events, rejects stale command responses, and disposes listeners |
| [native-adapter.js](../native-adapter.js) | Maps typed actions to existing Tauri commands and events |
| [model.js](../model.js) | Creates instances and delegates shared display results to type definitions |
| [instance-editor.js](../instance-editor.js) | Adds, removes, and reorders instances around the clock block, and mixes type editors into Settings |
| [build-fragments.js](../build-fragments.js) | Allowlisted Vite HTML composition from bundled views |
| [contracts.json](../contracts.json) | Checked kind and action IDs shared by frontend and Rust tests |
| [addons.test.js](../addons.test.js) | Add-on routing, state, view composition, editing, and display regression tests |

The registry contains compiled definitions only. A definition supplies fresh options, a pure display result, Settings descriptions and rules, bundled view keys, and action descriptors. The clock and Settings pages each create one host, which gives the controller and page the same Alpine-reactive session object. The page's Timer and Progress getters derive from this object; neither page keeps another session copy. Rust remains authoritative for saved settings and sessions. The host does not own Settings persistence or clock pointer geometry.

The controller checks actions before and after the Settings save flush. The adapter exposes only the existing `timer_action` and `progress_timer_action` commands, with their existing event names. Rust revalidates targets and persists before broadcasting. A command result cannot overwrite a session event received while that command was pending. The stable reactive snapshot makes Start/Pause labels update when either a command response or event changes a session. `dispose()` removes the add-on event subscriptions when Alpine destroys the page.

All views are local files inserted by [the Vite helper](../build-fragments.js) before Alpine starts. The host never renders settings, server responses, or arbitrary paths as HTML. Text values use Alpine text bindings; the native validator remains the final settings boundary. No package installer, remote code, account, credential, or network service is present.
