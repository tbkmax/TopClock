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
    save_settings_change(&app, &state, |_| Ok(settings))
}

#[tauri::command]
pub(crate) fn set_addon_enabled(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<ClockState>>,
    id: String,
    enabled: bool,
) -> Result<ClockSettings, String> {
    save_settings_change(&app, &state, |current| {
        settings_with_addon_enabled(current, &id, enabled)
    })
}

fn settings_with_addon_enabled(
    current: &ClockSettings,
    id: &str,
    enabled: bool,
) -> Result<ClockSettings, String> {
    let mut next = current.clone();
    let target = next
        .addons
        .iter_mut()
        .find(|addon| addon.id == id)
        .ok_or("Add-on is no longer available")?;
    target.enabled = enabled;
    if let Some(pair) = next
        .addon_pairs
        .iter()
        .find(|pair| pair.left_id == id || pair.right_id == id)
    {
        let other_id = if pair.left_id == id {
            &pair.right_id
        } else {
            &pair.left_id
        };
        let other = next
            .addons
            .iter_mut()
            .find(|addon| addon.id == *other_id)
            .ok_or("Paired add-on is no longer available")?;
        other.enabled = enabled;
    }
    Ok(next)
}

// Both whole-settings edits and targeted menu switches share validation,
// session reconciliation, durable rollback, and event publication.
fn save_settings_change(
    app: &tauri::AppHandle,
    state: &Arc<ClockState>,
    change: impl FnOnce(&ClockSettings) -> Result<ClockSettings, String>,
) -> Result<ClockSettings, String> {
    let timer_state_changed;
    let progress_state_changed;
    let counter_state_changed;
    let language_changed;
    let settings;
    {
        let mut config = state.config.lock().unwrap();
        settings = change(&config.settings)?;
        if !valid_settings(&settings) {
            return Err("Invalid settings or add-on configuration".into());
        }
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::addons::{legacy_timer, AddonPair};

    #[test]
    fn menu_switch_targets_one_instance_or_its_pair() {
        let mut settings = ClockSettings::default();
        let mut date = legacy_timer();
        date.id = "date".into();
        date.kind = "date".into();
        date.options = serde_json::json!({"format":"ymd"});
        let mut timer = legacy_timer();
        timer.id = "timer".into();
        let mut progress = legacy_timer();
        progress.id = "progress".into();
        progress.kind = "progress".into();
        settings.addons = vec![date, timer, progress];
        settings.addon_pairs = vec![AddonPair {
            left_id: "date".into(),
            right_id: "timer".into(),
            size_percent: 100,
        }];

        let disabled = settings_with_addon_enabled(&settings, "timer", false).unwrap();
        assert_eq!(
            disabled
                .addons
                .iter()
                .map(|addon| addon.enabled)
                .collect::<Vec<_>>(),
            vec![false, false, true]
        );
        assert!(settings.addons.iter().all(|addon| addon.enabled));

        let progress_off = settings_with_addon_enabled(&settings, "progress", false).unwrap();
        assert_eq!(
            progress_off
                .addons
                .iter()
                .map(|addon| addon.enabled)
                .collect::<Vec<_>>(),
            vec![true, true, false]
        );
        assert!(settings_with_addon_enabled(&settings, "missing", false).is_err());
    }
}
