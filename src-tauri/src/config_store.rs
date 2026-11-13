use crate::{
    addons::{self, progress_countdown_options, timer_options, CounterSession, TimerSession},
    settings::{valid_settings, ClockSettings, PersistedConfig},
    state::ClockState,
    timer::epoch_ms,
};
use std::{fs, path::Path};

pub(crate) fn save_config(state: &ClockState, config: &PersistedConfig) -> Result<(), String> {
    let data = serde_json::to_vec_pretty(config).map_err(|error| error.to_string())?;
    if let Some(parent) = state.settings_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(&state.settings_path, data).map_err(|error| error.to_string())
}

pub(crate) fn load_config(settings_path: &Path) -> PersistedConfig {
    if !settings_path.exists() {
        if let Some(app_data) = settings_path.parent().and_then(|p| p.parent()) {
            let legacy_path = app_data.join("com.maxtc.topclock").join("settings.json");
            if legacy_path.exists() {
                if let Some(parent) = settings_path.parent() {
                    let _ = fs::create_dir_all(parent);
                }
                let _ = fs::copy(&legacy_path, &settings_path);
            }
        }
    }
    let mut config = fs::read(&settings_path)
        .ok()
        .and_then(|data| serde_json::from_slice::<serde_json::Value>(&data).ok())
        .and_then(|raw| {
            serde_json::from_value::<PersistedConfig>(raw.clone())
                .ok()
                .or_else(|| {
                    let mut recovered = raw.clone();
                    recovered.as_object_mut()?.remove("counter_session");
                    serde_json::from_value::<PersistedConfig>(recovered).ok()
                })
                .or_else(|| {
                    let mut recovered = raw.clone();
                    recovered.as_object_mut()?.remove("progress_timer_sessions");
                    recovered.as_object_mut()?.remove("counter_session");
                    serde_json::from_value::<PersistedConfig>(recovered).ok()
                })
                .or_else(|| {
                    let mut recovered = raw;
                    let object = recovered.as_object_mut()?;
                    object.remove("addons");
                    object.remove("timer_session");
                    object.remove("progress_timer_sessions");
                    object.remove("counter_session");
                    serde_json::from_value::<PersistedConfig>(recovered).ok()
                })
        })
        .unwrap_or_default();
    if !addons::valid_addons(&config.settings.addons) {
        config.settings.addons.clear();
        config.settings.addon_pairs.clear();
        config.timer_session = TimerSession::default();
        config.progress_timer_sessions.clear();
    }
    // A downgraded build can edit the flat instances without knowing about pairs.
    // Keep those instances and dissolve only links that no longer describe a pair.
    config
        .settings
        .addon_pairs
        .retain(|pair| addons::valid_pairs(&config.settings.addons, std::slice::from_ref(pair)));
    let mut retained = Vec::new();
    for pair in config.settings.addon_pairs.drain(..) {
        retained.push(pair);
        if !addons::valid_pairs(&config.settings.addons, &retained) {
            retained.pop();
        }
    }
    config.settings.addon_pairs = retained;
    if !valid_settings(&config.settings) {
        config.settings = ClockSettings::default();
    }
    if config.settings.shortcuts.quit == "Ctrl+Q" {
        config.settings.shortcuts.quit = "Ctrl+Alt+Q".into();
    }
    if config.settings.timer_addon_enabled
        && !config
            .settings
            .addons
            .iter()
            .any(|addon| addon.kind == "timer")
    {
        config.settings.addons.push(addons::legacy_timer());
    }
    config.settings.timer_addon_enabled = false;
    if config.timer_session.running != config.timer_session.started_at_ms.is_some()
        || (config.timer_session.running && config.timer_session.finished)
    {
        config.timer_session = TimerSession::default();
    }
    if let Some((mode, duration)) = timer_options(&config.settings.addons) {
        let mode = mode.to_owned();
        config.timer_session.normalize(epoch_ms(), &mode, duration);
    } else {
        config.timer_session = TimerSession::default();
    }
    let countdowns = progress_countdown_options(&config.settings.addons);
    let now_ms = epoch_ms();
    config.progress_timer_sessions.retain(|id, session| {
        if !countdowns.contains_key(id)
            || session.running != session.started_at_ms.is_some()
            || (session.running && session.finished)
        {
            return false;
        }
        session.normalize(now_ms, "countdown", countdowns[id]);
        // Older persisted sessions predate the explicit edit lock.
        session.restore_progress_started();
        true
    });
    if !config.counter_session.valid() {
        config.counter_session = CounterSession::default();
    } else if config.counter_session.running {
        // A previous process did not complete its normal quit path. Keep the
        // saved checkpoint, but never count time while TopClock was closed.
        config.counter_session.running = false;
        config.counter_session.started_at_ms = None;
    }
    config
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn loading_without_counter_addon_retains_saved_balance() {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!("topclock-counter-{nonce}.json"));
        let mut config = PersistedConfig::default();
        config.counter_session.value_ms = 60_000;
        config.counter_session.direction = 1;
        config.counter_session.running = true;
        config.counter_session.started_at_ms = Some(1_000);
        fs::write(&path, serde_json::to_vec(&config).unwrap()).unwrap();

        let loaded = load_config(&path);
        let _ = fs::remove_file(&path);
        assert!(loaded.settings.addons.is_empty());
        assert_eq!(loaded.counter_session.value_ms, 60_000);
        assert!(!loaded.counter_session.running);
        assert_eq!(loaded.counter_session.started_at_ms, None);
    }
}
