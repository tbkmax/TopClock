# Script workflow

This directory contains command scripts and one PowerShell cleanup script, but no classes, so a class diagram would not describe its structure. The build command flow is:

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

The portable cleanup flow is:

```mermaid
sequenceDiagram
    participant User
    participant Cmd as Uninstall-TopClock.cmd
    participant PS as Uninstall-TopClock.ps1
    participant Disk as Adjacent TopClock.exe
    participant Run as HKCU Run value
    participant Data as TopClock user data
    User->>Cmd: Double-click after quitting TopClock
    Cmd->>PS: Run cleanup script
    PS->>User: Confirm portable removal
    alt Confirmed
        PS->>Disk: Remove adjacent executable
        PS->>Run: Remove only if it points to that executable
        PS->>User: Ask separately about shared data
        opt Data deletion confirmed and no TopClock process runs
            PS->>Data: Validate paths and remove TopClock folders
        end
    else Cancelled
        PS-->>User: Leave files and settings unchanged
    end
    PS-->>Cmd: Result code
```

The script leaves its own files and the containing folder for manual deletion. The [release guide](../../doc/feature/UPDATE_SYSTEM.md) explains the installer and portable paths.
