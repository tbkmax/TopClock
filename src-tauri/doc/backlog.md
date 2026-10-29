# Tauri package backlog

TODO 4's display windows and Windows identity binding are implemented. Physical multi-monitor verification remains in the [frontend backlog](../../src/doc/backlog.md).

Use this file for unfinished package-wide work. Describe the problem, desired outcome, scope, acceptance criteria, dependencies, risks, verification and priority as requested by [the template](../../templates/doc/backlog.md).

TODO 3's package permission and font enumeration updates are complete. The native module extraction is complete without package configuration changes; a live Windows smoke check remains in the [Rust application backlog](../src/doc/backlog.md). Review the existing [repository backlog](../../doc/backlog.md) against current source before adopting a proposal.

The add-on system uses existing Tauri window and event permissions. Timer clock-change resilience is tracked in the [Rust application backlog](../src/doc/backlog.md); dense stack fitting is tracked in the [frontend backlog](../../src/doc/backlog.md).

## MSIX installed-package validation

- **Title:** Validate the unsigned development package after signing and installation.
- **Problem or opportunity:** MakeAppx accepts the new manifest, but an installed package has not yet been exercised with package identity.
- **Desired outcome:** Startup, settings persistence, tray, windows, shortcuts, click-through, and upgrade behavior work from MSIX.
- **Scope:** [Build-Msix.ps1](../../scripts/Build-Msix.ps1), [startup.rs](../src/startup.rs), configuration paths and package manifest.
- **Acceptance criteria:** Use the full checklist in the [MSIX plan](../../doc/plan/MSIX_STORE_PLAN.md), including in-place upgrade and Windows Startup settings disable behavior. Record the real data path and uninstall result.
- **Dependencies and risks:** Requires a trusted development signature and test Windows installations; keep the current NSIS release until checks pass.
- **Verification:** Install two increasing MSIX versions, exercise the app, and run Windows App Certification Kit.
- **Priority:** High because build success alone cannot establish Store readiness.
