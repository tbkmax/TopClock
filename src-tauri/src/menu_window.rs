use crate::state::ClockState;
use serde::Serialize;
use std::sync::{atomic::Ordering, Arc};
use tauri::{Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewWindow};

const EDGE_INSET: i32 = 8;

#[derive(Clone, Serialize)]
pub(crate) struct MenuRequest {
    pub(crate) id: usize,
    pub(crate) source: String,
    pub(crate) anchor_x: i32,
    pub(crate) anchor_y: i32,
}

#[derive(Clone, Copy)]
struct DisplayRect {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

fn distance_to_display(x: i32, y: i32, rect: DisplayRect) -> i64 {
    let right = i64::from(rect.x) + i64::from(rect.width);
    let bottom = i64::from(rect.y) + i64::from(rect.height);
    let dx = (i64::from(rect.x) - i64::from(x)).max(0) + (i64::from(x) - right).max(0);
    let dy = (i64::from(rect.y) - i64::from(y)).max(0) + (i64::from(y) - bottom).max(0);
    dx * dx + dy * dy
}

fn fit_menu(
    anchor_x: i32,
    anchor_y: i32,
    requested: PhysicalSize<u32>,
    display: DisplayRect,
) -> (PhysicalPosition<i32>, PhysicalSize<u32>) {
    let available_width = display.width.saturating_sub((EDGE_INSET * 2) as u32).max(1);
    let available_height = display
        .height
        .saturating_sub((EDGE_INSET * 2) as u32)
        .max(1);
    let size = PhysicalSize::new(
        requested.width.min(available_width),
        requested.height.min(available_height),
    );
    let min_x = display.x + EDGE_INSET;
    let min_y = display.y + EDGE_INSET;
    let max_x = display.x + display.width as i32 - EDGE_INSET - size.width as i32;
    let max_y = display.y + display.height as i32 - EDGE_INSET - size.height as i32;
    let position = PhysicalPosition::new(
        anchor_x.saturating_add(8).clamp(min_x, max_x),
        anchor_y.saturating_add(8).clamp(min_y, max_y),
    );
    (position, size)
}

#[tauri::command]
pub(crate) fn open_clock_menu(
    app: tauri::AppHandle,
    window: WebviewWindow,
    state: tauri::State<'_, Arc<ClockState>>,
    client_x: f64,
    client_y: f64,
) -> Result<(), String> {
    if window.label() != "main" && !window.label().starts_with("clock-") {
        return Err("Clock menu must be opened from a clock".into());
    }
    if !client_x.is_finite() || !client_y.is_finite() {
        return Err("Invalid menu position".into());
    }
    let origin = window.outer_position().map_err(|error| error.to_string())?;
    let scale = window.scale_factor().map_err(|error| error.to_string())?;
    let request = MenuRequest {
        id: state.next_menu_request_id.fetch_add(1, Ordering::Relaxed),
        source: window.label().to_owned(),
        anchor_x: origin.x.saturating_add((client_x * scale).round() as i32),
        anchor_y: origin.y.saturating_add((client_y * scale).round() as i32),
    };
    let menu = app
        .get_webview_window("menu")
        .ok_or("Clock menu is unavailable")?;
    let _ = menu.hide();
    *state.menu_request.lock().unwrap() = Some(request.clone());
    let mut open = state.menu_open.lock().unwrap();
    open.clear();
    open.insert(request.source.clone());
    drop(open);
    app.emit_to("menu", "clock-menu-open", request)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) fn get_clock_menu_request(
    window: WebviewWindow,
    state: tauri::State<'_, Arc<ClockState>>,
) -> Option<MenuRequest> {
    (window.label() == "menu")
        .then(|| state.menu_request.lock().unwrap().clone())
        .flatten()
}

#[tauri::command]
pub(crate) fn show_clock_menu(
    app: tauri::AppHandle,
    window: WebviewWindow,
    state: tauri::State<'_, Arc<ClockState>>,
    request_id: usize,
    width: u32,
    height: u32,
) -> Result<(), String> {
    if window.label() != "menu" {
        return Err("Only the menu window can position itself".into());
    }
    let request = state
        .menu_request
        .lock()
        .unwrap()
        .clone()
        .ok_or("Menu request expired")?;
    if request.id != request_id {
        return Err("Menu request expired".into());
    }
    let monitor = app
        .available_monitors()
        .map_err(|error| error.to_string())?
        .into_iter()
        .min_by_key(|monitor| {
            distance_to_display(
                request.anchor_x,
                request.anchor_y,
                DisplayRect {
                    x: monitor.position().x,
                    y: monitor.position().y,
                    width: monitor.size().width,
                    height: monitor.size().height,
                },
            )
        })
        .ok_or("No display is available")?;
    let display = DisplayRect {
        x: monitor.position().x,
        y: monitor.position().y,
        width: monitor.size().width,
        height: monitor.size().height,
    };
    let scale = monitor.scale_factor();
    let requested = PhysicalSize::new(
        (f64::from(width.clamp(120, 600)) * scale).ceil() as u32,
        (f64::from(height.clamp(40, 640)) * scale).ceil() as u32,
    );
    let (position, size) = fit_menu(request.anchor_x, request.anchor_y, requested, display);
    if window.outer_position().ok() != Some(position) {
        window
            .set_position(position)
            .map_err(|error| error.to_string())?;
    }
    if window.outer_size().ok() != Some(size) {
        window.set_size(size).map_err(|error| error.to_string())?;
    }
    if !window.is_visible().map_err(|error| error.to_string())? {
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub(crate) fn close_clock_menu(
    window: WebviewWindow,
    state: tauri::State<'_, Arc<ClockState>>,
    request_id: usize,
) -> Result<(), String> {
    if window.label() != "menu" {
        return Err("Only the menu window can close itself".into());
    }
    let mut request = state.menu_request.lock().unwrap();
    if request
        .as_ref()
        .is_none_or(|current| current.id != request_id)
    {
        return Ok(());
    }
    window.hide().map_err(|error| error.to_string())?;
    *request = None;
    state.menu_open.lock().unwrap().clear();
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn menu_fits_display_without_moving_clock_anchor() {
        let display = DisplayRect {
            x: -1920,
            y: -200,
            width: 1920,
            height: 1080,
        };
        let size = PhysicalSize::new(320, 400);
        let (top_right, actual) = fit_menu(-20, -180, size, display);
        assert_eq!(actual, size);
        assert_eq!(top_right.x, -328);
        assert_eq!(top_right.y, -172);
        let (bottom_left, _) = fit_menu(-1910, 860, size, display);
        assert_eq!(bottom_left.x, -1902);
        assert_eq!(bottom_left.y, 472);
        let (position, clipped) = fit_menu(0, 0, PhysicalSize::new(3000, 2000), display);
        assert_eq!(clipped, PhysicalSize::new(1904, 1064));
        assert_eq!(position, PhysicalPosition::new(-1912, -192));
    }
}
