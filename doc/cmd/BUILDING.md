# Production builds

This guide covers local production artifacts. Run commands from the repository root after installing the [build prerequisites](../README.md#prerequisites). The [release guide](feature/UPDATE_SYSTEM.md) covers version tags, GitHub Releases, and Store submissions.

## Standalone executable

```powershell
npm run tauri:build -- --no-bundle
```

The compiled executable is `src-tauri/target/release/top_clock.exe`. The [Tauri configuration](../src-tauri/tauri.conf.json) and [command wrapper](../scripts/tauri-windows.cmd) define the build; the standalone executable has no Store package identity.

## Windows installer (NSIS)

```powershell
npm run tauri:build
```

This builds the locally available NSIS installer. The GitHub release workflow publishes the portable ZIP, not the NSIS installer; see the [release guide](feature/UPDATE_SYSTEM.md).

## Microsoft Store package (maintainers)

The [MSIX build script](../scripts/Build-Msix.ps1) builds the executable and packages it with the Windows SDK's MakeAppx:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Build-Msix.ps1 -Version v1.0.0
```

For `-Version v1.0.0`, the output is `release-assets/TopClock_tbkmax.TopClock_1.0.0.0_x64.msix`.

- **Identity:** The default manifest uses the Microsoft Store identity (`tbkmax.TopClock`, `CN=508EFCDF-2961-4370-827D-3736CE5AC66A`, publisher display name `tbkmax`). Override these values only for a separate development identity.
- **Submission:** The package is unsigned for Partner Center submission. Direct local installation requires a matching trusted signature.
- **Build path:** Build the Store package locally with this script; GitHub Actions publishes only the portable ZIP. Local NSIS builds remain available with `npm run tauri:build`.
- **Testing:** Do not launch `TopClock.exe` from `release-assets/msix-stage-tbkmax.TopClock` to test Store updates. That directory is packaging input, and a direct executable launch uses the GitHub update path.

The MSIX uses Evergreen WebView2. If the runtime is missing, TopClock shows a native message pointing to Microsoft's download page before exiting. The runtime is not bundled in the package.

See the [Store package plan](feature/MSIX_STORE_PLAN.md) for packaging details and acceptance checks. Store-signed installation and update behavior still require the live checks listed there.
