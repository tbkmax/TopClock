# Frontend backlog

Use this file for unfinished work specific to [`src/`](../). Add actionable items with a problem, desired outcome, scope, acceptance criteria, risks, verification, and priority, following [the template](../../templates/doc/backlog.md).

TODO 2's Ctrl + right-click dropdown menu item for opening the Settings window and TODO 7's dedicated Shortcuts tab with conflict detection are complete. TODO 3's time format, installed font selection, outline, independent colon and number animation controls, and larger clock size range are complete. Hour padding and spacing are fixed: hours show without a leading zero beside the colon while minutes and seconds stay at two digits. See the [repository backlog](../../doc/backlog.md) for other proposals; verify each against current code before taking it on.

## Add-on layout verification

- **Title:** Constrain unusually tall add-on stacks to the visible monitor.
- **Problem or opportunity:** The stack prevents rows from overlapping, but many large region clocks can make the window taller than a small display.
- **Desired outcome:** Users can still see and control every enabled add-on on a small monitor.
- **Scope:** [main.js](../main.js), [style.css](../style.css), and the Add-ons dashboard in [settings.html](../../settings.html).
- **Acceptance criteria:** With 16 allowed instances and the largest clock size, the main clock remains reachable, rows do not overlap, and Settings explains any automatic size reduction or limit.
- **Dependencies and risks:** Preserve the clock anchor and native click-through while fitting content; do not silently remove an add-on.
- **Verification:** Test small and mixed-DPI monitors with above and below stacks, including the balanced gap around the main clock, dragging, menu opening and position restore.
- **Priority:** Medium because dense custom layouts can clip on small displays even though normal rows never overlap.
