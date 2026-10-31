use crate::{
    addons::{progress_countdown_options, timer_options, TimerSession},
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
    let state = app.state::<Arc<ClockState>>();
    let mut config = state.config.lock().unwrap();
    let duration = progress_countdown_options(&config.settings.addons)
        .get(&id)
        .copied()
        .ok_or("Progress countdown is unavailable")?;
    if !config
        .settings
        .addons
        .iter()
        .any(|addon| addon.id == id && addon.enabled)
    {
        return Err("Progress countdown is disabled".into());
    }
    if !matches!(action.as_str(), "toggle" | "reset") {
        return Err("Unknown Progress countdown action".into());
    }
    let before = config.progress_timer_sessions.get(&id).cloned();
    let session = config
        .progress_timer_sessions
        .entry(id.clone())
        .or_default();
    match action.as_str() {
        "toggle" => session.toggle(epoch_ms(), "countdown", duration),
        "reset" => *session = TimerSession::default(),
        _ => unreachable!(),
    }
    if let Err(error) = save_config(&state, &config) {
        if let Some(previous) = before {
            config.progress_timer_sessions.insert(id, previous);
        } else {
            config.progress_timer_sessions.remove(&id);
        }
        return Err(error);
    }
    let snapshot = config.progress_timer_sessions[&id].clone();
    let all = config.progress_timer_sessions.clone();
    drop(config);
    let _ = app.emit("progress-timer-states-changed", all);
    Ok(snapshot)
}

pub(crate) fn apply_timer_action(
    app: &tauri::AppHandle,
    action: &str,
) -> Result<TimerSession, String> {
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
