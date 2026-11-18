# Platform service backlog

## Installed-package acceptance

- **Title:** Verify platform services from a Store-installed MSIX.
- **Problem or opportunity:** Rust tests cannot prove package identity, StartupTask policy, Store permission UI, or the installed settings path.
- **Desired outcome:** Locale, updates, startup state, settings folder, and WebView2 behavior match the documented package contract.
- **Scope:** [startup.rs](../startup.rs), [store_updates.rs](../store_updates.rs), [locale.rs](../locale.rs), [webview_runtime.rs](../webview_runtime.rs).
- **Acceptance criteria:** Follow the [package backlog](../../../doc/backlog.md#msix-installed-package-validation), including update/cancel/offline cases, Windows Startup disable, language choice, and settings persistence across upgrade.
- **Dependencies and risks:** Needs a certified Store candidate and test Windows installation; do not use the user's production profile for destructive package checks.
- **Verification:** Install increasing package versions and perform the package checklist.
- **Priority:** High before Store release because build success does not establish installed behavior.
