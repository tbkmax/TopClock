use super::{progress, progress_countdown_options, timer, timer_options, TimerSession};
use crate::{
    config_store::save_config, settings::PersistedConfig, state::ClockState, timer::epoch_ms,
};
use std::sync::Arc;
use tauri::{Emitter, Manager};

pub(crate) enum ActionTarget<'a> {
    Timer,
    Progress(&'a str),
}

#[derive(Clone, Copy)]
pub(crate) enum TimerMenuChange<'a> {
    Mode(&'a str),
    Preset(u16),
}

pub(crate) fn apply_timer_menu_change(
    app: &tauri::AppHandle,
    change: TimerMenuChange<'_>,
    confirmed_reset: bool,
    dont_show_again: bool,
) -> Result<TimerSession, String> {
    let state = app.state::<Arc<ClockState>>();
    let mut config = state.config.lock().unwrap();
    let previous_settings = config.settings.clone();
    let previous_session = config.timer_session.clone();
    let session = update_timer_menu_change(
        &mut config,
        change,
        confirmed_reset,
        dont_show_again,
        epoch_ms(),
    )?;
    if let Err(error) = save_config(&state, &config) {
        config.settings = previous_settings;
        config.timer_session = previous_session;
        return Err(error);
    }
    let settings = config.settings.clone();
    drop(config);
    let _ = app.emit("clock-settings-changed", settings);
    let _ = app.emit("timer-state-changed", &session);
    Ok(session)
}

fn update_timer_menu_change(
    config: &mut PersistedConfig,
    change: TimerMenuChange<'_>,
    confirmed_reset: bool,
    dont_show_again: bool,
    now_ms: u64,
) -> Result<TimerSession, String> {
    let index = config
        .settings
        .addons
        .iter()
        .position(|addon| addon.kind == "timer" && addon.enabled)
        .ok_or("Timer add-on is not enabled")?;
    let warning_dismissed = match change {
        TimerMenuChange::Mode(mode) => {
            if !matches!(mode, "countdown" | "stopwatch") {
                return Err("Unknown timer mode".into());
            }
            if config.settings.addons[index].options["mode"] == mode {
                return Err("Timer mode is already selected".into());
            }
            config.settings.timer_reset_warning_dismissed
        }
        TimerMenuChange::Preset(minutes) => {
            if config.settings.addons[index].options["mode"] != "countdown" {
                return Err("Timer countdown is unavailable".into());
            }
            if !config.settings.timer_countdown_presets.contains(&minutes) {
                return Err("Timer preset is unavailable".into());
            }
            config.settings.timer_preset_warning_dismissed
        }
    };
    if (config.timer_session.running || config.timer_session.elapsed(now_ms) > 0)
        && !confirmed_reset
        && !warning_dismissed
    {
        return Err("Timer reset requires confirmation".into());
    }
    config.timer_session = TimerSession::default();
    match change {
        TimerMenuChange::Mode(mode) => {
            config.settings.addons[index].options["mode"] = serde_json::json!(mode);
            if dont_show_again && confirmed_reset {
                config.settings.timer_reset_warning_dismissed = true;
            }
        }
        TimerMenuChange::Preset(minutes) => {
            let seconds = u64::from(minutes) * 60;
            config.settings.addons[index].options["duration_seconds"] = serde_json::json!(seconds);
            config.timer_session.toggle(now_ms, "countdown", seconds);
            if dont_show_again && confirmed_reset {
                config.settings.timer_preset_warning_dismissed = true;
            }
        }
    }
    Ok(config.timer_session.clone())
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

pub(crate) fn apply_progress_preset(
    app: &tauri::AppHandle,
    id: &str,
    minutes: u16,
    confirmed_reset: bool,
    dont_show_again: bool,
) -> Result<TimerSession, String> {
    let state = app.state::<Arc<ClockState>>();
    let mut config = state.config.lock().unwrap();
    let previous_settings = config.settings.clone();
    let previous_session = config.progress_timer_sessions.get(id).cloned();
    let session = update_progress_preset(
        &mut config,
        id,
        minutes,
        confirmed_reset,
        dont_show_again,
        epoch_ms(),
    )?;
    if let Err(error) = save_config(&state, &config) {
        config.settings = previous_settings;
        if let Some(previous) = previous_session {
            config
                .progress_timer_sessions
                .insert(id.to_owned(), previous);
        } else {
            config.progress_timer_sessions.remove(id);
        }
        return Err(error);
    }
    let settings = config.settings.clone();
    let sessions = config.progress_timer_sessions.clone();
    drop(config);
    let _ = app.emit("clock-settings-changed", settings);
    let _ = app.emit("progress-timer-states-changed", sessions);
    Ok(session)
}

fn update_progress_preset(
    config: &mut PersistedConfig,
    id: &str,
    minutes: u16,
    confirmed_reset: bool,
    dont_show_again: bool,
    now_ms: u64,
) -> Result<TimerSession, String> {
    if !config
        .settings
        .progress_countdown_presets
        .contains(&minutes)
    {
        return Err("Progress preset is unavailable".into());
    }
    let addon_index = config
        .settings
        .addons
        .iter()
        .position(|addon| {
            addon.id == id
                && addon.kind == "progress"
                && addon.enabled
                && addon
                    .options
                    .get("mode")
                    .and_then(serde_json::Value::as_str)
                    == Some("countdown")
        })
        .ok_or("Progress countdown is unavailable")?;
    let current = config
        .progress_timer_sessions
        .get(id)
        .cloned()
        .unwrap_or_default();
    if (current.running || current.elapsed(now_ms) > 0)
        && !confirmed_reset
        && !config.settings.progress_preset_warning_dismissed
    {
        return Err("Progress preset reset requires confirmation".into());
    }
    config.settings.addons[addon_index].options["countdown_seconds"] =
        serde_json::json!(u64::from(minutes) * 60);
    let mut session = TimerSession::default();
    session.toggle_progress(now_ms, u64::from(minutes) * 60);
    config
        .progress_timer_sessions
        .insert(id.to_owned(), session.clone());
    if dont_show_again && confirmed_reset {
        config.settings.progress_preset_warning_dismissed = true;
    }
    Ok(session)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::addons::legacy_timer;

    #[test]
    fn timer_menu_changes_confirm_and_keep_progress_independent() {
        let mut config = PersistedConfig::default();
        config.settings.addons.push(legacy_timer());
        config.timer_session = TimerSession {
            running: true,
            elapsed_ms: 0,
            started_at_ms: Some(1_000),
            finished: false,
            has_started: true,
        };
        assert!(update_timer_menu_change(
            &mut config,
            TimerMenuChange::Mode("stopwatch"),
            false,
            false,
            5_000
        )
        .is_err());
        assert_eq!(config.settings.addons[0].options["mode"], "countdown");
        let session = update_timer_menu_change(
            &mut config,
            TimerMenuChange::Mode("stopwatch"),
            true,
            true,
            5_000,
        )
        .unwrap();
        assert!(!session.running);
        assert_eq!(session.elapsed_ms, 0);
        assert!(config.settings.timer_reset_warning_dismissed);
        assert!(update_timer_menu_change(
            &mut config,
            TimerMenuChange::Preset(10),
            true,
            false,
            5_000
        )
        .is_err());
        update_timer_menu_change(
            &mut config,
            TimerMenuChange::Mode("countdown"),
            false,
            false,
            5_000,
        )
        .unwrap();
        assert!(update_timer_menu_change(
            &mut config,
            TimerMenuChange::Preset(99),
            true,
            false,
            5_000
        )
        .is_err());
        let session = update_timer_menu_change(
            &mut config,
            TimerMenuChange::Preset(10),
            false,
            false,
            5_000,
        )
        .unwrap();
        assert!(session.running);
        assert_eq!(config.settings.addons[0].options["duration_seconds"], 600);
        assert_eq!(config.settings.progress_countdown_presets, vec![10, 30, 60]);
        assert!(update_timer_menu_change(
            &mut config,
            TimerMenuChange::Preset(30),
            false,
            false,
            6_000
        )
        .is_err());
        assert_eq!(config.settings.addons[0].options["duration_seconds"], 600);
        let session =
            update_timer_menu_change(&mut config, TimerMenuChange::Preset(30), true, true, 6_000)
                .unwrap();
        assert!(session.running);
        assert_eq!(config.settings.addons[0].options["duration_seconds"], 1800);
        assert!(config.settings.timer_preset_warning_dismissed);
        assert!(config.settings.timer_reset_warning_dismissed);
    }

    #[test]
    fn preset_restart_targets_one_countdown_and_requires_confirmation() {
        let mut config = PersistedConfig::default();
        let mut first = legacy_timer();
        first.id = "progress-one".into();
        first.kind = "progress".into();
        first.options = serde_json::json!({"mode":"countdown","countdown_seconds":300});
        let mut second = first.clone();
        second.id = "progress-two".into();
        config.settings.addons = vec![first, second];
        config.progress_timer_sessions.insert(
            "progress-one".into(),
            TimerSession {
                running: false,
                elapsed_ms: 2_000,
                started_at_ms: None,
                finished: false,
                has_started: true,
            },
        );
        config.progress_timer_sessions.insert(
            "progress-two".into(),
            TimerSession {
                running: true,
                elapsed_ms: 0,
                started_at_ms: Some(1_000),
                finished: false,
                has_started: true,
            },
        );
        assert!(
            update_progress_preset(&mut config, "progress-one", 10, false, false, 5_000).is_err()
        );
        assert_eq!(config.settings.addons[0].options["countdown_seconds"], 300);
        assert!(
            update_progress_preset(&mut config, "progress-one", 99, true, false, 5_000).is_err()
        );
        let session =
            update_progress_preset(&mut config, "progress-one", 10, true, true, 5_000).unwrap();
        assert!(session.running);
        assert_eq!(session.elapsed(5_000), 0);
        assert_eq!(config.settings.addons[0].options["countdown_seconds"], 600);
        assert_eq!(config.settings.addons[1].options["countdown_seconds"], 300);
        assert_eq!(
            config.progress_timer_sessions["progress-two"].started_at_ms,
            Some(1_000)
        );
        assert!(config.settings.progress_preset_warning_dismissed);
    }
}
