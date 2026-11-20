# Settings page backlog

- [ ] Verify the Counter Reset warning, Cancel, Confirm, and resulting zero display in a live Windows Settings window. Inspect history deletion after Confirm and preservation after Cancel or a native error. Automated Rust tests cover deletion, while modal layout and cross-webview refresh remain open.

Verify the paired card's three switches in the live Settings WebView. With only one member enabled, Combined must appear and announce on; clicking it turns both off, and clicking again turns both on. Check rapid edits through the save queue, persistence after restart, and recovery from a failed save. The [parent combined add-on checklist](../../doc/backlog.md#combined-add-on-live-acceptance) also covers clock and preview centering.

The [parent frontend backlog](../../doc/backlog.md) tracks live Windows verification of tab navigation, failed-save recovery, display changes, and Settings close behavior. Those checks still need an interactive Tauri run after this refactor. There is no additional folder-specific implementation item.
