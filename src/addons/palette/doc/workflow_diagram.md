# Mouse palette frontend workflow

```mermaid
classDiagram
    class PalettePage {
      settings
      pointer
      page
      rootId
      secondId
      selectedNode
    }
    class PaletteModel {
      paletteTree()
      pageNodes()
      ringAndIndex()
      fitSectorLabel()
    }
    class AddonHost {
      menuEntries()
      toggleEntries()
      dispatch()
      dispatchMenuChoice()
      setEnabled()
    }
    PalettePage --> PaletteModel : derives rings and hit tests
    PalettePage --> AddonHost : reads and dispatches current actions
```

[palette.js](../palette.js) owns transient selection state; [palette-model.js](../palette-model.js) owns pure calculations; [host.js](../../host.js) rechecks action availability before native dispatch. No class shown here is serialized. Saved enable/key fields belong to [native settings](../../../../src-tauri/src/settings.rs).

```mermaid
sequenceDiagram
    participant Native as addons/palette.rs
    participant Page as palette.js
    participant Model as palette-model.js
    participant Host as addons/host.js
    Native-->>Page: palette-open(center)
    Native-->>Page: palette-move(pointer)
    Page->>Model: Hit-test current ring and page
    Native-->>Page: palette-release(final pointer)
    Native->>Native: Hide overlay on key release
    Page->>Page: Hide overlay before awaiting action
    alt Leaf selected and available
        Page->>Host: Dispatch current action, choice, or switch
    else No leaf selected
        Page->>Page: Cancel
    end
    opt Action fails
        Page->>Page: Briefly show error, then hide
    end
```

The final release position is hit-tested again to avoid acting on a stale hover. Returning to the first ring replaces the outer choices; returning to the center clears selection. The center uses a short localized “Cancel” label; all sector labels scale to their available width. Confirmation-required choices open the existing [clock-menu confirmation](../../../menu.js) before the host call. The Settings sector invokes a palette-only toggle command, which asks the Settings page to run its save-and-close method when already visible. A mouse click, Escape, another modifier, or Tab cancels the native overlay. This diagram omits Quit's existing Tauri command and the native monitor's physical-window setup; see the [parent workflow](../../doc/workflow_diagram.md).
