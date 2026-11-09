# Frontend add-on host workflows

## Pair layout and editing

```mermaid
classDiagram
    class AddonInstance {
      id
      kind
      enabled
      placement
      size_percent
    }
    class AddonPair {
      left_id
      right_id
      size_percent
    }
    class LayoutRow {
      id
      placement
      items
      pair
    }
    AddonPair --> AddonInstance : references two IDs
    LayoutRow --> AddonInstance : displays one or two
    LayoutRow --> AddonPair : optional scale
```

[layout.js](../layout.js) derives rows without moving type options into the pair. [instance-editor.js](../instance-editor.js) updates the flat list and pair metadata together; pointer hit testing includes horizontal distance for the two side-by-side Settings members. The Rust validator enforces two adjacent eligible members with shared placement and enabled state. A group switch mirrors both flags; removing a member removes its pair record. These are JavaScript records and a native serialized record, not inheritance.

For the separate menu webview, `menuEntries()` combines enabled action descriptors and optional grouped choices from each compiled definition. Progress supplies its own preset choices and confirmation metadata. `dispatchMenuChoice()` revalidates the chosen ID, then the native adapter invokes `progress_timer_set_preset`; Rust atomically saves only the selected countdown. Settings and each clock observe its broadcasts. The registry also declares optional Details fragments for the catalog and instance buttons.

The diagram represents JavaScript objects and their contracts, not inheritance.

```mermaid
classDiagram
    class AddonDefinition {
      kind
      createOptions()
      describe()
      display()
      editor
      actions()
    }
    class AddonController {
      actionsFor()
      menuActions()
      dispatch()
    }
    class AddonHost {
      snapshot
      actionsFor()
      dispatch()
    }
    class AddonState {
      snapshot
      setTimer()
      setProgress()
      start()
      dispatch()
      dispose()
    }
    class NativeAdapter {
      getTimer()
      getProgress()
      action()
      onTimer()
      onProgress()
    }
    AddonHost --> AddonController : owns
    AddonHost --> AddonState : owns
    AddonController --> AddonDefinition : looks up
    AddonController --> AddonState : reads shared snapshot
    AddonState --> NativeAdapter : commands and events
```

[registry.js](../registry.js) supplies definitions. [host.js](../host.js) constructs one Alpine-reactive [state.js](../state.js) snapshot and passes that same object to [controller.js](../controller.js) and the page. The [native adapter](../native-adapter.js) bridges to Rust. Each webview has its own host; Rust owns durable state shared across windows.

```mermaid
sequenceDiagram
    participant UI as Clock or Settings
    participant Host as AddonHost and controller
    participant State as AddonState
    participant Rust as Existing Tauri commands
    UI->>Host: instance ID, action ID, role
    Host->>Host: Check current instance and descriptor
    opt Settings button
        Host->>UI: Flush pending settings save
    end
    Host->>Host: Recheck current instance and descriptor
    Host->>State: Dispatch typed action
    State->>Rust: timer_action or progress_timer_action
    Rust-->>State: Saved session event and command result
    State->>UI: Update shared reactive snapshot
```

An unavailable action fails before native dispatch; Rust checks it again. Session events can arrive before command responses, so [state.js](../state.js) keeps the newer event snapshot. The controller and Alpine templates read the same stable reactive object, so an action label tracks its instance without a separate page copy. Subscription cleanup occurs on Alpine destruction. Settings drafts and display animation histories stay with their respective pages.
