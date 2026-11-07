# Script workflow

## Runtime measurement

The [long-run launcher](../Test-TopClockLongRun.ps1) creates a dated run directory and delegates sampling to the flow below. A `STOP` file ends sampling on the next iteration. On return or failure, it records the end state, requests local Windows events since startup of the test, and calls the [report generator](../New-TopClockMemoryReport.ps1). The generator reads completed CSV rows and metadata, flags coverage problems, estimates memory trends, then writes HTML, JSON and a ZIP. After a forced terminal close, the same generator reads the available rows from the saved directory; the previous `Running` state identifies an interrupted capture.

```mermaid
sequenceDiagram
    participant Caller as PowerShell
    participant Sampler as Measure-TopClockMemory.ps1
    participant OS as Windows processes
    participant CSV as Local diagnostic file
    Caller->>Sampler: Duration, interval, optional PID, output path
    Sampler->>OS: Attach to one TopClock process
    loop Until duration expires or process exits
        Sampler->>OS: Read host counters and discover WebView2 descendants
        OS-->>Sampler: Private memory and process identity
        Sampler->>CSV: Append timestamped sample
    end
```

[Collect-TopClockFailures.ps1](../Collect-TopClockFailures.ps1) separately queries raw Windows event XML, retains events mentioning TopClock, and writes a new local XML file. Both tools fail visibly on unavailable data sources or an existing output path. See [diagnostic usage](architecture.md#runtime-diagnostics).

This directory contains procedural build, cleanup, and diagnostic scripts. A class diagram would misrepresent their structure. The build command flow follows.

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

The MSIX build extends that workflow:

```mermaid
sequenceDiagram
    participant Caller as Local shell
    participant Script as Build-Msix.ps1
    participant Tauri as tauri-windows.cmd
    participant SDK as MakeAppx
    Caller->>Script: Version and optional identity overrides
    Script->>Tauri: build --no-bundle with version override
    Tauri-->>Script: Versioned executable
    Script->>Script: Refuse to replace registered identity stage
    Script->>Script: Stage executable, logos, identity manifest
    Script->>SDK: pack staged directory
    SDK-->>Caller: Unsigned MSIX or error
```

[Build-Msix.ps1](../Build-Msix.ps1) defaults to the reserved Partner Center identity and stops if the version, toolchain, Tauri build, registered staging folder, or MakeAppx validation fails. Its identity-specific staging directory keeps a loose-registered development build intact when a different identity is built. Signing and installation are outside this flow.

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
