use crate::{config_store::save_config, settings::ClockPosition, state::ClockState, timer};
use std::{
    sync::Arc,
    thread,
    time::{Duration, Instant},
};
use tauri::{Emitter, Manager, WebviewWindow};
use windows_sys::Win32::{
    Foundation::{HWND, POINT},
    UI::{
        Input::KeyboardAndMouse::{GetAsyncKeyState, VK_CONTROL, VK_MENU, VK_SHIFT},
        WindowsAndMessaging::{
            GetCursorPos, GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos, GWL_EXSTYLE,
            SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER, WS_EX_LAYERED,
            WS_EX_TRANSPARENT,
        },
    },
};

pub(crate) fn set_click_through(hwnd: HWND, ignore: bool) {
    unsafe {
        let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        let new_style = if ignore {
            ex_style | (WS_EX_TRANSPARENT as isize) | (WS_EX_LAYERED as isize)
        } else {
            (ex_style & !(WS_EX_TRANSPARENT as isize)) | (WS_EX_LAYERED as isize)
        };
        if new_style != ex_style {
            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, new_style);
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
    }
}
pub(crate) fn start_monitor(window: WebviewWindow, state: Arc<ClockState>) {
    let hwnd_raw = match window.hwnd() {
        Ok(h) => h.0 as isize,
        Err(error) => {
            eprintln!("Unable to get window handle for monitor: {error}");
            return;
        }
    };
    thread::spawn(move || {
        let hwnd = hwnd_raw as HWND;
        let mut last_ctrl = None;
        let mut last_near = None;
        // The pre-show style may be changed while Windows shows the webview.
        // Reconcile the actual window after it becomes visible on the first poll.
        let mut last_ignore = None;
        let mut last_position = window.outer_position().ok();
        let mut position_changed_at = None;

        loop {
            if window
                .app_handle()
                .get_webview_window(window.label())
                .is_none()
            {
                break;
            }
            let modifier_vk = {
                let config = state.config.lock().unwrap();
                match config.settings.shortcuts.interaction_modifier.as_str() {
                    "Alt" => VK_MENU as i32,
                    "Shift" => VK_SHIFT as i32,
                    _ => VK_CONTROL as i32,
                }
            };
            timer::normalize_finished_timer(&window, &state);
            if !window.is_visible().unwrap_or(false) {
                thread::sleep(Duration::from_millis(30));
                continue;
            }
            let ctrl = unsafe { GetAsyncKeyState(modifier_vk) as u16 & 0x8000 != 0 };
            let menu_open = state.menu_open.lock().unwrap().contains(window.label());
            let ignore = !ctrl && !menu_open;

            if last_ignore != Some(ignore) {
                set_click_through(hwnd, ignore);
                last_ignore = Some(ignore);
            }

            if last_ctrl != Some(ctrl) {
                let _ = window.emit_to(window.label(), "ctrl-state", ctrl);
                last_ctrl = Some(ctrl);
            }

            let mut cursor = POINT { x: 0, y: 0 };
            if unsafe { GetCursorPos(&mut cursor) } != 0 {
                if let (Ok(position), Ok(size)) = (window.outer_position(), window.outer_size()) {
                    if last_position != Some(position) {
                        last_position = Some(position);
                        position_changed_at = Some(Instant::now());
                    }
                    let right = position.x + size.width as i32;
                    let bottom = position.y + size.height as i32;
                    let dx = if cursor.x < position.x {
                        position.x - cursor.x
                    } else if cursor.x > right {
                        cursor.x - right
                    } else {
                        0
                    };
                    let dy = if cursor.y < position.y {
                        position.y - cursor.y
                    } else if cursor.y > bottom {
                        cursor.y - bottom
                    } else {
                        0
                    };
                    let near = dx * dx + dy * dy < 60 * 60;
                    if last_near != Some(near) {
                        let _ = window.emit_to(window.label(), "proximity", near);
                        last_near = Some(near);
                    }
                }
            }

            if position_changed_at
                .is_some_and(|changed_at| changed_at.elapsed() >= Duration::from_millis(400))
            {
                if let Some(position) = last_position {
                    let active = state.active_displays.lock().unwrap();
                    if let Some((id, display)) = active
                        .iter()
                        .find(|(_, display)| display.label == window.label())
                    {
                        let mut config = state.config.lock().unwrap();
                        config.displays.entry(id.clone()).or_default().position =
                            Some(ClockPosition {
                                x: position.x - display.bounds.x,
                                y: position.y - display.bounds.y,
                            });
                        if let Err(error) = save_config(&state, &config) {
                            eprintln!("Unable to save clock position: {error}");
                        }
                    }
                }
                position_changed_at = None;
            }

            thread::sleep(Duration::from_millis(30));
        }
    });
}
