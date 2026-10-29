#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod addons;
mod display_identity;
mod fonts;
mod hotkeys;
mod settings;

use addons::{timer_options, TimerSession};
use serde::Serialize;
use settings::{valid_settings, ClockPosition, ClockSettings, DisplayPreference, PersistedConfig};
use std::{
    collections::{HashMap, HashSet},
    fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc, Mutex,
    },
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};
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
use winreg::{
    enums::{HKEY_CURRENT_USER, KEY_READ, KEY_WRITE},
    RegKey,
};

struct ClockState {
    menu_open: Mutex<HashSet<String>>,
    config: Mutex<PersistedConfig>,
    settings_path: PathBuf,
    hotkey_errors: Mutex<Vec<String>>,
    active_displays: Mutex<HashMap<String, ActiveDisplay>>,
    main_display_id: Mutex<Option<String>>,
    next_window_id: AtomicUsize,
}

#[derive(Clone, Copy, PartialEq, Serialize)]
struct MonitorBounds {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

#[derive(Clone)]
struct ActiveDisplay {
    label: String,
    bounds: MonitorBounds,
}

#[derive(Clone, PartialEq, Serialize)]
struct DisplayInfo {
    id: String,
    name: String,
    primary: bool,
    enabled: bool,
    bounds: MonitorBounds,
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
fn get_displays(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<ClockState>>,
) -> Result<Vec<DisplayInfo>, String> {
    enumerate_displays(&app, &state)
}

#[tauri::command]
fn set_display_enabled(
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

fn epoch_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
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
fn open_settings_folder(state: tauri::State<'_, Arc<ClockState>>) -> Result<(), String> {
    let folder = state
        .settings_path
        .parent()
        .ok_or("Settings folder is unavailable")?;
    fs::create_dir_all(folder).map_err(|error| error.to_string())?;
    std::process::Command::new("explorer.exe")
        .arg(folder)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
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
fn open_release_page(url: Option<String>) {
    let target = url.unwrap_or_else(|| "https://github.com/tbkmax/TopClock/releases/latest".into());
    if target.starts_with("https://github.com/tbkmax/TopClock") {
        #[cfg(windows)]
        {
            let _ = std::process::Command::new("cmd")
                .args(["/c", "start", "", &target])
                .spawn();
        }
    }
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
        return Err("Invalid settings or add-on configuration".into());
    }
    let mut timer_state_changed = false;
    {
        let mut config = state.config.lock().unwrap();
        let previous_session = config.timer_session.clone();
        let old_timer = timer_options(&config.settings.addons);
        let new_timer = timer_options(&settings.addons);
        if old_timer != new_timer {
            if config.timer_session.running && new_timer.is_some() {
                return Err("Pause the timer before changing its mode or duration".into());
            }
            config.timer_session = TimerSession::default();
            timer_state_changed = true;
        }
        let previous = std::mem::replace(&mut config.settings, settings.clone());
        if let Err(error) = save_config(&state, &config) {
            config.settings = previous;
            config.timer_session = previous_session;
            return Err(error);
        }
    }
    app.emit("clock-settings-changed", &settings)
        .map_err(|error| error.to_string())?;
    if timer_state_changed {
        let _ = app.emit("timer-state-changed", TimerSession::default());
    }
    Ok(settings)
}

#[tauri::command]
fn get_timer_state(state: tauri::State<'_, Arc<ClockState>>) -> TimerSession {
    state.config.lock().unwrap().timer_session.clone()
}

fn apply_timer_action(app: &tauri::AppHandle, action: &str) -> Result<TimerSession, String> {
    let state = app.state::<Arc<ClockState>>();
    let mut config = state.config.lock().unwrap();
    let (mode, duration) =
        timer_options(&config.settings.addons).ok_or("Timer add-on is not enabled")?;
    let mode = mode.to_owned();
    let before = config.timer_session.clone();
    match action {
        "toggle" => config.timer_session.toggle(epoch_ms(), &mode, duration),
        "reset" => config.timer_session = TimerSession::default(),
        _ => return Err("Unknown timer action".into()),
    }
    if let Err(error) = save_config(&state, &config) {
        config.timer_session = before;
        return Err(error);
    }
    let snapshot = config.timer_session.clone();
    drop(config);
    let _ = app.emit("timer-state-changed", &snapshot);
    Ok(snapshot)
}

#[tauri::command]
fn timer_action(app: tauri::AppHandle, action: String) -> Result<TimerSession, String> {
    apply_timer_action(&app, &action)
}

#[tauri::command]
fn get_hotkey_errors(state: tauri::State<'_, Arc<ClockState>>) -> Vec<String> {
    state.hotkey_errors.lock().unwrap().clone()
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
fn set_menu_open(open: bool, window: WebviewWindow, state: tauri::State<'_, Arc<ClockState>>) {
    let mut menus = state.menu_open.lock().unwrap();
    if open {
        menus.insert(window.label().to_string());
    } else {
        menus.remove(window.label());
    }
}

fn save_current_position(app: &tauri::AppHandle) {
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

#[tauri::command]
fn quit(app: tauri::AppHandle) {
    save_current_position(&app);
    app.exit(0);
}

fn set_click_through(hwnd: HWND, ignore: bool) {
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

fn reconcile_displays(
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

fn start_display_manager(app: tauri::AppHandle, state: Arc<ClockState>) {
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

fn start_monitor(window: WebviewWindow, state: Arc<ClockState>) {
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
            if window.label() == "main" {
                let mut config = state.config.lock().unwrap();
                if let Some((mode, duration)) = timer_options(&config.settings.addons) {
                    let mode = mode.to_owned();
                    if config.timer_session.normalize(epoch_ms(), &mode, duration) {
                        if let Err(error) = save_config(&state, &config) {
                            eprintln!("Unable to save completed timer: {error}");
                        }
                        let _ = window
                            .app_handle()
                            .emit("timer-state-changed", &config.timer_session);
                    }
                }
            }
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

fn main() {
    std::env::set_var("WEBVIEW2_DEFAULT_BACKGROUND_COLOR", "0");
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            set_menu_open,
            open_settings,
            open_settings_folder,
            hide_settings,
            minimize_settings,
            open_release_page,
            get_settings,
            fonts::get_font_families,
            update_settings,
            get_timer_state,
            timer_action,
            get_hotkey_errors,
            get_displays,
            set_display_enabled,
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
                .and_then(|data| serde_json::from_slice::<serde_json::Value>(&data).ok())
                .and_then(|raw| {
                    serde_json::from_value::<PersistedConfig>(raw.clone())
                        .ok()
                        .or_else(|| {
                            let mut recovered = raw;
                            let object = recovered.as_object_mut()?;
                            object.remove("addons");
                            object.remove("timer_session");
                            serde_json::from_value::<PersistedConfig>(recovered).ok()
                        })
                })
                .unwrap_or_default();
            if !addons::valid_addons(&config.settings.addons) {
                config.settings.addons.clear();
                config.timer_session = TimerSession::default();
            }
            if !valid_settings(&config.settings) {
                config.settings = ClockSettings::default();
            }
            if config.settings.shortcuts.quit == "Ctrl+Q" {
                config.settings.shortcuts.quit = "Ctrl+Alt+Q".into();
            }
            if config.settings.timer_addon_enabled
                && !config
                    .settings
                    .addons
                    .iter()
                    .any(|addon| addon.kind == "timer")
            {
                config.settings.addons.push(addons::legacy_timer());
            }
            config.settings.timer_addon_enabled = false;
            if config.timer_session.running != config.timer_session.started_at_ms.is_some()
                || (config.timer_session.running && config.timer_session.finished)
            {
                config.timer_session = TimerSession::default();
            }
            if let Some((mode, duration)) = timer_options(&config.settings.addons) {
                let mode = mode.to_owned();
                config.timer_session.normalize(epoch_ms(), &mode, duration);
            } else {
                config.timer_session = TimerSession::default();
            }
            let state = Arc::new(ClockState {
                menu_open: Mutex::new(HashSet::new()),
                config: Mutex::new(config),
                settings_path,
                hotkey_errors: Mutex::new(Vec::new()),
                active_displays: Mutex::new(HashMap::new()),
                main_display_id: Mutex::new(None),
                next_window_id: AtomicUsize::new(1),
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

            let state = app.state::<Arc<ClockState>>().inner().clone();
            let window = app.get_webview_window("main").expect("clock window");
            start_monitor(window, state.clone());
            reconcile_displays(app.handle(), &state).map_err(std::io::Error::other)?;
            start_display_manager(app.handle().clone(), state.clone());
            hotkeys::start_hotkeys(app.handle().clone(), state);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("clock failed to start");
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
