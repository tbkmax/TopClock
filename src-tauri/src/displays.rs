use crate::{
    config_store::save_config,
    display_identity,
    interaction::{set_click_through, start_monitor},
    settings::{ClockPosition, DisplayPreference, PersistedConfig},
    state::ClockState,
};
use serde::Serialize;
use std::{
    sync::{atomic::Ordering, Arc},
    thread,
    time::Duration,
};
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use windows_sys::Win32::Foundation::HWND;

#[derive(Clone, Copy, PartialEq, Serialize)]
pub(crate) struct MonitorBounds {
    pub(crate) x: i32,
    pub(crate) y: i32,
    pub(crate) width: u32,
    pub(crate) height: u32,
}

#[derive(Clone)]
pub(crate) struct ActiveDisplay {
    pub(crate) label: String,
    pub(crate) bounds: MonitorBounds,
}

#[derive(Clone, PartialEq, Serialize)]
pub(crate) struct DisplayInfo {
    pub(crate) id: String,
    pub(crate) name: String,
    pub(crate) primary: bool,
    pub(crate) enabled: bool,
    pub(crate) bounds: MonitorBounds,
}

fn enumerate_displays(
    app: &tauri::AppHandle,
    state: &ClockState,
) -> Result<Vec<DisplayInfo>, String> {
    let identities = display_identity::active_display_identities();
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

#[tauri::command]
pub(crate) fn get_displays(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<ClockState>>,
) -> Result<Vec<DisplayInfo>, String> {
    enumerate_displays(&app, &state)
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
    if let Err(error) = save_config(&state, &config) {
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
    if let Err(error) = save_config(&state, &config) {
        eprintln!("Unable to save clock positions: {error}");
    }
}
fn position_on_display(
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

fn save_display_position(
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
        if let Err(error) = save_config(state, &config) {
            eprintln!("Unable to save display position: {error}");
        }
    }
}

pub(crate) fn reconcile_displays(
    app: &tauri::AppHandle,
    state: &Arc<ClockState>,
) -> Result<Vec<DisplayInfo>, String> {
    let displays = enumerate_displays(app, state)?;
    if displays.is_empty() {
        let active = std::mem::take(&mut *state.active_displays.lock().unwrap());
        for display in active.values() {
            if let Some(window) = app.get_webview_window(&display.label) {
                if display.label == "main" {
                    let _ = window.hide();
                } else {
                    let _ = window.destroy();
                }
            }
        }
        state.menu_open.lock().unwrap().clear();
        return Ok(displays);
    }
    let mut main_id = state.main_display_id.lock().unwrap();
    if main_id.is_none() {
        let legacy = state.config.lock().unwrap().position;
        let main = legacy
            .and_then(|position| {
                displays.iter().find(|display| {
                    position.x >= display.bounds.x
                        && position.x < display.bounds.x + display.bounds.width as i32
                        && position.y >= display.bounds.y
                        && position.y < display.bounds.y + display.bounds.height as i32
                })
            })
            .unwrap_or(&displays[0]);
        *main_id = Some(main.id.clone());
        if let Some(position) = legacy {
            let mut config = state.config.lock().unwrap();
            config.displays.entry(main.id.clone()).or_default().position = Some(ClockPosition {
                x: position.x - main.bounds.x,
                y: position.y - main.bounds.y,
            });
            config.position = None;
            save_config(state, &config)?;
        }
    }
    let selected_main_id = main_id.clone();
    drop(main_id);
    let mut active = state.active_displays.lock().unwrap().clone();
    for (id, old) in active.clone() {
        if !displays
            .iter()
            .any(|display| display.id == id && display.enabled)
        {
            if let Some(window) = app.get_webview_window(&old.label) {
                if displays.iter().any(|display| display.id == id) {
                    save_display_position(state, &id, &old, &window);
                }
                if old.label == "main" {
                    let _ = window.hide();
                } else {
                    let _ = window.destroy();
                }
            }
            state.menu_open.lock().unwrap().remove(&old.label);
            active.remove(&id);
            *state.active_displays.lock().unwrap() = active.clone();
        }
    }
    for display in displays.iter().filter(|display| display.enabled) {
        if let Some(old) = active.get_mut(&display.id) {
            if old.bounds != display.bounds {
                if let Some(window) = app.get_webview_window(&old.label) {
                    let size = window.outer_size().map_err(|error| error.to_string())?;
                    let config = state.config.lock().unwrap();
                    let position = position_on_display(&config, display, size);
                    drop(config);
                    window
                        .set_position(position)
                        .map_err(|error| error.to_string())?;
                }
                old.bounds = display.bounds;
                *state.active_displays.lock().unwrap() = active.clone();
            }
            continue;
        }
        let is_main = selected_main_id.as_deref() == Some(display.id.as_str());
        let label = if is_main {
            "main".to_string()
        } else {
            format!(
                "clock-{}",
                state.next_window_id.fetch_add(1, Ordering::Relaxed)
            )
        };
        let window = if is_main {
            app.get_webview_window("main")
                .ok_or("Main clock window is unavailable")?
        } else {
            WebviewWindowBuilder::new(app, &label, WebviewUrl::App("index.html".into()))
                .title("TopClock")
                .inner_size(380.0, 110.0)
                .resizable(false)
                .maximizable(false)
                .decorations(false)
                .transparent(true)
                .always_on_top(true)
                .skip_taskbar(true)
                .focused(false)
                .visible(false)
                .shadow(false)
                .build()
                .map_err(|error| error.to_string())?
        };
        if let Ok(hwnd) = window.hwnd() {
            set_click_through(hwnd.0 as HWND, true);
        }
        let size = window.outer_size().map_err(|error| error.to_string())?;
        let config = state.config.lock().unwrap();
        let position = position_on_display(&config, display, size);
        drop(config);
        window
            .set_position(position)
            .map_err(|error| error.to_string())?;
        active.insert(
            display.id.clone(),
            ActiveDisplay {
                label: label.clone(),
                bounds: display.bounds,
            },
        );
        *state.active_displays.lock().unwrap() = active.clone();
        window.show().map_err(|error| error.to_string())?;
        if !is_main {
            start_monitor(window, state.clone());
        }
    }
    Ok(displays)
}

pub(crate) fn start_display_manager(app: tauri::AppHandle, state: Arc<ClockState>) {
    thread::spawn(move || {
        let mut previous = Vec::new();
        loop {
            match reconcile_displays(&app, &state) {
                Ok(displays) if displays != previous => {
                    let _ = app.emit("displays-changed", &displays);
                    previous = displays;
                }
                Err(error) => eprintln!("Unable to reconcile displays: {error}"),
                _ => {}
            }
            thread::sleep(Duration::from_secs(2));
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn display_positions_restore_relative_to_each_display() {
        let mut config = PersistedConfig::default();
        config.displays.insert(
            "first".into(),
            DisplayPreference {
                visible: true,
                position: Some(ClockPosition { x: 100, y: 40 }),
            },
        );
        config.displays.insert(
            "second".into(),
            DisplayPreference {
                visible: true,
                position: Some(ClockPosition { x: 20, y: 60 }),
            },
        );
        let first = DisplayInfo {
            id: "first".into(),
            name: "First".into(),
            primary: true,
            enabled: true,
            bounds: MonitorBounds {
                x: 0,
                y: 0,
                width: 1920,
                height: 1080,
            },
        };
        let second = DisplayInfo {
            id: "second".into(),
            name: "Second".into(),
            primary: false,
            enabled: true,
            bounds: MonitorBounds {
                x: 1920,
                y: 0,
                width: 1920,
                height: 1080,
            },
        };
        let size = tauri::PhysicalSize::new(300, 100);
        assert_eq!(position_on_display(&config, &first, size).x, 100);
        assert_eq!(position_on_display(&config, &second, size).x, 1940);
        config.displays.get_mut("second").unwrap().position = Some(ClockPosition { x: 260, y: 60 });
        assert_eq!(position_on_display(&config, &first, size).x, 100);
        assert_eq!(position_on_display(&config, &second, size).x, 2180);
        config.displays.get_mut("first").unwrap().position = Some(ClockPosition { x: 1880, y: 40 });
        assert_eq!(position_on_display(&config, &first, size).x, 1880);
        config.displays.get_mut("first").unwrap().position = Some(ClockPosition { x: -18, y: -12 });
        let unrestricted = position_on_display(&config, &first, size);
        assert_eq!((unrestricted.x, unrestricted.y), (-18, -12));
        assert_eq!(position_on_display(&config, &second, size).x, 2180);
    }
}
