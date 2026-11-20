use crate::{
    addons::counter_db::{epoch_ms, tick_ms, CounterDatabase},
    addons::{reconcile_progress_settings, reconcile_timer_settings, TimerSession},
    config::store::save_config,
    config::{model::ClockSettings, validation::valid_settings},
    state::ClockState,
};
use std::sync::Arc;
use tauri::Emitter;
use uuid::Uuid;

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
    let counter_snapshot;
    let language_changed;
    let settings;
    {
        let mut config = state.config.lock().unwrap();
        settings = change(&config.settings)?;
        if !valid_settings(&settings) {
            return Err("Invalid settings or add-on configuration".into());
        }
        let previous = config.clone();
        let mut next_timer_session = previous.timer_session.clone();
        let mut next_progress_sessions = previous.progress_timer_sessions.clone();
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
        let now_epoch = epoch_ms();
        let now_tick = tick_ms();
        let mut counter_db = state.counter_db.lock().unwrap();
        let should_stop_counter = settings
            .addons
            .iter()
            .any(|addon| addon.kind == "counter" && !addon.enabled)
            && counter_db.snapshot(now_epoch, now_tick)?.running;
        config.settings = settings.clone();
        config.timer_session = next_timer_session;
        config.progress_timer_sessions = next_progress_sessions;
        language_changed = previous.settings.language != settings.language;
        let mut json_saved = false;
        let saved = (|| -> Result<(), String> {
            if should_stop_counter {
                let elapsed = counter_db.elapsed(now_tick);
                let tx = counter_db.transaction()?;
                CounterDatabase::stage(
                    &tx,
                    "stop",
                    now_epoch,
                    elapsed,
                    true,
                    Some("disabled"),
                    &Uuid::new_v4().to_string(),
                )?;
                save_config(&state.settings_path, &config)?;
                json_saved = true;
                tx.commit()
                    .map_err(|error| format!("Counter database commit: {error}"))?;
            } else {
                save_config(&state.settings_path, &config)?;
            }
            Ok(())
        })();
        if let Err(error) = saved {
            *config = previous;
            if json_saved {
                if let Err(restore_error) = save_config(&state.settings_path, &config) {
                    *config = crate::config::store::load_config(&state.settings_path);
                    return Err(format!("{error}; settings restore failed: {restore_error}"));
                }
            }
            return Err(error);
        }
        if should_stop_counter {
            counter_db.committed(None, now_tick);
            counter_snapshot = Some(counter_db.snapshot(now_epoch, now_tick)?);
        } else {
            counter_snapshot = None;
        }
    }
    if language_changed {
        if let Err(error) = crate::windows::tray::update_language(&app, &settings) {
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
    if let Some(session) = counter_snapshot {
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
    fn menu_switch_targets_only_one_instance() {
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
            vec![true, false, true]
        );
        assert!(crate::addons::valid_pairs(
            &disabled.addons,
            &disabled.addon_pairs
        ));
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
