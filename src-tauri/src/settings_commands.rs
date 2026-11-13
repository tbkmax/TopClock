use crate::{
    addons::{
        reconcile_counter_settings, reconcile_progress_settings, reconcile_timer_settings,
        TimerSession,
    },
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
    let timer_state_changed;
    let progress_state_changed;
    let counter_state_changed;
    let language_changed;
    {
        let mut config = state.config.lock().unwrap();
        let previous_session = config.timer_session.clone();
        let previous_progress_sessions = config.progress_timer_sessions.clone();
        let previous_counter_session = config.counter_session.clone();
        let mut next_timer_session = previous_session.clone();
        let mut next_progress_sessions = previous_progress_sessions.clone();
        let mut next_counter_session = previous_counter_session.clone();
        progress_state_changed = reconcile_progress_settings(
            &config.settings.addons,
            &settings.addons,
            &mut next_progress_sessions,
        )?;
        timer_state_changed = reconcile_timer_settings(
            &config.settings.addons,
            &settings.addons,
            &mut next_timer_session,
        )?;
        counter_state_changed = reconcile_counter_settings(
            &settings.addons,
            &mut next_counter_session,
            crate::timer::epoch_ms(),
        );
        config.timer_session = next_timer_session;
        config.progress_timer_sessions = next_progress_sessions;
        config.counter_session = next_counter_session;
        let previous = std::mem::replace(&mut config.settings, settings.clone());
        language_changed = previous.language != settings.language;
        if let Err(error) = save_config(&state, &config) {
            config.settings = previous;
            config.timer_session = previous_session;
            config.progress_timer_sessions = previous_progress_sessions;
            config.counter_session = previous_counter_session;
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
    if counter_state_changed {
        let session = state.config.lock().unwrap().counter_session.clone();
        let _ = app.emit("counter-state-changed", session);
    }
    Ok(settings)
}
#[tauri::command]
pub(crate) fn get_hotkey_errors(state: tauri::State<'_, Arc<ClockState>>) -> Vec<String> {
    state.hotkey_errors.lock().unwrap().clone()
}
