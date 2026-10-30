# Scripts backlog

Use this file for verified unfinished work in [the Windows wrapper](../tauri-windows.cmd), [MSIX build](../Build-Msix.ps1), and [portable cleanup scripts](../Uninstall-TopClock.cmd). Follow [the backlog template](../../templates/doc/backlog.md) for scope, acceptance criteria, risks, verification and priority.

## Store-delivered installation validation

- **Title:** Validate Store-signed installation and upgrades.
- **Problem or opportunity:** [Build-Msix.ps1](../Build-Msix.ps1) creates an unsigned package for Partner Center; a loose-registered development package does not prove Store installation or upgrade behavior.
- **Desired outcome:** A Store-delivered candidate installs and upgrades while preserving settings and desktop positions.
- **Scope:** The MSIX package and the [release plan](../../doc/plan/MSIX_STORE_PLAN.md).
- **Acceptance criteria:** The Store identity and publisher match Partner Center; installation and upgrade of two increasing versions succeed; packaged sign-in and settings paths work after upgrade.
- **Dependencies and risks:** Requires Store delivery and signing. The user declined self-signed certificate testing. Keep unsigned artifacts free of private keys.
- **Verification:** Install a Store-delivered candidate on a clean Windows test profile, then run the package acceptance checks in the release plan.
- **Priority:** High for a Store release, but it does not block inspecting or submitting the unsigned package.
