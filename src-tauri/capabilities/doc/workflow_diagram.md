# Capability workflow

This directory holds JSON configuration, not classes, so no class diagram applies.

```mermaid
sequenceDiagram
    participant UI as Frontend window
    participant Tauri as Tauri permission check
    participant API as Window or event API
    UI->>Tauri: Request permitted operation
    Tauri->>Tauri: Check default.json for window and permission
    alt Allowed
        Tauri->>API: Perform operation
    else Not allowed
        Tauri-->>UI: Reject request
    end
```

The allowlist is in [default.json](../default.json). The diagram describes the configuration's role; Tauri implements the permission check outside this repository's source.
