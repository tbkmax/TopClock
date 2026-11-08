# Frontend add-on host workflows

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
    class AddonState {
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
    AddonController --> AddonDefinition : looks up
    AddonController --> AddonState : dispatches through
    AddonState --> NativeAdapter : commands and events
```

[registry.js](../registry.js) supplies definitions. [controller.js](../controller.js) uses the current settings and session snapshot; [state.js](../state.js) and [native-adapter.js](../native-adapter.js) bridge to Rust. These are local per-webview objects, while Rust owns durable state.

```mermaid
sequenceDiagram
    participant UI as Clock or Settings
    participant Host as AddonController
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
    State->>UI: Latest snapshot
```

An unavailable action fails before native dispatch; Rust checks it again. Session events can arrive before command responses, so [state.js](../state.js) keeps the event snapshot. Subscription cleanup occurs on Alpine destruction. Settings drafts and display animation histories stay with their respective pages.
