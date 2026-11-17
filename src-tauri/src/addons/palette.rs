use crate::{interaction::set_click_through, state::ClockState};
use serde::Serialize;
use std::{
    sync::Arc,
    thread,
    time::{Duration, Instant},
};
use tauri::{Emitter, Manager, PhysicalPosition, PhysicalSize};
use windows_sys::Win32::{
    Foundation::{HWND, POINT},
    UI::{
        Input::KeyboardAndMouse::{
            GetAsyncKeyState, VK_CONTROL, VK_ESCAPE, VK_LBUTTON, VK_MBUTTON, VK_MENU, VK_RBUTTON,
            VK_SHIFT, VK_TAB,
        },
        WindowsAndMessaging::{
            GetCursorPos, GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos, GWL_EXSTYLE,
            SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER,
            WS_EX_NOACTIVATE,
        },
    },
};

#[derive(Clone, Copy, Serialize)]
struct Pointer {
    x: f64,
    y: f64,
    center_x: f64,
    center_y: f64,
}

#[derive(Clone, Copy)]
struct Active {
    origin: PhysicalPosition<i32>,
    scale: f64,
    anchor: POINT,
    last: POINT,
}

impl Active {
    fn pointer(self, cursor: POINT) -> Pointer {
        Pointer {
            x: f64::from(cursor.x - self.origin.x) / self.scale,
            y: f64::from(cursor.y - self.origin.y) / self.scale,
            center_x: f64::from(self.anchor.x - self.origin.x) / self.scale,
            center_y: f64::from(self.anchor.y - self.origin.y) / self.scale,
        }
    }
}

fn key_code(key: &str) -> Option<i32> {
    match key {
        "Ctrl" => Some(VK_CONTROL as i32),
        "Alt" => Some(VK_MENU as i32),
        "Shift" => Some(VK_SHIFT as i32),
        _ => None,
    }
}

fn keep_overlay_nonactivating(hwnd: HWND) {
    unsafe {
        let style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, style | WS_EX_NOACTIVATE as isize);
        SetWindowPos(
            hwnd,
            std::ptr::null_mut(),
            0,
            0,
            0,
            0,
            SWP_FRAMECHANGED | SWP_NOACTIVATE | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER,
        );
    }
    set_click_through(hwnd, true);
}

#[tauri::command]
pub(crate) fn show_palette_error(window: tauri::WebviewWindow) -> Result<(), String> {
    if window.label() != "palette" {
        return Err("Only the palette may show its action error".into());
    }
    window.show().map_err(|error| error.to_string())?;
    if let Ok(hwnd) = window.hwnd() {
        keep_overlay_nonactivating(hwnd.0);
    }
    Ok(())
}

#[tauri::command]
pub(crate) fn toggle_palette_settings(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
) -> Result<(), String> {
    if window.label() != "palette" {
        return Err("Only the palette may toggle Settings".into());
    }
    let settings = app
        .get_webview_window("settings")
        .ok_or("Settings window is unavailable")?;
    let visible = settings.is_visible().map_err(|error| error.to_string())?;
    let minimized = settings.is_minimized().map_err(|error| error.to_string())?;
    if visible && !minimized {
        // Settings owns its save flush; ask its existing close method to run.
        app.emit_to("settings", "palette-request-settings-close", ())
            .map_err(|error| error.to_string())
    } else {
        crate::window_commands::show_settings(&app);
        Ok(())
    }
}

pub(crate) fn start_palette(app: tauri::AppHandle, state: Arc<ClockState>) {
    thread::spawn(move || {
        let Some(window) = app.get_webview_window("palette") else {
            return;
        };
        if let Ok(hwnd) = window.hwnd() {
            keep_overlay_nonactivating(hwnd.0);
        }
        let mut active: Option<Active> = None;
        let mut was_down = false;
        let mut pressed_at: Option<Instant> = None;
        let mut suppressed = false;
        loop {
            let (enabled, key) = {
                let config = state.config.lock().unwrap();
                (
                    config.settings.palette_enabled,
                    config.settings.shortcuts.palette_key.clone(),
                )
            };
            let down = enabled
                && key_code(&key)
                    .is_some_and(|vk| unsafe { GetAsyncKeyState(vk) as u16 & 0x8000 != 0 });
            let other_modifier = [VK_CONTROL, VK_MENU, VK_SHIFT].into_iter().any(|vk| {
                key_code(&key) != Some(vk as i32)
                    && unsafe { GetAsyncKeyState(vk as i32) as u16 & 0x8000 != 0 }
            });
            let blocked = other_modifier
                || [VK_TAB, VK_ESCAPE, VK_LBUTTON, VK_RBUTTON, VK_MBUTTON]
                    .into_iter()
                    .any(|vk| unsafe { GetAsyncKeyState(vk as i32) as u16 & 0x8000 != 0 })
                || state.menu_request.lock().unwrap().is_some();
            let mut cursor = POINT { x: 0, y: 0 };
            let has_cursor = unsafe { GetCursorPos(&mut cursor) } != 0;
            if down && !was_down {
                pressed_at = Some(Instant::now());
                suppressed = blocked || window.is_visible().unwrap_or(false);
            }
            if down && blocked {
                suppressed = true;
                if active.take().is_some() {
                    let _ = app.emit_to("palette", "palette-cancel", ());
                    let _ = window.hide();
                }
            } else if down
                && !suppressed
                && active.is_none()
                && pressed_at.is_some_and(|started| started.elapsed() >= Duration::from_millis(120))
                && has_cursor
            {
                if let Ok(monitors) = app.available_monitors() {
                    if let Some(monitor) = monitors.into_iter().find(|monitor| {
                        let pos = monitor.position();
                        let size = monitor.size();
                        cursor.x >= pos.x
                            && cursor.y >= pos.y
                            && i64::from(cursor.x) < i64::from(pos.x) + i64::from(size.width)
                            && i64::from(cursor.y) < i64::from(pos.y) + i64::from(size.height)
                    }) {
                        let origin = *monitor.position();
                        let size: PhysicalSize<u32> = *monitor.size();
                        let next = Active {
                            origin,
                            scale: monitor.scale_factor(),
                            anchor: cursor,
                            last: cursor,
                        };
                        if window.set_position(origin).is_ok()
                            && window.set_size(size).is_ok()
                            && window.show().is_ok()
                        {
                            if let Ok(hwnd) = window.hwnd() {
                                keep_overlay_nonactivating(hwnd.0);
                            }
                            let _ = app.emit_to("palette", "palette-open", next.pointer(cursor));
                            active = Some(next);
                        }
                    }
                }
            } else if down && has_cursor {
                if let Some(current) = active.as_mut() {
                    if cursor.x != current.last.x || cursor.y != current.last.y {
                        current.last = cursor;
                        let _ = app.emit_to("palette", "palette-move", current.pointer(cursor));
                    }
                }
            } else if !down {
                pressed_at = None;
                suppressed = false;
                if let Some(current) = active.take() {
                    if enabled && has_cursor {
                        let _ = app.emit_to("palette", "palette-release", current.pointer(cursor));
                    } else {
                        let _ = app.emit_to("palette", "palette-cancel", ());
                    }
                    // The native key release owns this topmost overlay's lifetime.
                    // The persistent WebView can finish its queued action after hiding.
                    let _ = window.hide();
                }
            }
            was_down = down;
            thread::sleep(Duration::from_millis(20));
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn palette_key_is_a_different_modifier() {
        assert_eq!(key_code("Alt"), Some(VK_MENU as i32));
        assert_eq!(key_code("Ctrl"), Some(VK_CONTROL as i32));
        assert_eq!(key_code("Shift"), Some(VK_SHIFT as i32));
        assert_eq!(key_code(""), None);
    }
}
