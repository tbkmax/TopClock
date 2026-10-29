# Scripts backlog

Use this file for verified unfinished work in [the Windows wrapper](../tauri-windows.cmd) and [portable cleanup scripts](../Uninstall-TopClock.cmd). Follow [the backlog template](../../templates/doc/backlog.md) for scope, acceptance criteria, risks, verification and priority.

## Signed installation workflow

- **Title:** Add a repeatable local development signing path after the MSIX runtime is validated.
- **Problem or opportunity:** [Build-Msix.ps1](../Build-Msix.ps1) creates an unsigned package, so it cannot be installed as a normal MSIX yet.
- **Desired outcome:** A developer can sign with a matching local certificate and install without putting a private key in the repository or CI artifact.
- **Scope:** The MSIX script and the [release plan](../../doc/plan/MSIX_STORE_PLAN.md).
- **Acceptance criteria:** Signature publisher matches manifest; installation and upgrade of two increasing versions succeed; certificate trust changes are explicit and reversible.
- **Dependencies and risks:** Final Store identity comes from Partner Center; never commit signing keys. Keep the current unsigned CI artifact until this is verified.
- **Verification:** Sign and install on a clean Windows test profile, then run the package acceptance checks in the release plan.
- **Priority:** High for a Store release, but it does not block inspecting the unsigned development package.
