# Native input backlog

## Live pass-through acceptance

- **Title:** Verify the grouped native input modules in an interactive session.
- **Problem or opportunity:** Rust tests check style reconciliation and parsing, but cannot reproduce the intermittent click-through trigger or prove physical palette focus and key release.
- **Desired outcome:** Released modifier always restores clock pass-through, while Ctrl interactions, shortcuts, and the palette retain their expected behavior.
- **Scope:** [interaction.rs](../interaction.rs), [palette.rs](../palette.rs), [hotkeys.rs](../hotkeys.rs).
- **Acceptance criteria:** Exercise idle use, Ctrl-drag/click/menu, modifier release, palette select/cancel, Alt-Tab, tray Settings/Quit, display hide/show, and restored positions. Record HWND style if pass-through fails.
- **Dependencies and risks:** Requires an interactive Windows session and a disposable settings profile; mixed-DPI checks need a second display.
- **Verification:** Run `npm run tauri:dev` and follow the [parent click-through and palette checklists](../../doc/backlog.md).
- **Priority:** High because input pass-through is central to ordinary desktop use.
