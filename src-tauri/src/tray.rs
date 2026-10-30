use crate::{
    displays::save_current_position, locale, settings::ClockSettings, state::ClockState,
    window_commands::show_settings,
};
use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

fn tray_text(language: &str) -> (&'static str, &'static str) {
    match language {
        "zh-Hans" => ("退出", "TopClock · 单击打开设置"),
        "zh-Hant" => ("結束", "TopClock · 點擊開啟設定"),
        "ja" => ("終了", "TopClock · クリックして設定を開く"),
        _ => ("Quit", "TopClock · Click for settings"),
    }
}

fn language_for(settings: &ClockSettings) -> &'static str {
    locale::effective_language(&settings.language, &locale::get_system_locale())
}

pub(crate) fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let state = app.state::<Arc<ClockState>>();
    let config = state.config.lock().unwrap();
    let (quit_label, tooltip) = tray_text(language_for(&config.settings));
    drop(config);
    let quit = MenuItem::with_id(app, "quit", quit_label, true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&quit])?;
    TrayIconBuilder::with_id("topclock")
        .icon(app.default_window_icon().expect("application icon").clone())
        .tooltip(tooltip)
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
    Ok(())
}

pub(crate) fn update_language(
    app: &tauri::AppHandle,
    settings: &ClockSettings,
) -> tauri::Result<()> {
    let Some(tray) = app.tray_by_id("topclock") else {
        return Ok(());
    };
    let (quit_label, tooltip) = tray_text(language_for(settings));
    let quit = MenuItem::with_id(app, "quit", quit_label, true, None::<&str>)?;
    tray.set_menu(Some(Menu::with_items(app, &[&quit])?))?;
    tray.set_tooltip(Some(tooltip))?;
    Ok(())
}
