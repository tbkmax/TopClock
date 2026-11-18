use super::{
    discovery::enumerate_displays, geometry::centered_position, ActiveDisplay, DisplayInfo,
};
use crate::{
    config::model::{ClockPosition, DisplayPreference},
    config::store::save_config,
    state::ClockState,
};
use std::sync::Arc;
use tauri::{Manager, WebviewWindow};

#[tauri::command]
pub(crate) fn get_displays(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<ClockState>>,
) -> Result<Vec<DisplayInfo>, String> {
    enumerate_displays(&app, &state)
}

#[tauri::command]
pub(crate) fn reset_clock_positions(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<ClockState>>,
) -> Result<(), String> {
    let active = state.active_displays.lock().unwrap().clone();
    let mut moves = Vec::new();
    for (id, display) in active {
        let Some(window) = app.get_webview_window(&display.label) else {
            continue;
        };
        if !window.is_visible().map_err(|error| error.to_string())? {
            continue;
        }
        let previous = window.outer_position().map_err(|error| error.to_string())?;
        let size = window.outer_size().map_err(|error| error.to_string())?;
        let target = centered_position(display.bounds, size);
        moves.push((id, display.bounds, window, previous, target));
    }
    if moves.is_empty() {
        return Err("No visible clocks to reset".into());
    }

    let mut moved = 0;
    for (_, _, window, _, target) in &moves {
        if let Err(error) = window.set_position(*target) {
            for (_, _, previous_window, previous, _) in moves.iter().take(moved) {
                let _ = previous_window.set_position(*previous);
            }
            return Err(error.to_string());
        }
        moved += 1;
    }

    let mut config = state.config.lock().unwrap();
    let previous_displays = config.displays.clone();
    for (id, bounds, _, _, target) in &moves {
        config.displays.entry(id.clone()).or_default().position = Some(ClockPosition {
            x: target.x - bounds.x,
            y: target.y - bounds.y,
        });
    }
    if let Err(error) = save_config(&state.settings_path, &config) {
        config.displays = previous_displays;
        for (_, _, window, previous, _) in &moves {
            let _ = window.set_position(*previous);
        }
        return Err(error);
    }
    Ok(())
}

#[tauri::command]
pub(crate) fn set_display_enabled(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<ClockState>>,
    id: String,
    enabled: bool,
) -> Result<(), String> {
    if !enumerate_displays(&app, &state)?
        .iter()
        .any(|display| display.id == id)
    {
        return Err("Display is no longer connected".into());
    }
    let mut config = state.config.lock().unwrap();
    let previous = config.displays.get(&id).cloned();
    config
        .displays
        .entry(id.clone())
        .or_insert_with(DisplayPreference::default)
        .visible = enabled;
    if let Err(error) = save_config(&state.settings_path, &config) {
        if let Some(previous) = previous {
            config.displays.insert(id, previous);
        } else {
            config.displays.remove(&id);
        }
        return Err(error);
    }
    Ok(())
}
pub(crate) fn save_current_position(app: &tauri::AppHandle) {
    let state = app.state::<Arc<ClockState>>();
    let active = state.active_displays.lock().unwrap().clone();
    let mut config = state.config.lock().unwrap();
    for (id, display) in active {
        if let Some(window) = app.get_webview_window(&display.label) {
            if let Ok(position) = window.outer_position() {
                config.displays.entry(id).or_default().position = Some(ClockPosition {
                    x: position.x - display.bounds.x,
                    y: position.y - display.bounds.y,
                });
            }
        }
    }
    if let Err(error) = save_config(&state.settings_path, &config) {
        eprintln!("Unable to save clock positions: {error}");
    }
}
pub(super) fn save_display_position(
    state: &ClockState,
    id: &str,
    display: &ActiveDisplay,
    window: &WebviewWindow,
) {
    if let Ok(position) = window.outer_position() {
        let mut config = state.config.lock().unwrap();
        config.displays.entry(id.to_string()).or_default().position = Some(ClockPosition {
            x: position.x - display.bounds.x,
            y: position.y - display.bounds.y,
        });
        if let Err(error) = save_config(&state.settings_path, &config) {
            eprintln!("Unable to save display position: {error}");
        }
    }
}
