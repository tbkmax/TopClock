# Scripts architecture

## Runtime diagnostics

For an unattended test, start the candidate clock, then double-click [Test-TopClockLongRun.cmd](../Test-TopClockLongRun.cmd). [Test-TopClockLongRun.ps1](../Test-TopClockLongRun.ps1) defaults to eight hours with one sample every 30 seconds. It attaches to the running instance. Use `-ClockProcessId` to distinguish multiple copies, `-Hours 24` for a full day, and `-Scenario` to describe displays, add-ons and how Settings is used. For example, from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-TopClockLongRun.ps1 -Hours 8 -Scenario "Two displays, normal daily use"
```

Each run creates a fresh directory under `.tools/long-run/` and prints its path. Leave the terminal open, use the clock normally, and add approximate times of Settings, display, sleep or exit actions to `notes.txt`. To finish early, create an empty file named `STOP` in the capture directory. The sampler checks for it before the next sample. After completion, early stop, sampling error or app exit, the runner collects matching Windows events since the start and generates `report.html`, `summary.json`, and a ZIP alongside the directory. The ZIP contains the report, metadata, notes and available raw diagnostics. The Windows events can include paths and process details from the PC.

[New-TopClockMemoryReport.ps1](../New-TopClockMemoryReport.ps1) can regenerate the report from a saved directory, including a partial CSV after terminal closure or restart. Pass `-CaptureDirectory` with the printed directory path. The report includes an elapsed-time chart, the executable version and SHA-256, observation length, Windows version, memory capacity, WebView process and host handle counts, and sampling gaps. It excludes ten minutes of warmup from the trend table and compares medians over the first and last 15-minute windows. The fitted slope uses post-warmup samples. Growth above 20 MiB between medians and above 5 MiB/hour over a run of at least one hour prompts investigation. These thresholds guide review and depend on the workload. Short or incomplete runs, missing event coverage, missing WebView descendants, process exits, long gaps, and matching failure events receive review flags. The user can share the generated ZIP for assessment against the reported Store failures.

The CSV includes the executable's SHA-256 digest so two builds with the same product version can be distinguished.

[Measure-TopClockMemory.ps1](../Measure-TopClockMemory.ps1) attaches to one running TopClock, selected explicitly by PID if several copies run. It records UTC timestamps, executable product version, host private bytes, host handles/threads, descendant WebView2 process IDs/count/private bytes, and the aggregate private bytes. Each sample rediscovers descendants by parent PID and creation time. An open host handle pins process identity across PID reuse. Exits get a terminal CSV row and an error, and an existing output file is protected. CIM access is required; use an elevated shell if the Windows account denies it. The script only observes the running app. Launch the installed app normally to measure the Store package.

From the repository root, a one-hour capture can be started with

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Measure-TopClockMemory.ps1 -DurationSeconds 3600 -IntervalSeconds 15 -OutputPath .tools/memory-fixed.csv
```

Start with Settings closed, one enabled display, and the same add-ons for baseline and candidate. Repeat with Settings open and with multiple displays. Let startup settle for 60 seconds before comparing trends. Compare the host and WebView2 columns separately, plus the aggregate. Working sets include shared pages, so the sampler uses private committed bytes. A rising trend requires a longer reproduction and process-level investigation; a short stable trace covers only the measured interval and settings. Background system memory pressure and WebView2 versions also affect results. Ctrl+C stops sampling and preserves completed CSV rows. Use a unique output path per scenario.

[Collect-TopClockFailures.ps1](../Collect-TopClockFailures.ps1) exports raw Windows Application events 1000/1001/1002 and System event 2004 containing TopClock's name. It queries XML through wevtutil to avoid failures loading localized message resources. The output includes the full matching event, including diagnostic paths or other process data in a resource-exhaustion event. Files remain local. An empty export means Windows returned no matching events for that time range. WebView-only events that lack TopClock's name require separate investigation.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Collect-TopClockFailures.ps1 -Days 7 -OutputPath .tools/failures.xml
```

These scripts support the release acceptance work in the [backlog](backlog.md). The [repository overview](../../README.md) describes the app and distribution paths.

[tauri-windows.cmd](../tauri-windows.cmd) is the Windows wrapper for the Tauri CLI. [package.json](../../package.json) calls it from `tauri:dev` and `tauri:build`.

[addon-fragments.js](../addon-fragments.js) is a Vite build-time HTML helper. [vite.config.js](../../vite.config.js) calls it for both clock and Settings entries. It reads view keys from the fixed [add-on registry](../../src/addons/registry.js), inserts only local files under [views/](../../src/addons/views/doc/architecture.md), and fails on unknown, missing, recursive, or escaping slots. It does not load settings, network data, or runtime HTML. The shared clock row displays the registered output shape; Settings type controls remain in their own fragments. See the [composition workflow](workflow_diagram.md#bundled-add-on-view-composition).

The wrapper finds the repository root, adds a local SDK and Cargo toolchain from `.tools/` to environment variables when present, calls Visual Studio's `vcvars64.bat` when present, and forwards arguments to `node_modules/.bin/tauri.cmd`. It returns that command's exit code. It does not own application state or persist user settings. See the [README](../../README.md) for build commands.

[Build-Msix.ps1](../Build-Msix.ps1) builds the Tauri executable with an override for a three-part release version, stages that executable and the three [MSIX logo assets](../../src-tauri/icons/doc/architecture.md), writes a full-trust manifest with a disabled startup task, then calls the Windows SDK MakeAppx. It maps `vM.m.p` to `M.m.p.0`, rejects a zero major version, and accepts explicit package identity and publisher values. The defaults are the reserved Partner Center identity `tbkmax.TopClock`, publisher `CN=508EFCDF-2961-4370-827D-3736CE5AC66A`, and display name `tbkmax`. Each identity has a separate staging folder and identity-named output in ignored `release-assets/`. The script refuses to replace a staging folder registered as a loose package in the current Windows account. Its output is unsigned for Partner Center; signed installation and Store submission are separate steps. MSIX releases are built locally; GitHub Actions builds only the portable ZIP.

[Uninstall-TopClock.cmd](../Uninstall-TopClock.cmd) and [Uninstall-TopClock.ps1](../Uninstall-TopClock.ps1) are copied into the portable ZIP by the [release workflow](../../.github/workflows/release.yml). The command file opens the PowerShell script and shows its result. The PowerShell script uses its own directory to identify the adjacent `TopClock.exe`; it never searches for other portable copies or removes the enclosing folder. It removes the current user's `TopClock` Run value only when that value names the adjacent executable. Shared settings and cache deletion requires a separate confirmation and targets only TopClock's current and legacy user-data directories. It refuses linked data directories and leaves files in place if removal fails. The installed build uses Tauri's NSIS uninstaller instead.

The command file applies PowerShell's execution-policy bypass only to its child process; it does not change the user's policy setting. It pauses after the script finishes so a double-click user can read the result.
