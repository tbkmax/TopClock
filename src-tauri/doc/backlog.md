# Tauri package backlog

- [ ] Verify the v1-to-v2 Counter database migration in a disposable packaged profile and confirm Reset leaves both history tables empty after restart. Unit migration tests pass; packaged AppData and downgrade behavior still need live verification.

- [ ] **Check packaged Counter storage:** In a disposable direct build and Store-identity package, locate the app config directory and verify `topclock.db` creation, first-run import, restart recovery, and uninstall behavior. The bundled SQLite build and Rust tests pass locally, but packaged AppData redirection and runtime behavior still need a live check.

Verify a direct and packaged build contains `palette.html`, grants its window capability, and can show the configured nonfocusable overlay without focus or mouse capture. Confirm one key release closes it and runs a selected action, while center release and Alt-Tab cancel. Include second monitors, mixed DPI, and restart with a disposable profile. The [native checklist](../src/doc/backlog.md#mouse-palette-native-input-acceptance) covers physical input and Settings behavior; this package check is high priority before release because Vite and Rust tests alone cannot prove installed WebView behavior.

Check the separate menu window on mixed-DPI displays and after monitor reconnects; the Rust geometry test covers arithmetic but not WebView focus or physical pointer behavior.


TODO 4's display windows and Windows identity binding are implemented. Physical multi-monitor verification remains in the [frontend backlog](../../src/doc/backlog.md).

Use this file for unfinished package-wide work. Describe the problem, desired outcome, scope, acceptance criteria, dependencies, risks, verification and priority as requested by [the template](../../templates/doc/backlog.md).

TODO 3's package permission and font enumeration updates are complete. The native module extraction is complete without package configuration changes; a live Windows smoke check remains in the [Rust application backlog](../src/doc/backlog.md). Review the existing [repository backlog](../../doc/backlog.md) against current source before adopting a proposal.

The add-on system uses existing Tauri window and event permissions. Timer clock-change resilience is tracked in the [Rust application backlog](../src/doc/backlog.md); dense stack fitting is tracked in the [frontend backlog](../../src/doc/backlog.md).

## MSIX installed-package validation

Include a Chinese or Japanese Windows UI language in the installed-package pass and confirm System default picks it on first launch and after restart. This verifies [locale.rs](../src/platform/locale.rs) under package identity alongside the existing startup and persistence checks.

- **Title:** Validate Store-signed installation and upgrades.
- **Problem or opportunity:** MakeAppx accepts the Store-identity manifest and a loose-registered development package works, but a Store-signed install and upgrade have not been exercised.
- **Desired outcome:** Startup, settings persistence, tray, windows, shortcuts, click-through, and upgrade behavior work from MSIX.
- **Scope:** [Build-Msix.ps1](../../scripts/Build-Msix.ps1), [startup.rs](../src/platform/startup.rs), configuration paths and package manifest.
- **Acceptance criteria:** Use the full checklist in the [MSIX plan](../../doc/feature/MSIX_STORE_PLAN.md), including in-place upgrade, Store update button and permission flow, and Windows Startup settings disable behavior. Record the real data path and uninstall result.
- **Dependencies and risks:** Requires a certified Store candidate and test Windows installations; the user declined a self-signed certificate. GitHub publishes a portable ZIP during this validation period.
- **Verification:** Install two increasing MSIX versions, exercise the app, and run Windows App Certification Kit.
- **Priority:** High because build success alone cannot establish Store readiness.
