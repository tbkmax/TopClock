use crate::{
    addons::{progress_countdown_options, timer_options, TimerSession},
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
    let mut progress_state_changed = false;
    let language_changed;
    {
        let mut config = state.config.lock().unwrap();
        let previous_session = config.timer_session.clone();
        let previous_progress_sessions = config.progress_timer_sessions.clone();
        let old_timer = timer_options(&config.settings.addons);
        let new_timer = timer_options(&settings.addons);
        let old_progress = progress_countdown_options(&config.settings.addons);
        let new_progress = progress_countdown_options(&settings.addons);
        if old_progress.iter().any(|(id, duration)| {
            new_progress.get(id) != Some(duration)
                && new_progress.contains_key(id)
                && config
                    .progress_timer_sessions
                    .get(id)
                    .is_some_and(|session| session.running)
        }) {
            return Err("Pause the Progress countdown before changing its duration".into());
        }
        if old_timer != new_timer {
            if config.timer_session.running && new_timer.is_some() {
                return Err("Pause the timer before changing its mode or duration".into());
            }
            config.timer_session = TimerSession::default();
            timer_state_changed = true;
        }
        for (id, duration) in old_progress {
            if new_progress.get(&id) != Some(&duration) {
                progress_state_changed |= config.progress_timer_sessions.remove(&id).is_some();
            }
        }
        let previous = std::mem::replace(&mut config.settings, settings.clone());
        language_changed = previous.language != settings.language;
        if let Err(error) = save_config(&state, &config) {
            config.settings = previous;
            config.timer_session = previous_session;
            config.progress_timer_sessions = previous_progress_sessions;
            return Err(error);
        }
    }
    if language_changed {
        if let Err(error) = crate::tray::update_language(&app, &settings) {
            eprintln!("Could not update tray language: {error}");
        }
    }
    app.emit("clock-settings-changed", &settings)
        .map_err(|error| error.to_string())?;
    if timer_state_changed {
        let _ = app.emit("timer-state-changed", TimerSession::default());
    }
    if progress_state_changed {
        let sessions = state.config.lock().unwrap().progress_timer_sessions.clone();
        let _ = app.emit("progress-timer-states-changed", sessions);
    }
    Ok(settings)
}
#[tauri::command]
pub(crate) fn get_hotkey_errors(state: tauri::State<'_, Arc<ClockState>>) -> Vec<String> {
    state.hotkey_errors.lock().unwrap().clone()
}
