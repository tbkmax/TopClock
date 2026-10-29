use crate::{
    addons::{timer_options, TimerSession},
    config_store::save_config,
    settings::{valid_settings, ClockSettings},
    state::ClockState,
};
use std::sync::Arc;
use tauri::Emitter;

#[tauri::command]
pub(crate) fn get_settings(state: tauri::State<'_, Arc<ClockState>>) -> ClockSettings {
    state.config.lock().unwrap().settings.clone()
}

#[tauri::command]
pub(crate) fn update_settings(
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
pub(crate) fn get_hotkey_errors(state: tauri::State<'_, Arc<ClockState>>) -> Vec<String> {
    state.hotkey_errors.lock().unwrap().clone()
}
