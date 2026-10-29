# MSIX-first Microsoft Store release plan

Status: implementation in progress, 2026-10-29. An unsigned development MSIX builds; signed installation and Store submission remain.

## Implementation progress (2026-10-29)

- [Build-Msix.ps1](../../scripts/Build-Msix.ps1) builds the existing Tauri executable with a release-version override, stages only the executable and three logo assets, generates a full-trust manifest with a disabled `TopClockStartup` task, and packages with MakeAppx. Versions map from `vM.m.p` to `M.m.p.0`; a zero major version is rejected. Identity and publisher are explicit parameters, with development defaults. The [manual Windows CI workflow](../../.github/workflows/msix.yml) uses the same script.
- [startup.rs](../../src-tauri/src/startup.rs) selects Windows StartupTask for packaged builds and the existing Run key for direct builds. [Settings](../../src/settings.js) suppresses GitHub update checks and download actions in a packaged process. The settings schema is unchanged.
- The chosen runtime strategy is Evergreen WebView2. [webview_runtime.rs](../../src-tauri/src/webview_runtime.rs) checks availability before Tauri creates windows and shows Microsoft's download location if missing. No browser runtime is bundled.
- Verified: frontend build, 8 frontend tests, 13 Rust tests, and MakeAppx package creation at `1.0.0.0`. The artifact is unsigned and has not been installed. The Partner Center identity, signing, settings-path and upgrade checks, clean Windows runtime checks, WACK, and Store cutover remain open. The current NSIS release workflow is unchanged.

## Goal and release decision

Make a Microsoft Store MSIX package the primary Windows release of TopClock. Keep Tauri 2, Rust, Alpine.js, the clock UI, and the existing native window behavior. Adopt MSIX-aware Windows integration where the package changes behavior; this is a distribution and integration change, not a rewrite into UWP or WinUI.

The first Store release has no users to migrate from the existing local NSIS or portable builds. Do **not** add a one-time import of the current `%APPDATA%\topclock\settings.json`. From the first MSIX release onward, settings, display positions, and Timer state must survive Store-delivered upgrades. Keep the MSIX package identity stable across releases. Test uninstall data behavior and document it accurately.

Once the MSIX passes the acceptance checks below, make it the default release artifact and update the release documentation accordingly. The current NSIS and portable artifacts may remain available as optional direct-download builds during the transition, but should not drive the app's design. If a material MSIX limitation is demonstrated, document the failing behavior and retain NSIS as a deliberate fallback rather than assuming MSIX support.

## Baseline before this implementation

- [`src-tauri/tauri.conf.json`](../../src-tauri/tauri.conf.json) bundles only `nsis`; [`release.yml`](../../.github/workflows/release.yml) publishes an NSIS installer and portable ZIP from tags.
- [`startup.rs`](../../src-tauri/src/startup.rs) originally enabled sign-in launch only through `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` and pointed it at `current_exe()`.
- [`lib.rs`](../../src-tauri/src/lib.rs) obtains the settings path from Tauri's app config directory; [`config_store.rs`](../../src-tauri/src/config_store.rs) reads and writes `settings.json` there.
- [`window_commands.rs`](../../src-tauri/src/window_commands.rs) passes that folder to `explorer.exe` for **Open settings folder**.
- [`settings-updates.js`](../../src/settings-updates.js) originally checked GitHub Releases for every build and opened the release page.
- The repository uses `0.0.0` in development. The tag-driven release workflow replaces that with the tag version during builds.

## Tauri 2 support and known constraints

Tauri 2 can build the Windows application executable used inside an MSIX, but its [current Microsoft Store guide](https://v2.tauri.app/distribute/microsoft-store/) says the Tauri CLI produces EXE and MSI installers, not an MSIX bundle. Native MSIX bundling remains an [open Tauri feature request](https://github.com/tauri-apps/tauri/issues/4818). Therefore this plan uses a separate, reproducible MSIX packaging step after `tauri build --no-bundle`.

`tauri dev` does not run with MSIX package identity or its filesystem and registry behavior; Tauri tracks this as an [open development-tooling request](https://github.com/tauri-apps/tauri/issues/15145). The installed package must be tested, not only the development executable. Windows may redirect packaged apps' AppData and HKCU writes to private locations, and paths handed to an external process such as Explorer can point at a different location. See [Microsoft's packaged desktop app behavior](https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-behind-the-scenes).

These are packaging and test constraints, not evidence that TopClock's tray, global hotkeys, transparent windows, or click-through cannot work in MSIX. Prove those behaviors with a packaged build before changing their implementations.

## Implementation work

1. **Establish Store identity and versioning.** Reserve the product name in Partner Center. Put its exact package identity and publisher into the MSIX manifest; use a local development identity until those values are available. Define one mapping from release tags to the MSIX four-part version and ensure it increases on every Store release. The first Store version needs a nonzero major version; the fourth part is `0` for Store packages. Do not submit a package version derived directly from the repository's `0.0.0`. See [Microsoft's version rules](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/package-version-numbering?pivots=store-installer-msix).
2. **Add a deterministic package build.** Build the Tauri executable and embedded frontend, stage only the required payload and Store assets, generate the full-trust MSIX manifest, and package it with the Windows SDK's `MakeAppx` or equivalent maintained tooling. Prefer this direct build over converting an installed NSIS snapshot so the Store artifact does not depend on NSIS setup side effects. Add a Windows CI job and local command that produce the same MSIX. A self-signed development certificate is acceptable for local installation tests; the Store signs the submitted MSIX after certification. See [MakeAppx](https://learn.microsoft.com/en-us/windows/msix/package/create-app-package-with-makeappx-tool) and [Store signing](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements).
3. **Use packaged sign-in startup.** Declare a disabled-by-default `windows.startupTask` in the manifest and make the existing Settings toggle use its packaged-app state. Stop writing the Run key for the MSIX build. Respect a user's disable action in Windows Startup settings. Keep the startup setting off unless the user enables it in TopClock or Windows. See [StartupTask](https://learn.microsoft.com/en-us/uwp/api/windows.applicationmodel.startuptask).
4. **Make settings and update UX package-aware.** Verify the real settings location after MSIX install and make **Open settings folder** open the file that TopClock actually reads. Verify persistence across app restart and in-place MSIX upgrade. Remove the GitHub installer download prompt from Store builds; use Store-managed delivery and suitable Settings text. Keep the same settings schema unless package testing proves a change is necessary. No old local `settings.json` migration is planned.
5. **Handle runtime prerequisites.** Test on a clean Windows 11 machine and a supported Windows 10 machine, including one without WebView2 already present if feasible. Define a supported WebView2 prerequisite or package strategy before submission; do not assume all Windows 10 installations have it. See [Microsoft's WebView2 deployment guidance](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution).
6. **Cut over release and documentation.** Make MSIX the primary release output after validation. Update [`README.md`](../../README.md), [`UPDATE_SYSTEM.md`](../feature/UPDATE_SYSTEM.md), the release workflow, and affected code-folder `doc/` files. Keep any optional NSIS or portable channel explicitly labeled as a direct-download alternative and prevent its update messaging from sending Store users outside the Store.

## Acceptance checks before Store submission

- Build the frontend and run Rust tests using the repository's standard commands; produce an MSIX with the release version and correct Store identity.
- Install the locally signed test package on clean Windows; launch from Start and confirm the clock and Settings window open.
- Exercise the tray menu, Ctrl interactions, click-through, global shortcuts, multiple displays, proximity fade, Timer, and font picker from the installed package.
- Save settings and per-display positions; restart, sign out and in, and apply a higher-version MSIX. Confirm settings and positions remain. Confirm the packaged sign-in toggle works and honors Windows disabling it.
- Confirm **Open settings folder** selects the actual settings location, and uninstall behaves as documented.
- Confirm Store users are not prompted to download the GitHub installer. Check WebView2 behavior on both target Windows versions.
- Run the Windows App Certification Kit, fix actionable failures, then submit the package and listing for certification. See [Microsoft's certification process](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-certification-process).

## External prerequisite and cost boundary

Final manifest identity requires the Partner Center product registration. The [new developer-account onboarding flow](https://learn.microsoft.com/en-us/windows/apps/publish/partner-center/open-a-developer-account) has no registration fee. For **Store-distributed MSIX**, Microsoft signs and hosts the package and delivers updates; no paid public signing certificate or developer-hosted installer URL is required. Local MSIX test installs still need a locally trusted development signature. Direct distribution of an MSIX outside the Store is a separate channel with its own signing and hosting requirements. See [Microsoft's distribution comparison](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/choose-distribution-path).
