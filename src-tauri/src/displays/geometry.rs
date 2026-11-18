use super::{DisplayInfo, MonitorBounds};
use crate::config::model::PersistedConfig;

pub(super) fn centered_position(
    bounds: MonitorBounds,
    size: tauri::PhysicalSize<u32>,
) -> tauri::PhysicalPosition<i32> {
    tauri::PhysicalPosition::new(
        bounds.x + (bounds.width as i32 - size.width as i32) / 2,
        bounds.y + (bounds.height as i32 - size.height as i32) / 2,
    )
}

pub(super) fn position_on_display(
    config: &PersistedConfig,
    display: &DisplayInfo,
    size: tauri::PhysicalSize<u32>,
) -> tauri::PhysicalPosition<i32> {
    let saved = config
        .displays
        .get(&display.id)
        .and_then(|preference| preference.position);
    let bounds = display.bounds;
    if let Some(position) = saved {
        return tauri::PhysicalPosition::new(bounds.x + position.x, bounds.y + position.y);
    }
    tauri::PhysicalPosition::new(
        (bounds.x + bounds.width as i32 - size.width as i32 - 24).max(bounds.x),
        bounds.y + 24,
    )
}
