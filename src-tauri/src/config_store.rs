use crate::{
    addons::{self, progress_countdown_options, timer_options, TimerSession},
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
                    recovered.as_object_mut()?.remove("progress_timer_sessions");
                    serde_json::from_value::<PersistedConfig>(recovered).ok()
                })
                .or_else(|| {
                    let mut recovered = raw;
                    let object = recovered.as_object_mut()?;
                    object.remove("addons");
                    object.remove("timer_session");
                    object.remove("progress_timer_sessions");
                    serde_json::from_value::<PersistedConfig>(recovered).ok()
                })
        })
        .unwrap_or_default();
    if !addons::valid_addons(&config.settings.addons) {
        config.settings.addons.clear();
        config.timer_session = TimerSession::default();
        config.progress_timer_sessions.clear();
    }
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
        true
    });
    config
}
