# Capabilities backlog

Verify a packaged palette WebView can receive native events and call current add-on commands under [default.json](../default.json), then hide on release under [palette.json](../palette.json). The native palette command briefly shows an action error if needed. The [frontend live checklist](../../../src/doc/backlog.md#mouse-palette-live-windows-acceptance) covers physical input and click-through. This is high-priority package acceptance; the Vite build and unit tests cannot prove installed permissions.

Verify packaged builds include `menu.html` and permit the menu webview to call its native commands; the local Vite build and dev smoke passed.


Use this file for verified permission work affecting [default.json](../default.json). Follow [the backlog template](../../../templates/doc/backlog.md), including the affected window, permission and verification path.

The geometry permissions needed by TODO 3 and runtime `clock-*` windows for TODO 4 are in place. No capability-specific unfinished work has been verified.
