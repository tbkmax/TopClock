use crate::{
    config_store::save_config, settings::ClockPosition, state::ClockState, timer, topmost,
};
use std::{
    sync::Arc,
    thread,
    time::{Duration, Instant},
};
use tauri::{Emitter, Manager, WebviewWindow};
use windows_sys::Win32::{
    Foundation::{HWND, POINT},
    UI::{
        Input::KeyboardAndMouse::{
            GetAsyncKeyState, VK_CONTROL, VK_LBUTTON, VK_MBUTTON, VK_MENU, VK_RBUTTON, VK_SHIFT,
            VK_XBUTTON1, VK_XBUTTON2,
        },
        WindowsAndMessaging::{
            GetCursorPos, GetForegroundWindow, GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos,
            GWL_EXSTYLE, SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER,
            WS_EX_LAYERED, WS_EX_TRANSPARENT,
        },
    },
};

#[derive(Default)]
struct MenuDismissal {
    buttons: u8,
    was_open: bool,
    foreground: isize,
}

impl MenuDismissal {
    fn update(
        &mut self,
        open: bool,
        buttons: u8,
        outside: bool,
        foreground: isize,
        clock: isize,
    ) -> bool {
        let pressed = buttons & !self.buttons != 0;
        let focus_left = self.was_open
            && foreground != 0
            && foreground != self.foreground
            && foreground != clock;
        self.buttons = buttons;
        self.was_open = open;
        self.foreground = foreground;
        open && ((pressed && outside) || focus_left)
    }
}

fn mouse_buttons() -> u8 {
    [VK_LBUTTON, VK_RBUTTON, VK_MBUTTON, VK_XBUTTON1, VK_XBUTTON2]
        .iter()
        .enumerate()
        .fold(0, |mask, (index, key)| {
            // Only the high bit is reliable; the low "pressed since" bit is shared
            // with other processes and must not be used as an event queue.
            mask | ((unsafe { GetAsyncKeyState(*key as i32) } < 0) as u8) << index
        })
}

fn outside_window(
    cursor: POINT,
    position: tauri::PhysicalPosition<i32>,
    size: tauri::PhysicalSize<u32>,
) -> bool {
    let x = i64::from(cursor.x) - i64::from(position.x);
    let y = i64::from(cursor.y) - i64::from(position.y);
    x < 0 || y < 0 || x >= i64::from(size.width) || y >= i64::from(size.height)
}

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
        let mut last_topmost_refresh: Option<Instant> = None;
        let mut menu_dismissal = MenuDismissal::default();

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
            timer::normalize_finished_progress_timers(&window, &state);
            if !window.is_visible().unwrap_or(false) {
                menu_dismissal.update(false, mouse_buttons(), false, 0, hwnd_raw);
                last_topmost_refresh = None;
                thread::sleep(Duration::from_millis(30));
                continue;
            }
            if last_topmost_refresh.is_none_or(|last| last.elapsed() >= topmost::REFRESH_INTERVAL) {
                // Refresh even if WS_EX_TOPMOST is still set: another topmost
                // window can be above us within the same Z-order band.
                last_topmost_refresh = Some(Instant::now());
                if let Err(error) = topmost::schedule_refresh(&window) {
                    eprintln!("Unable to schedule clock topmost recovery: {error}");
                }
            }
            let ctrl = unsafe { GetAsyncKeyState(modifier_vk) as u16 & 0x8000 != 0 };
            let menu_open = state.menu_open.lock().unwrap().contains(window.label());
            let buttons = mouse_buttons();
            let foreground = unsafe { GetForegroundWindow() } as isize;
            let mut cursor = POINT { x: 0, y: 0 };
            let cursor_valid = unsafe { GetCursorPos(&mut cursor) } != 0;
            let geometry = window.outer_position().ok().zip(window.outer_size().ok());
            let outside = cursor_valid
                && geometry.is_some_and(|(position, size)| outside_window(cursor, position, size));
            if menu_open && buttons & !menu_dismissal.buttons != 0 && cursor_valid && !outside {
                if let (Some((position, _)), Ok(scale)) = (geometry, window.scale_factor()) {
                    // Transparent padding can pass through without a DOM event.
                    // Let the frontend hit-test the actual menu, not the whole HWND.
                    let point = (
                        (f64::from(cursor.x) - f64::from(position.x)) / scale,
                        (f64::from(cursor.y) - f64::from(position.y)) / scale,
                    );
                    let _ = window.emit_to(window.label(), "menu-pointer-down", point);
                }
            }
            if menu_dismissal.update(menu_open, buttons, outside, foreground, hwnd_raw) {
                // Request dismissal only for this clock. The frontend closes the menu
                // and acknowledges through set_menu_open, preserving state ordering.
                // Observation does not capture or swallow the other app's click.
                let _ = window.emit_to(window.label(), "dismiss-menu", ());
            }
            let ignore = !ctrl && !menu_open;

            if last_ignore != Some(ignore) {
                set_click_through(hwnd, ignore);
                last_ignore = Some(ignore);
            }

            if last_ctrl != Some(ctrl) {
                let _ = window.emit_to(window.label(), "ctrl-state", ctrl);
                last_ctrl = Some(ctrl);
            }

            if cursor_valid {
                if let Some((position, size)) = geometry {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn menu_dismissal_observes_new_outside_presses_without_replaying_held_buttons() {
        let mut monitor = MenuDismissal::default();
        assert!(!monitor.update(false, 2, false, 10, 10)); // Opening right press.
        assert!(!monitor.update(true, 2, true, 10, 10)); // Held while moving outside.
        assert!(!monitor.update(true, 0, true, 10, 10)); // Release is not a click.
        assert!(monitor.update(true, 1, true, 10, 10));
        assert!(!monitor.update(true, 1, true, 10, 10)); // No repeated dismissal.
        assert!(monitor.update(true, 3, true, 10, 10)); // Right while left held.
        assert!(!monitor.update(false, 0, true, 20, 10));
        assert!(!monitor.update(true, 0, false, 10, 10)); // Reopen.
        assert!(!monitor.update(true, 1, false, 10, 10)); // Menu item press.
        for button in [2, 4, 8, 16] {
            monitor.update(true, 0, true, 10, 10);
            assert!(monitor.update(true, button, true, 10, 10));
        }
    }

    #[test]
    fn menu_dismissal_handles_focus_changes_without_requiring_initial_focus() {
        let mut monitor = MenuDismissal::default();
        assert!(!monitor.update(true, 0, false, 20, 10));
        assert!(!monitor.update(true, 0, false, 20, 10));
        assert!(!monitor.update(true, 0, false, 10, 10)); // Clock gains focus.
        assert!(monitor.update(true, 0, false, 20, 10)); // Alt-tab or short click.
        assert!(!monitor.update(false, 0, false, 30, 10));
        assert!(!monitor.update(true, 0, false, 30, 10));
        assert!(!monitor.update(true, 0, false, 0, 10)); // Transient null foreground.
    }

    #[test]
    fn outside_hit_test_uses_physical_bounds_on_negative_origin_displays() {
        let position = tauri::PhysicalPosition::new(-1920, -200);
        let size = tauri::PhysicalSize::new(300, 150);
        assert!(!outside_window(POINT { x: -1920, y: -200 }, position, size));
        assert!(!outside_window(POINT { x: -1621, y: -51 }, position, size));
        for cursor in [
            POINT { x: -1921, y: -100 },
            POINT { x: -1620, y: -100 },
            POINT { x: -1800, y: -201 },
            POINT { x: -1800, y: -50 },
        ] {
            assert!(outside_window(cursor, position, size));
        }
    }
}
