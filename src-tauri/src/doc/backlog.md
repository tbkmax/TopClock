# Rust application backlog

TODO 4's settings-folder command is implemented. Multiple-display windows and saved per-display positions remain pending a display identity and persistence decision; see [TODO 4](../../../doc/TODO.md).

Use this file for verified unfinished native work. Each item should include problem, desired outcome, scope, acceptance criteria, risks, verification and priority, following [the template](../../../templates/doc/backlog.md).

TODO 7's shortcut persistence, modifier key validation, and dynamic Win32 modifier polling are complete. TODO 3's persistence, validation of independent animation choices and the 24–200 pixel size range, and Windows font enumeration are complete. Existing proposals in the [repository backlog](../../../doc/backlog.md) may be outdated; check [main.rs](../main.rs), [settings.rs](../settings.rs) and [fonts.rs](../fonts.rs) before adding them here.

## Timer clock-change resilience

- **Title:** Detect wall-clock jumps in a running Timer session.
- **Problem or opportunity:** Resume-after-restart uses a saved Unix start time. A manual clock change or time synchronization can change apparent elapsed time.
- **Desired outcome:** A running in-process Timer uses a monotonic clock; restart reconciliation explains or bounds an unexpected wall-clock jump.
- **Scope:** [addons.rs](../addons.rs), [main.rs](../main.rs), and Timer state tests.
- **Acceptance criteria:** Forward and backward system clock changes do not cause an in-process timer to jump; restart behavior is defined and tested.
- **Dependencies and risks:** Keep the persisted session format backward compatible and preserve countdown completion at zero.
- **Verification:** Simulate clock jumps in focused Timer tests and check a real Windows session.
- **Priority:** Medium because ordinary sessions work, but manual time adjustments can affect long timers.
