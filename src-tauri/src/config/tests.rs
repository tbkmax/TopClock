use super::model::*;
use super::validation::valid_settings;
use crate::addons::{CounterSession, TimerSession};
use std::collections::HashMap;

#[test]
fn counter_halo_preference_is_shared_and_legacy_safe() {
    let mut settings = ClockSettings::default();
    let mut counter = crate::addons::legacy_timer();
    counter.kind = "counter".into();
    counter.options = serde_json::json!({});
    settings.addons.push(counter);
    assert_eq!(settings.counter_halo_intensity_percent, 50);
    assert!(valid_settings(&settings));
    settings.counter_halo_intensity_percent = 0;
    assert!(valid_settings(&settings));
    settings.counter_halo_intensity_percent = 100;
    assert!(valid_settings(&settings));
    settings.counter_halo_intensity_percent = 75;
    let restored: ClockSettings =
        serde_json::from_value(serde_json::to_value(&settings).unwrap()).unwrap();
    assert_eq!(restored.counter_halo_intensity_percent, 75);
    assert_eq!(restored.addons[0].options, serde_json::json!({}));
    settings.counter_halo_intensity_percent = 101;
    assert!(!valid_settings(&settings));

    let mut saved = serde_json::to_value(ClockSettings::default()).unwrap();
    saved
        .as_object_mut()
        .unwrap()
        .remove("counter_halo_intensity_percent");
    let old: ClockSettings = serde_json::from_value(saved).unwrap();
    assert_eq!(old.counter_halo_intensity_percent, 50);
}

#[test]
fn settings_and_position_round_trip_together() {
    let mut settings = ClockSettings::default();
    settings.outline_width = 3.5;
    settings.font_family = "Times New Roman".into();
    settings.twenty_four_hour = false;
    settings.show_ampm = false;
    settings.time_layout = "ms".into();
    settings.colon_animation = "none".into();
    settings.number_animation = "slide".into();
    let config = PersistedConfig {
        settings,
        position: Some(ClockPosition { x: -120, y: 240 }),
        displays: HashMap::new(),
        timer_session: TimerSession::default(),
        progress_timer_sessions: HashMap::new(),
        counter_session: CounterSession::default(),
    };
    let loaded: PersistedConfig =
        serde_json::from_str(&serde_json::to_string(&config).unwrap()).unwrap();
    let position = loaded.position.unwrap();
    assert_eq!((position.x, position.y), (-120, 240));
    assert_eq!(loaded.settings.outline_width, 3.5);
    assert_eq!(loaded.settings.font_family, "Times New Roman");
    assert_eq!(loaded.settings.time_layout, "ms");
    assert_eq!(loaded.settings.colon_animation, "none");
    assert_eq!(loaded.settings.number_animation, "slide");
    assert_eq!(loaded.settings.shortcuts.interaction_modifier, "Ctrl");
    assert_eq!(loaded.settings.shortcuts.quit, "Ctrl+Alt+Q");
    assert_eq!(loaded.settings.language, "system");
    assert!(!loaded.settings.shortcuts.quit_enabled);
    assert_eq!(loaded.settings.shortcuts.open_settings, "Ctrl+,");
    assert!(loaded.settings.auto_check_updates);
    assert!(valid_settings(&loaded.settings));
}

#[test]
fn palette_defaults_off_and_rejects_interaction_key_collision() {
    let mut settings = ClockSettings::default();
    assert!(!settings.palette_enabled);
    assert_eq!(settings.shortcuts.palette_key, "Alt");
    settings.palette_enabled = true;
    assert!(valid_settings(&settings));
    settings.shortcuts.interaction_modifier = "Alt".into();
    assert!(!valid_settings(&settings));
    settings.palette_enabled = false;
    assert!(valid_settings(&settings));
    settings.shortcuts.palette_key.clear();
    settings.palette_enabled = true;
    assert!(!valid_settings(&settings));
}

#[test]
fn malformed_pair_metadata_does_not_discard_existing_addons() {
    let mut settings = ClockSettings::default();
    settings.addons.push(crate::addons::legacy_timer());
    let mut raw = serde_json::to_value(&settings).unwrap();
    raw["addon_pairs"] = serde_json::json!([{"left_id":"timer"}]);
    let restored: ClockSettings = serde_json::from_value(raw).unwrap();
    assert_eq!(restored.addons.len(), 1);
    assert!(restored.addon_pairs.is_empty());
    assert!(valid_settings(&restored));
}

#[test]
fn progress_sessions_round_trip_separately_from_numeric_timer() {
    let mut config = PersistedConfig::default();
    config.timer_session.toggle(1_000, "countdown", 30);
    let mut progress = TimerSession::default();
    progress.toggle(2_000, "countdown", 10);
    config
        .progress_timer_sessions
        .insert("progress-a".into(), progress);
    let raw = serde_json::to_value(&config).unwrap();
    let loaded: PersistedConfig = serde_json::from_value(raw.clone()).unwrap();
    assert_eq!(loaded.timer_session.elapsed(5_000), 4_000);
    assert_eq!(
        loaded.progress_timer_sessions["progress-a"].elapsed(5_000),
        3_000
    );
    let mut legacy = raw;
    legacy
        .as_object_mut()
        .unwrap()
        .remove("progress_timer_sessions");
    let loaded_legacy: PersistedConfig = serde_json::from_value(legacy).unwrap();
    assert!(loaded_legacy.progress_timer_sessions.is_empty());
}

#[test]
fn missing_language_uses_system_default_and_invalid_language_is_rejected() {
    let mut raw = serde_json::to_value(ClockSettings::default()).unwrap();
    raw.as_object_mut().unwrap().remove("language");
    let restored: ClockSettings = serde_json::from_value(raw).unwrap();
    assert_eq!(restored.language, "system");
    let mut invalid = restored;
    invalid.language = "unsupported".into();
    assert!(!valid_settings(&invalid));
}

#[test]
fn display_positions_and_visibility_are_independent() {
    let mut config = PersistedConfig::default();
    config.displays.insert(
        "monitor-a".into(),
        DisplayPreference {
            visible: true,
            position: Some(ClockPosition { x: 20, y: 30 }),
        },
    );
    config.displays.insert(
        "monitor-b".into(),
        DisplayPreference {
            visible: false,
            position: Some(ClockPosition { x: 80, y: 90 }),
        },
    );
    let loaded: PersistedConfig =
        serde_json::from_str(&serde_json::to_string(&config).unwrap()).unwrap();
    assert_eq!(loaded.displays["monitor-a"].position.unwrap().x, 20);
    assert_eq!(loaded.displays["monitor-b"].position.unwrap().y, 90);
    assert!(loaded.displays["monitor-a"].visible);
    assert!(!loaded.displays["monitor-b"].visible);
    assert!(DisplayPreference::default().visible);
}

#[test]
fn shortcut_settings_round_trip_and_validation() {
    let mut settings = ClockSettings::default();
    settings.shortcuts.interaction_modifier = "Alt".into();
    settings.shortcuts.quit = "".into(); // Allowed (no shortcut)
    settings.shortcuts.open_settings = "Ctrl+Shift+P".into();
    assert!(valid_settings(&settings));

    settings.shortcuts.interaction_modifier = "InvalidKey".into();
    assert!(!valid_settings(&settings));
    settings.shortcuts.interaction_modifier = "Shift".into();
    assert!(valid_settings(&settings));

    settings.shortcuts.quit =
        "VeryLongShortcutKeyStringThatExceedsTheMaximumAllowedCharactersLimit".into();
    assert!(!valid_settings(&settings));
}

#[test]
fn legacy_timer_flag_is_read_but_not_written() {
    let mut raw = serde_json::to_value(ClockSettings::default()).unwrap();
    raw["timer_addon_enabled"] = serde_json::Value::Bool(true);
    let restored: ClockSettings = serde_json::from_value(raw).unwrap();
    assert!(restored.timer_addon_enabled);
    assert!(serde_json::to_value(restored)
        .unwrap()
        .get("timer_addon_enabled")
        .is_none());
}

#[test]
fn rejects_invalid_new_settings() {
    let mut settings = ClockSettings::default();
    settings.font_size = 200;
    assert!(valid_settings(&settings));
    settings.font_size = 201;
    assert!(!valid_settings(&settings));
    settings.font_size = 42;
    settings.outline_width = f32::NAN;
    assert!(!valid_settings(&settings));
    settings.outline_width = 1.5;
    settings.font_family = "Arial\ncolor:red".into();
    assert!(!valid_settings(&settings));
    settings.font_family = "Segoe UI".into();
    settings.time_layout = "invalid".into();
    assert!(!valid_settings(&settings));
    settings.time_layout = "hms".into();
    settings.colon_animation = "invalid".into();
    assert!(!valid_settings(&settings));
    settings.colon_animation = "pulse".into();
    settings.number_animation = "invalid".into();
    assert!(!valid_settings(&settings));
}

#[test]
fn countdown_presets_default_for_legacy_settings_and_reject_invalid_lists() {
    let mut raw = serde_json::to_value(ClockSettings::default()).unwrap();
    raw.as_object_mut()
        .unwrap()
        .remove("timer_countdown_presets");
    raw.as_object_mut()
        .unwrap()
        .remove("timer_preset_warning_dismissed");
    raw.as_object_mut()
        .unwrap()
        .remove("progress_countdown_presets");
    raw.as_object_mut()
        .unwrap()
        .remove("progress_preset_warning_dismissed");
    let mut settings: ClockSettings = serde_json::from_value(raw).unwrap();
    assert_eq!(settings.timer_countdown_presets, vec![10, 30, 60]);
    assert!(!settings.timer_preset_warning_dismissed);
    settings.timer_countdown_presets = vec![5, 15];
    assert!(valid_settings(&settings));
    settings.timer_countdown_presets = vec![15, 5];
    assert!(!valid_settings(&settings));
    settings.timer_countdown_presets = vec![10, 10];
    assert!(!valid_settings(&settings));
    settings.timer_countdown_presets = vec![10, 30, 60];
    assert_eq!(settings.progress_countdown_presets, vec![10, 30, 60]);
    assert!(!settings.progress_preset_warning_dismissed);
    settings.progress_countdown_presets.clear();
    assert!(valid_settings(&settings));
    settings.progress_countdown_presets = vec![10, 10];
    assert!(!valid_settings(&settings));
    settings.progress_countdown_presets = vec![60, 30];
    assert!(!valid_settings(&settings));
    settings.progress_countdown_presets = vec![1, 5999];
    assert!(valid_settings(&settings));
    settings.progress_countdown_presets.push(6000);
    assert!(!valid_settings(&settings));
    settings.progress_countdown_presets = (1..=9).collect();
    assert!(!valid_settings(&settings));
}
