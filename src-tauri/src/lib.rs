mod addons;
mod config;
mod displays;
mod input;
mod platform;
mod state;
mod windows;
use state::ClockState;
use std::sync::Arc;
use tauri::Manager;

pub fn run() {
    platform::webview_runtime::ensure_available();
    std::env::set_var("WEBVIEW2_DEFAULT_BACKGROUND_COLOR", "0");
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            windows::menu_window::open_clock_menu,
            windows::menu_window::open_palette_confirmation,
            input::palette::show_palette_error,
            input::palette::toggle_palette_settings,
            windows::menu_window::get_clock_menu_request,
            windows::menu_window::show_clock_menu,
            windows::menu_window::close_clock_menu,
            windows::window_commands::open_settings,
            windows::window_commands::open_settings_folder,
            windows::window_commands::hide_settings,
            windows::window_commands::minimize_settings,
            windows::window_commands::open_release_page,
            config::commands::get_settings,
            platform::locale::get_system_locale,
            platform::fonts::get_font_families,
            config::commands::update_settings,
            config::commands::set_addon_enabled,
            addons::runtime::get_timer_state,
            addons::runtime::timer_action,
            addons::runtime::timer_set_mode,
            addons::runtime::timer_set_preset,
            addons::runtime::get_progress_timer_states,
            addons::runtime::progress_timer_action,
            addons::runtime::progress_timer_set_preset,
            addons::counter::counter_action,
            addons::counter::get_counter_state,
            addons::counter::get_counter_history,
            config::commands::get_hotkey_errors,
            displays::positions::get_displays,
            displays::positions::reset_clock_positions,
            displays::positions::set_display_enabled,
            platform::startup::get_startup_enabled,
            platform::startup::set_startup_enabled,
            platform::startup::is_packaged,
            platform::store_updates::check_store_updates,
            platform::store_updates::install_store_update,
            windows::window_commands::quit
        ])
        .setup(|app| {
            let settings_path = app.path().app_config_dir()?.join("settings.json");
            let config = config::store::load_config(&settings_path);
            let counter_disabled = config
                .settings
                .addons
                .iter()
                .any(|addon| addon.kind == "counter" && !addon.enabled);
            let counter_db = addons::counter_db::CounterDatabase::open(
                &settings_path.with_file_name("topclock.db"),
                &config.legacy_counter_session,
                counter_disabled,
            )
            .map_err(std::io::Error::other)?;
            let state = Arc::new(ClockState::new(config, settings_path, counter_db));
            if let Err(error) =
                config::store::save_config(&state.settings_path, &state.config.lock().unwrap())
            {
                eprintln!("Unable to persist startup settings: {error}");
            }
            app.manage(state);

            // Create webviews only after their commands can read the managed settings.
            for window_config in &app.config().app.windows {
                tauri::WebviewWindowBuilder::from_config(app.handle(), window_config)?.build()?;
            }

            windows::tray::setup_tray(app)?;

            let state = app.state::<Arc<ClockState>>().inner().clone();
            let window = app.get_webview_window("main").expect("clock window");
            input::interaction::start_monitor(window, state.clone());
            displays::reconcile_displays(app.handle(), &state).map_err(std::io::Error::other)?;
            displays::start_display_manager(app.handle().clone(), state.clone());
            input::hotkeys::start_hotkeys(app.handle().clone(), state);
            input::palette::start_palette(
                app.handle().clone(),
                app.state::<Arc<ClockState>>().inner().clone(),
            );
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("clock failed to start")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                if let Err(error) = addons::stop_on_quit(app) {
                    eprintln!("Unable to save Counter before exiting: {error}");
                    api.prevent_exit();
                }
            }
        });
}
