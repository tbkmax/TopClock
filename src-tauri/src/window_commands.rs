use crate::{displays::save_current_position, startup, state::ClockState};
use std::{fs, sync::Arc};
use tauri::{Manager, WebviewWindow};

pub(crate) fn show_settings(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[tauri::command]
pub(crate) fn open_settings(app: tauri::AppHandle) {
    show_settings(&app);
}

#[tauri::command]
pub(crate) fn open_settings_folder(state: tauri::State<'_, Arc<ClockState>>) -> Result<(), String> {
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
pub(crate) fn hide_settings(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("settings")
        .ok_or("Settings window is unavailable")?
        .hide()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) fn minimize_settings(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("settings")
        .ok_or("Settings window is unavailable")?
        .minimize()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) fn open_release_page(url: Option<String>) {
    if startup::is_packaged() != Ok(false) {
        return;
    }
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
pub(crate) fn set_menu_open(
    open: bool,
    window: WebviewWindow,
    state: tauri::State<'_, Arc<ClockState>>,
) {
    let mut menus = state.menu_open.lock().unwrap();
    if open {
        menus.insert(window.label().to_string());
    } else {
        menus.remove(window.label());
    }
}
#[tauri::command]
pub(crate) fn quit(app: tauri::AppHandle) {
    save_current_position(&app);
    app.exit(0);
}
