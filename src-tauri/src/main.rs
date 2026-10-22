#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::Duration,
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WebviewWindow,
};
use windows_sys::Win32::{
    Foundation::POINT,
    UI::{
        Input::KeyboardAndMouse::{GetAsyncKeyState, VK_CONTROL},
        WindowsAndMessaging::GetCursorPos,
    },
};
use winreg::{
    enums::{HKEY_CURRENT_USER, KEY_READ, KEY_WRITE},
    RegKey,
};

struct ClockState {
    menu_open: AtomicBool,
    settings: Mutex<ClockSettings>,
    settings_path: PathBuf,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(default)]
struct ClockSettings {
    blink: bool,
    font_color: String,
    outline_color: String,
    font_size: u8,
    twenty_four_hour: bool,
}

impl Default for ClockSettings {
    fn default() -> Self {
        Self {
            blink: true,
            font_color: "#ffffff".into(),
            outline_color: "#000000".into(),
            font_size: 42,
            twenty_four_hour: true,
        }
    }
}

fn valid_color(value: &str) -> bool {
    value.len() == 7
        && value.starts_with('#')
        && value[1..].bytes().all(|byte| byte.is_ascii_hexdigit())
}

fn show_settings(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn open_settings(app: tauri::AppHandle) {
    show_settings(&app);
}

#[tauri::command]
fn hide_settings(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("settings")
        .ok_or("Settings window is unavailable")?
        .hide()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn minimize_settings(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("settings")
        .ok_or("Settings window is unavailable")?
        .minimize()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn get_settings(state: tauri::State<'_, Arc<ClockState>>) -> ClockSettings {
    state.settings.lock().unwrap().clone()
}

#[tauri::command]
fn update_settings(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<ClockState>>,
    settings: ClockSettings,
) -> Result<ClockSettings, String> {
    if !valid_color(&settings.font_color)
        || !valid_color(&settings.outline_color)
        || !(24..=60).contains(&settings.font_size)
    {
        return Err("Invalid clock appearance settings".into());
    }
    let data = serde_json::to_vec_pretty(&settings).map_err(|error| error.to_string())?;
    if let Some(parent) = state.settings_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(&state.settings_path, data).map_err(|error| error.to_string())?;
    *state.settings.lock().unwrap() = settings.clone();
    app.emit("clock-settings-changed", &settings)
        .map_err(|error| error.to_string())?;
    Ok(settings)
}

const STARTUP_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
const STARTUP_NAME: &str = "OnTopClock";

#[tauri::command]
fn get_startup_enabled() -> bool {
    RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey_with_flags(STARTUP_KEY, KEY_READ)
        .and_then(|key| key.get_value::<String, _>(STARTUP_NAME))
        .is_ok()
}

#[tauri::command]
fn set_startup_enabled(enabled: bool) -> Result<(), String> {
    let key = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey_with_flags(STARTUP_KEY, KEY_READ | KEY_WRITE)
        .map_err(|error| error.to_string())?;
    if enabled {
        let executable = std::env::current_exe().map_err(|error| error.to_string())?;
        key.set_value(STARTUP_NAME, &format!("\"{}\"", executable.display()))
            .map_err(|error| error.to_string())
    } else {
        match key.delete_value(STARTUP_NAME) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(error) => Err(error.to_string()),
        }
    }
}

#[tauri::command]
fn set_menu_open(open: bool, state: tauri::State<'_, Arc<ClockState>>) {
    state.menu_open.store(open, Ordering::Relaxed);
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
        .invoke_handler(tauri::generate_handler![
            set_menu_open,
            open_settings,
            hide_settings,
            minimize_settings,
            get_settings,
            update_settings,
            get_startup_enabled,
            set_startup_enabled,
            quit
        ])
        .setup(|app| {
            let settings_path = app.path().app_config_dir()?.join("settings.json");
            let settings = fs::read(&settings_path)
                .ok()
                .and_then(|data| serde_json::from_slice::<ClockSettings>(&data).ok())
                .unwrap_or_default();
            app.manage(Arc::new(ClockState {
                menu_open: AtomicBool::new(false),
                settings: Mutex::new(settings),
                settings_path,
            }));

            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit])?;
            TrayIconBuilder::new()
                .icon(app.default_window_icon().expect("application icon").clone())
                .tooltip("On-Top Clock · Click for settings")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    if event.id().as_ref() == "quit" {
                        app.exit(0);
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_settings(tray.app_handle());
                    }
                })
                .build(app)?;

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

            window.show()?;
            start_monitor(window, app.state::<Arc<ClockState>>().inner().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("clock failed to start");
}
