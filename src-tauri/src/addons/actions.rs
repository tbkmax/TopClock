use super::{progress, progress_countdown_options, timer, timer_options, TimerSession};
use crate::{config_store::save_config, state::ClockState, timer::epoch_ms};
use std::sync::Arc;
use tauri::{Emitter, Manager};

pub(crate) enum ActionTarget<'a> {
    Timer,
    Progress(&'a str),
}

pub(crate) fn apply_action(
    app: &tauri::AppHandle,
    target: ActionTarget<'_>,
    action: &str,
) -> Result<TimerSession, String> {
    match target {
        ActionTarget::Timer => apply_timer_action(app, action),
        ActionTarget::Progress(id) => apply_progress_action(app, id, action),
    }
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
    timer::apply_action(
        &mut config.timer_session,
        action,
        epoch_ms(),
        &mode,
        duration,
    )?;
    if let Err(error) = save_config(&state, &config) {
        config.timer_session = before;
        return Err(error);
    }
    let snapshot = config.timer_session.clone();
    drop(config);
    let _ = app.emit("timer-state-changed", &snapshot);
    Ok(snapshot)
}

pub(crate) fn apply_progress_action(
    app: &tauri::AppHandle,
    id: &str,
    action: &str,
) -> Result<TimerSession, String> {
    let state = app.state::<Arc<ClockState>>();
    let mut config = state.config.lock().unwrap();
    let duration = progress_countdown_options(&config.settings.addons)
        .get(id)
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
    if !matches!(action, "toggle" | "reset") {
        return Err("Unknown Progress countdown action".into());
    }
    let before = config.progress_timer_sessions.get(id).cloned();
    let session = config
        .progress_timer_sessions
        .entry(id.to_owned())
        .or_default();
    progress::apply_action(session, action, epoch_ms(), duration)?;
    if let Err(error) = save_config(&state, &config) {
        if let Some(previous) = before {
            config
                .progress_timer_sessions
                .insert(id.to_owned(), previous);
        } else {
            config.progress_timer_sessions.remove(id);
        }
        return Err(error);
    }
    let snapshot = config.progress_timer_sessions[id].clone();
    let all = config.progress_timer_sessions.clone();
    drop(config);
    let _ = app.emit("progress-timer-states-changed", all);
    Ok(snapshot)
}
