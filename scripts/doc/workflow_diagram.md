# Script workflow

This directory contains one batch script and no classes, so a class diagram would not describe its structure. The command flow is:

```mermaid
sequenceDiagram
    participant NPM as npm script
    participant Wrapper as tauri-windows.cmd
    participant Tools as Local or system toolchain
    participant CLI as tauri.cmd
    NPM->>Wrapper: dev or build
    Wrapper->>Tools: Configure available SDK, Cargo and VC environment
    Wrapper->>CLI: Forward arguments
    CLI-->>Wrapper: Exit code
    Wrapper-->>NPM: Same exit code
```

The steps are visible in [tauri-windows.cmd](../tauri-windows.cmd). `.tools/` is optional; the script still calls the CLI when it is absent.
