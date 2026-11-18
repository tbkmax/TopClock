# Platform service workflow

The platform services are called by startup, Settings, tray, and update commands. See the [parent workflow](../../doc/workflow_diagram.md) for the complete application path.

## Service relationships

```mermaid
classDiagram
    class WinRtApartment
    class StartupTask {
      State
    }
    class StoreContext {
      GetAppAndOptionalStorePackageUpdatesAsync()
    }
    class WebviewWindow
    WinRtApartment --> StoreContext : initializes worker thread
    StoreContext --> WebviewWindow : dialog owner HWND
```

[startup.rs](../startup.rs) selects StartupTask or the direct-build Run key. [store_updates.rs](../store_updates.rs) owns `WinRtApartment` and uses `StoreContext` only for packaged builds. The diagram shows API relationships, not application-owned persisted fields.

## Runtime startup gate

```mermaid
sequenceDiagram
    participant App as lib.rs
    participant Check as webview_runtime.rs
    participant Windows as WebView2 Runtime
    App->>Check: ensure_available
    Check->>Windows: Probe runtime
    alt Missing
        Check-->>App: Show native guidance and exit
    else Available
        App->>App: Load config and build Webviews
    end
```

The guard in [webview_runtime.rs](../webview_runtime.rs) runs before managed state or windows are created. The Store update flow is documented in the [package workflow](../../../doc/workflow_diagram.md).
