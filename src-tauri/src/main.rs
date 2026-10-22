#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    thread,
    time::Duration,
};
use tauri::{Emitter, Manager, WebviewWindow};
use windows_sys::Win32::{
    Foundation::POINT,
    UI::{
        Input::KeyboardAndMouse::{GetAsyncKeyState, VK_CONTROL},
        WindowsAndMessaging::GetCursorPos,
    },
};

struct ClockState {
    menu_open: AtomicBool,
}

#[tauri::command]
fn set_menu_open(open: bool, state: tauri::State<'_, Arc<ClockState>>) {
    state.menu_open.store(open, Ordering::Relaxed);
}

#[tauri::command]
fn frontend_ready(window: WebviewWindow) -> Result<(), String> {
    window.show().map_err(|error| error.to_string())
}

#[tauri::command]
fn quit(app: tauri::AppHandle) {
    app.exit(0);
}

fn start_monitor(window: WebviewWindow, state: Arc<ClockState>) {
    thread::spawn(move || {
        let mut last_ctrl = None;
        let mut last_near = None;
        let mut last_ignore = Some(true);

        loop {
            let ctrl = unsafe { GetAsyncKeyState(VK_CONTROL as i32) as u16 & 0x8000 != 0 };
            let menu_open = state.menu_open.load(Ordering::Relaxed);
            let ignore = !ctrl && !menu_open;

            if last_ignore != Some(ignore) {
                if let Err(error) = window.set_ignore_cursor_events(ignore) {
                    eprintln!("Unable to change click-through mode: {error}");
                } else {
                    last_ignore = Some(ignore);
                }
            }

            if last_ctrl != Some(ctrl) {
                let _ = window.emit("ctrl-state", ctrl);
                last_ctrl = Some(ctrl);
            }

            let mut cursor = POINT { x: 0, y: 0 };
            if unsafe { GetCursorPos(&mut cursor) } != 0 {
                if let (Ok(position), Ok(size)) = (window.outer_position(), window.outer_size()) {
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
                        let _ = window.emit("proximity", near);
                        last_near = Some(near);
                    }
                }
            }

            thread::sleep(Duration::from_millis(30));
        }
    });
}

fn main() {
    tauri::Builder::default()
        .manage(Arc::new(ClockState {
            menu_open: AtomicBool::new(false),
        }))
        .invoke_handler(tauri::generate_handler![
            set_menu_open,
            frontend_ready,
            quit
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").expect("clock window");
            window.set_ignore_cursor_events(true)?;

            if let Some(monitor) = window.primary_monitor()? {
                let bounds = monitor.size();
                let origin = monitor.position();
                let size = window.outer_size()?;
                let x = origin.x + bounds.width as i32 - size.width as i32 - 24;
                let y = origin.y + 24;
                window.set_position(tauri::PhysicalPosition::new(x, y))?;
            }

            start_monitor(window, app.state::<Arc<ClockState>>().inner().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("clock failed to start");
}
