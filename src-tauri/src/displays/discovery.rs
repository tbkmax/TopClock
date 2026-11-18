use super::{identity, DisplayInfo, MonitorBounds};
use crate::state::ClockState;

pub(super) fn enumerate_displays(
    app: &tauri::AppHandle,
    state: &ClockState,
) -> Result<Vec<DisplayInfo>, String> {
    let identities = identity::active_display_identities();
    let primary = app.primary_monitor().map_err(|error| error.to_string())?;
    let preferences = state.config.lock().unwrap().displays.clone();
    let mut displays = Vec::new();
    for monitor in app
        .available_monitors()
        .map_err(|error| error.to_string())?
    {
        let source = monitor.name().cloned().unwrap_or_default();
        let identity = identities.get(&source.to_ascii_lowercase());
        let id = identity
            .map(|identity| identity.id.clone())
            .unwrap_or_else(|| {
                if source.is_empty() {
                    format!(
                        "bounds:{}:{}:{}:{}",
                        monitor.position().x,
                        monitor.position().y,
                        monitor.size().width,
                        monitor.size().height
                    )
                } else {
                    format!("slot:{}", source.to_ascii_lowercase())
                }
            });
        let name = identity
            .filter(|identity| !identity.friendly_name.is_empty())
            .map(|identity| format!("{} ({})", source, identity.friendly_name))
            .unwrap_or_else(|| source.clone());
        let bounds = MonitorBounds {
            x: monitor.position().x,
            y: monitor.position().y,
            width: monitor.size().width,
            height: monitor.size().height,
        };
        let is_primary = primary.as_ref().is_some_and(|primary| {
            primary.name() == monitor.name() && primary.position() == monitor.position()
        });
        let enabled = preferences
            .get(&id)
            .map(|preference| preference.visible)
            .unwrap_or(true);
        displays.push(DisplayInfo {
            id,
            name,
            primary: is_primary,
            enabled,
            bounds,
        });
    }
    displays.sort_by_key(|display| (!display.primary, display.bounds.x, display.bounds.y));
    // Clone mode exposes one desktop surface for multiple physical targets.
    displays.dedup_by(|a, b| a.bounds == b.bounds);
    Ok(displays)
}
