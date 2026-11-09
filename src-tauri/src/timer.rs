use crate::{
    addons::{
        apply_action, apply_progress_preset, progress_countdown_options, timer_options,
        ActionTarget, TimerSession,
    },
    config_store::save_config,
    state::ClockState,
};
use std::{
    collections::HashMap,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{Emitter, Manager, WebviewWindow};

pub(crate) fn epoch_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
#[tauri::command]
pub(crate) fn get_timer_state(state: tauri::State<'_, Arc<ClockState>>) -> TimerSession {
    state.config.lock().unwrap().timer_session.clone()
}

#[tauri::command]
pub(crate) fn get_progress_timer_states(
    state: tauri::State<'_, Arc<ClockState>>,
) -> HashMap<String, TimerSession> {
    state.config.lock().unwrap().progress_timer_sessions.clone()
}

#[tauri::command]
pub(crate) fn progress_timer_action(
    app: tauri::AppHandle,
    id: String,
    action: String,
) -> Result<TimerSession, String> {
    apply_action(&app, ActionTarget::Progress(&id), &action)
}

#[tauri::command]
pub(crate) fn progress_timer_set_preset(
    app: tauri::AppHandle,
    id: String,
    minutes: u16,
    confirmed_reset: bool,
    dont_show_again: bool,
) -> Result<TimerSession, String> {
    apply_progress_preset(&app, &id, minutes, confirmed_reset, dont_show_again)
}

pub(crate) fn apply_timer_action(
    app: &tauri::AppHandle,
    action: &str,
) -> Result<TimerSession, String> {
    apply_action(app, ActionTarget::Timer, action)
}

#[tauri::command]
pub(crate) fn timer_action(app: tauri::AppHandle, action: String) -> Result<TimerSession, String> {
    apply_timer_action(&app, &action)
}
pub(crate) fn normalize_finished_timer(window: &WebviewWindow, state: &Arc<ClockState>) {
    if window.label() != "main" {
        return;
    }
    let mut config = state.config.lock().unwrap();
    if let Some((mode, duration)) = timer_options(&config.settings.addons) {
        let mode = mode.to_owned();
        if config.timer_session.normalize(epoch_ms(), &mode, duration) {
            if let Err(error) = save_config(state, &config) {
                eprintln!("Unable to save completed timer: {error}");
            }
            let _ = window
                .app_handle()
                .emit("timer-state-changed", &config.timer_session);
        }
    }
}

pub(crate) fn normalize_finished_progress_timers(window: &WebviewWindow, state: &Arc<ClockState>) {
    if window.label() != "main" {
        return;
    }
    let mut config = state.config.lock().unwrap();
    let durations = progress_countdown_options(&config.settings.addons);
    let now_ms = epoch_ms();
    let mut changed = false;
    for (id, duration) in durations {
        if let Some(session) = config.progress_timer_sessions.get_mut(&id) {
            changed |= session.normalize(now_ms, "countdown", duration);
        }
    }
    if changed {
        if let Err(error) = save_config(state, &config) {
            eprintln!("Unable to save completed Progress countdown: {error}");
        }
        let _ = window.app_handle().emit(
            "progress-timer-states-changed",
            &config.progress_timer_sessions,
        );
    }
}
