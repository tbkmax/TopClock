#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod fonts;
mod settings;

use settings::{valid_settings, ClockPosition, ClockSettings, PersistedConfig};
use std::{
    fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::{Duration, Instant},
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
    config: Mutex<PersistedConfig>,
    settings_path: PathBuf,
}

fn save_config(state: &ClockState, config: &PersistedConfig) -> Result<(), String> {
    let data = serde_json::to_vec_pretty(config).map_err(|error| error.to_string())?;
    if let Some(parent) = state.settings_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(&state.settings_path, data).map_err(|error| error.to_string())
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
    state.config.lock().unwrap().settings.clone()
}

#[tauri::command]
fn update_settings(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<ClockState>>,
    settings: ClockSettings,
) -> Result<ClockSettings, String> {
    if !valid_settings(&settings) {
        return Err("Invalid clock appearance settings".into());
    }
    {
        let mut config = state.config.lock().unwrap();
        let previous = std::mem::replace(&mut config.settings, settings.clone());
        if let Err(error) = save_config(&state, &config) {
            config.settings = previous;
            return Err(error);
        }
    }
    app.emit("clock-settings-changed", &settings)
        .map_err(|error| error.to_string())?;
    Ok(settings)
}

const STARTUP_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
const STARTUP_NAME: &str = "TopClock";

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

fn save_current_position(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(position) = window.outer_position() {
            let state = app.state::<Arc<ClockState>>();
            let mut config = state.config.lock().unwrap();
            config.position = Some(ClockPosition {
                x: position.x,
                y: position.y,
            });
            if let Err(error) = save_config(&state, &config) {
                eprintln!("Unable to save clock position: {error}");
            }
        }
    }
}

#[tauri::command]
fn quit(app: tauri::AppHandle) {
    save_current_position(&app);
    app.exit(0);
}

fn start_monitor(window: WebviewWindow, state: Arc<ClockState>) {
    thread::spawn(move || {
        let mut last_ctrl = None;
        let mut last_near = None;
        let mut last_ignore = Some(true);
        let mut last_position = window.outer_position().ok();
        let mut position_changed_at = None;

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
                        let _ = window.emit("proximity", near);
                        last_near = Some(near);
                    }
                }
            }

            if position_changed_at
                .is_some_and(|changed_at| changed_at.elapsed() >= Duration::from_millis(400))
            {
                if let Some(position) = last_position {
                    let mut config = state.config.lock().unwrap();
                    config.position = Some(ClockPosition {
                        x: position.x,
                        y: position.y,
                    });
                    if let Err(error) = save_config(&state, &config) {
                        eprintln!("Unable to save clock position: {error}");
                    }
                }
                position_changed_at = None;
            }

            thread::sleep(Duration::from_millis(30));
        }
    });
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            set_menu_open,
            open_settings,
            hide_settings,
            minimize_settings,
            get_settings,
            fonts::get_font_families,
            update_settings,
            get_startup_enabled,
            set_startup_enabled,
            quit
        ])
        .setup(|app| {
            let settings_path = app.path().app_config_dir()?.join("settings.json");
            if !settings_path.exists() {
                if let Some(app_data) = settings_path.parent().and_then(|p| p.parent()) {
                    let legacy_path = app_data.join("com.maxtc.topclock").join("settings.json");
                    if legacy_path.exists() {
                        if let Some(parent) = settings_path.parent() {
                            let _ = fs::create_dir_all(parent);
                        }
                        let _ = fs::copy(&legacy_path, &settings_path);
                    }
                }
            }
            let mut config = fs::read(&settings_path)
                .ok()
                .and_then(|data| serde_json::from_slice::<PersistedConfig>(&data).ok())
                .unwrap_or_default();
            if !valid_settings(&config.settings) {
                config.settings = ClockSettings::default();
            }
            let state = Arc::new(ClockState {
                menu_open: AtomicBool::new(false),
                config: Mutex::new(config),
                settings_path,
            });
            save_config(&state, &state.config.lock().unwrap()).map_err(std::io::Error::other)?;
            app.manage(state);

            // Create webviews only after their commands can read the managed settings.
            for window_config in &app.config().app.windows {
                tauri::WebviewWindowBuilder::from_config(app.handle(), window_config)?.build()?;
            }

            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit])?;
            TrayIconBuilder::new()
                .icon(app.default_window_icon().expect("application icon").clone())
                .tooltip("TopClock · Click for settings")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    if event.id().as_ref() == "quit" {
                        save_current_position(app);
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

            let saved_position = app
                .state::<Arc<ClockState>>()
                .config
                .lock()
                .unwrap()
                .position;
            let window_size = window.outer_size()?;
            let position_is_visible = |position: ClockPosition| {
                window
                    .available_monitors()
                    .map(|monitors| {
                        monitors.iter().any(|monitor| {
                            let origin = monitor.position();
                            let bounds = monitor.size();
                            position.x < origin.x + bounds.width as i32
                                && position.x + window_size.width as i32 > origin.x
                                && position.y < origin.y + bounds.height as i32
                                && position.y + window_size.height as i32 > origin.y
                        })
                    })
                    .unwrap_or(false)
            };
            if let Some(position) = saved_position.filter(|position| position_is_visible(*position))
            {
                window.set_position(tauri::PhysicalPosition::new(position.x, position.y))?;
            } else if let Some(monitor) = window.primary_monitor()? {
                let bounds = monitor.size();
                let origin = monitor.position();
                let x = origin.x + bounds.width as i32 - window_size.width as i32 - 24;
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
