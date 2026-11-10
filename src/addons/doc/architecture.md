# Frontend add-on host architecture

The Settings-only [Region picker](../builtins/region-picker.js) builds searchable records for its [view](../views/region-clock.html) from browser-supported IANA zones, the bundled [country map](../builtins/zone-country-codes.js), and localized/English names. The Settings page rebuilds those records on a language change. Each editor owns its transient query and active result. Only a chosen zone ID reaches `editAddonOption`; the [Region display definition](../builtins/region-clock.js), host, and saved `options.time_zone` contract are unchanged. See the [frontend architecture](../../doc/architecture.md) for persistence.

The shared [layout helper](../layout.js) turns flat instances and optional `addon_pairs` into single or two-member rows. It owns combine, swap, split-by-move, whole-pair move, and effective size calculations. [instance-editor.js](../instance-editor.js) applies those pure operations to the Settings draft and saves through the existing controller. Its pointer targeting uses both axes for the Settings card's left/right members; a short movement does not split a pair. Type definitions, action routing, and Timer/Progress sessions still address stable instance IDs. Progress cannot enter a pair.

The add-on controller composes menu entries for the separate menu webview. Definitions may declare a grouped menu with choices; Progress supplies per-instance Start/Pause and Reset actions plus the shared duration choices. `dispatchMenuChoice` rechecks the current instance before the native adapter invokes the atomic preset transaction. Definitions may also declare a `detailsViewKey`; the catalog and instance Details buttons use the same Settings method and allowlisted view fragment. Progress currently provides the shared preset editor. This keeps future compiled add-on menu and details contributions in the registry/controller path.

This folder owns the fixed built-in registry and the shared add-on host. The [frontend architecture](../../doc/architecture.md) covers the three Alpine pages; [built-in definitions](../builtins/doc/architecture.md) own type behavior, and [bundled views](../views/doc/architecture.md) own markup.

| File | Responsibility |
| --- | --- |
| [registry.js](../registry.js) | Registers Date, Region clock, Timer, and Progress; validates definition shape and known actions; supplies catalog metadata |
| [layout.js](../layout.js) | Derives single and paired rows, scales child display sizes, and performs pure pair/order operations |
| [controller.js](../controller.js) | Resolves current instances, checks action role and enabled state, and composes clock-menu contributions |
| [host.js](../host.js) | Constructs one reactive store and controller for each clock or Settings webview |
| [state.js](../state.js) | Owns the reactive native session snapshot, subscribes to session events, rejects stale command responses, and disposes listeners |
| [native-adapter.js](../native-adapter.js) | Maps typed actions to existing Tauri commands and events |
| [model.js](../model.js) | Creates instances and delegates shared display results to type definitions |
| [instance-editor.js](../instance-editor.js) | Adds, removes, and reorders instances around the clock block, and mixes type editors into Settings |
| [build-fragments.js](../build-fragments.js) | Allowlisted Vite HTML composition from bundled views |
| [contracts.json](../contracts.json) | Checked kind and action IDs shared by frontend and Rust tests |
| [addons.test.js](../addons.test.js) | Add-on routing, state, view composition, editing, and display regression tests |

The registry contains compiled definitions only. A definition supplies fresh options, a pure display result, Settings descriptions and rules, bundled view keys, and action descriptors. The clock, menu, and Settings pages each create one host, which gives the controller and page the same Alpine-reactive session object. The page's Timer and Progress getters derive from this object; neither page keeps another session copy. Rust remains authoritative for saved settings and sessions. The host does not own Settings persistence or clock pointer geometry.

The controller checks actions before and after the Settings save flush. The adapter maps action descriptors to `timer_action` and `progress_timer_action`, and Progress preset choices to `progress_timer_set_preset`, with the existing event names. Rust revalidates targets and persists before broadcasting. A command result cannot overwrite a session event received while that command was pending. The stable reactive snapshot makes Start/Pause labels update when either a command response or event changes a session. `dispose()` removes the add-on event subscriptions when Alpine destroys the page.

All views are local files inserted by [the Vite helper](../build-fragments.js) before Alpine starts. The host never renders settings, server responses, or arbitrary paths as HTML. Text values use Alpine text bindings; the native validator remains the final settings boundary. No package installer, remote code, account, credential, or network service is present.
