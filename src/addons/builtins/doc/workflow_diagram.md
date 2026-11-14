# Built-in definition workflow

Counter's [display formatter](../counter.js) reads `value_ms`, running direction, and start time from the supplied native snapshot. It returns `H:MM:SS` until 100 hours, then `D:HH:MM`. The pure [appearance helper](../signed-balance-appearance.js) maps the resulting signed value and session's running flag to a color and signed state name for the shared clock row and Settings preview. Zero leaves the configured text color in place. Its three menu actions and Settings-only reset descriptor use the [host workflow](../../doc/workflow_diagram.md); this folder performs no persistence or shutdown write.


The Timer definition builds Mode choices for both modes and Set choices only in countdown mode. [countdown-presets.js](../countdown-presets.js) supplies the same elapsed-session confirmation metadata and bounded sorted-list editing to Timer and Progress. Timer's Settings selector dispatches the same mode choice as the clock menu; a running or elapsed session can be reset after confirmation. Native validation is authoritative if another window changes state while confirmation is open. See [the host workflow](../../doc/workflow_diagram.md).

For Region clock editing, [region-picker.js](../region-picker.js) joins browser-supported time zones with the bundled [IANA country map](../zone-country-codes.js), then derives localized and English names with `Intl.DisplayNames`. The [view](../../views/region-clock.html) filters those records from a transient query and sends only a chosen ID to the existing option editor. A Settings language change rebuilds the records; Escape and blur reset the query to the current selected label. The [display formatter](../region-clock.js) continues using the saved zone ID.

For an enabled countdown, `progressAddon.actions` returns Start/Pause and Reset for the clock menu using the same per-ID session state as the Settings buttons. The menu's Set control renders choices supplied by `progressAddon.menu.choices`; its native action emits a new session map, and the definition's next action calculation changes only the selected row's Start/Pause label. The other Progress modes return no actions.

The class diagram shows the shared object contract, rather than JavaScript inheritance.

```mermaid
classDiagram
    class AddonDefinition {
      kind
      maxInstances
      createOptions()
      describe()
      display()
      editor
      actions()
    }
    class DateAddon
    class RegionClockAddon
    class TimerAddon
    class ProgressAddon
    class CounterAddon
    DateAddon ..|> AddonDefinition
    RegionClockAddon ..|> AddonDefinition
    TimerAddon ..|> AddonDefinition
    ProgressAddon ..|> AddonDefinition
    CounterAddon ..|> AddonDefinition
```

The five definition objects live in [date.js](../date.js), [region-clock.js](../region-clock.js), [timer.js](../timer.js), [progress.js](../progress.js), and [counter.js](../counter.js). The notation describes their common fields; no runtime class or inheritance is created.

```mermaid
sequenceDiagram
    participant Clock as Clock or Settings preview
    participant Registry as Built-in definition
    participant Native as Native session snapshot
    Clock->>Registry: display(instance, settings, time, session)
    Registry->>Native: Read supplied snapshot
    Registry-->>Clock: Text, color, signed state, or other display data
    Clock->>Clock: Apply view-local animation history
```

Definitions calculate display data without writes. Timer and Progress editors read the host's shared reactive sessions and write draft resets through its setters before using the existing Settings save path. [The host workflow](../../doc/workflow_diagram.md) covers actions and persistence.
