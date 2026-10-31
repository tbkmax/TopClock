mod addons;
mod config_store;
mod display_identity;
mod displays;
mod fonts;
mod hotkeys;
mod interaction;
mod locale;
mod settings;
mod settings_commands;
mod startup;
mod state;
mod store_updates;
mod timer;
mod tray;
mod webview_runtime;
mod window_commands;

use state::ClockState;
use std::sync::Arc;
use tauri::Manager;

pub fn run() {
    webview_runtime::ensure_available();
    std::env::set_var("WEBVIEW2_DEFAULT_BACKGROUND_COLOR", "0");
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            window_commands::set_menu_open,
            window_commands::open_settings,
            window_commands::open_settings_folder,
            window_commands::hide_settings,
            window_commands::minimize_settings,
            window_commands::open_release_page,
            settings_commands::get_settings,
            locale::get_system_locale,
            fonts::get_font_families,
            settings_commands::update_settings,
            timer::get_timer_state,
            timer::timer_action,
            timer::get_progress_timer_states,
            timer::progress_timer_action,
            settings_commands::get_hotkey_errors,
            displays::get_displays,
            displays::reset_clock_positions,
            displays::set_display_enabled,
            startup::get_startup_enabled,
            startup::set_startup_enabled,
            startup::is_packaged,
            store_updates::check_store_updates,
            store_updates::install_store_update,
            window_commands::quit
        ])
        .setup(|app| {
            let settings_path = app.path().app_config_dir()?.join("settings.json");
            let config = config_store::load_config(&settings_path);
            let state = Arc::new(ClockState::new(config, settings_path));
            config_store::save_config(&state, &state.config.lock().unwrap())
                .map_err(std::io::Error::other)?;
            app.manage(state);

            // Create webviews only after their commands can read the managed settings.
            for window_config in &app.config().app.windows {
                tauri::WebviewWindowBuilder::from_config(app.handle(), window_config)?.build()?;
            }

            tray::setup_tray(app)?;

            let state = app.state::<Arc<ClockState>>().inner().clone();
            let window = app.get_webview_window("main").expect("clock window");
            interaction::start_monitor(window, state.clone());
            displays::reconcile_displays(app.handle(), &state).map_err(std::io::Error::other)?;
            displays::start_display_manager(app.handle().clone(), state.clone());
            hotkeys::start_hotkeys(app.handle().clone(), state);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("clock failed to start");
}
