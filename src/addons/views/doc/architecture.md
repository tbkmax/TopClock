# Bundled add-on views

These fragments contain static Alpine markup for the clock and Settings. See the [host architecture](../../doc/architecture.md) and [frontend architecture](../../../doc/architecture.md) for their data sources.

[clock-row.html](../clock-row.html) owns the shared clock row and its click boundary. All four current add-ons return text, time parts, or progress data that this row can display. A later compiled type can register a special clock view without changing the row. [settings-row.html](../settings-row.html) owns the configured row, size, drag handle, enable switch, and action buttons. [preview-row.html](../preview-row.html) is reused above and below the preview clock. [date.html](../date.html), [region-clock.html](../region-clock.html), [timer.html](../timer.html), and [progress.html](../progress.html) contain the type-specific Settings controls. The type slots expand from the fixed [registry](../../registry.js).

[addon-fragments.js](../../../../scripts/addon-fragments.js) reads only registered files beneath this folder and inserts them through Vite's `transformIndexHtml` step in development and production. Missing or unknown slots fail. Alpine receives the composed markup before initialization; no runtime `x-html`, remote template, settings-provided markup, or arbitrary include path is used. Runtime values use text and attribute bindings. `x-for` keeps one row root and type fragments inherit the row's `addon` scope. Static IDs and per-instance IDs remain distinct.

The host owns action availability. Views call the page's controller methods and do not invoke Tauri commands directly. Existing CSS in [style.css](../../../style.css), [settings.css](../../../settings.css), and [progress.css](../../../progress.css) styles the assembled views.
