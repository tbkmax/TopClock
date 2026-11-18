use super::{
    discovery::enumerate_displays, geometry::position_on_display, positions::save_display_position,
    ActiveDisplay, DisplayInfo,
};
use crate::{
    config::model::ClockPosition,
    config::store::save_config,
    input::interaction::{set_click_through, start_monitor},
    state::ClockState,
};
use std::{
    sync::{atomic::Ordering, Arc},
    thread,
    time::Duration,
};
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use windows_sys::Win32::Foundation::HWND;

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
            if let Err(error) = save_config(&state.settings_path, &config) {
                eprintln!("Unable to persist migrated clock position: {error}");
            }
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
