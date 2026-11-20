# Configuration backlog

The [frontend Clock visibility acceptance](../../../../src/doc/backlog.md#clock-visibility-live-acceptance) covers real restart persistence and rejected-save recovery. Serde and validation unit tests cover defaults, round-trip, and bounds.

- [ ] **Exercise two-file failure recovery:** In a disposable profile, fault JSON replacement, SQLite commit, and process exit between them. Verify failed saves report errors without publishing a successful Counter stop; after restart, disabled JSON and any open run reconcile at the last durable checkpoint. Check Settings persistence and position restore. Unit tests cover JSON replacement and staged SQLite rollback; full crash timing remains a release risk.

Live persistence verification should include a mixed enabled pair, a targeted menu or palette switch that leaves the partner unchanged, a Settings Combined save that sets both flags, and restart/readback. A pre-change build may dissolve a mixed pair when it saves the file; check that it retains both flat instances. Use disposable settings data and the [frontend combined acceptance](../../../../src/doc/backlog.md#combined-add-on-live-acceptance).

The structural move is complete. The [Rust application backlog](../../doc/backlog.md) tracks live settings persistence and controlled write-failure checks. They must use disposable configuration data and confirm that a failed user save leaves the previous settings and sessions intact. There is no additional folder-specific proposal here.
