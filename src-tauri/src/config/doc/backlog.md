# Configuration backlog

Live persistence verification should include a mixed enabled pair, a targeted menu or palette switch that leaves the partner unchanged, a Settings Combined save that sets both flags, and restart/readback. A pre-change build may dissolve a mixed pair when it saves the file; check that it retains both flat instances. Use disposable settings data and the [frontend combined acceptance](../../../../src/doc/backlog.md#combined-add-on-live-acceptance).

The structural move is complete. The [Rust application backlog](../../doc/backlog.md) tracks live settings persistence and controlled write-failure checks. They must use disposable configuration data and confirm that a failed user save leaves the previous settings and sessions intact. There is no additional folder-specific proposal here.
