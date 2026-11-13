mod actions;
pub(crate) mod counter;
mod date;
mod instance;
mod progress;
mod region_clock;
mod registry;
mod session;
mod timer;

pub(crate) use actions::{
    apply_action, apply_progress_preset, apply_timer_menu_change, ActionTarget, TimerMenuChange,
};
pub(crate) use counter::reconcile_settings as reconcile_counter_settings;
pub(crate) use counter::{stop_on_quit, CounterSession};
pub(crate) use instance::{valid_addons, valid_pairs, AddonInstance, AddonPair};
pub(crate) use progress::progress_countdown_options;
pub(crate) use progress::reconcile_settings as reconcile_progress_settings;
pub(crate) use session::TimerSession;
pub(crate) use timer::reconcile_settings as reconcile_timer_settings;
pub(crate) use timer::{legacy_timer, timer_options};

#[cfg(test)]
use std::collections::HashMap;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_addon_instances() {
        let mut addons = vec![legacy_timer()];
        assert!(valid_addons(&addons));
        addons[0].size_percent = 10;
        assert!(valid_addons(&addons));
        addons[0].size_percent = 9;
        assert!(!valid_addons(&addons));
        addons[0].size_percent = 30;
        addons.push(addons[0].clone());
        assert!(!valid_addons(&addons));
        addons.pop();
        addons[0].options = serde_json::json!({"mode":"countdown","duration_seconds":0});
        assert!(!valid_addons(&addons));
    }

    #[test]
    fn validates_pairs_without_changing_flat_instances() {
        let left = legacy_timer();
        let mut right = left.clone();
        right.id = "date-1".into();
        right.kind = "date".into();
        right.options = serde_json::json!({"format":"md"});
        let addons = vec![left, right];
        let pair = AddonPair {
            left_id: "timer".into(),
            right_id: "date-1".into(),
            size_percent: 100,
        };
        assert!(valid_pairs(&addons, &[pair.clone()]));
        assert!(!valid_pairs(&addons, &[pair.clone(), pair.clone()]));
        let mut wrong = pair.clone();
        wrong.size_percent = 0;
        assert!(!valid_pairs(&addons, &[wrong]));
        let mut separated = addons.clone();
        separated[1].placement = "above".into();
        assert!(!valid_pairs(&separated, &[pair.clone()]));
        separated[1].placement = "below".into();
        separated[1].enabled = false;
        assert!(!valid_pairs(&separated, &[pair]));
    }

    #[test]
    fn counter_pairs_with_other_eligible_kinds() {
        let mut counter = legacy_timer();
        counter.id = "counter".into();
        counter.kind = "counter".into();
        counter.options = serde_json::json!({});
        for (kind, options) in [
            ("date", serde_json::json!({"format":"md"})),
            ("region_clock", serde_json::json!({"time_zone":"Etc/UTC"})),
            (
                "timer",
                serde_json::json!({"mode":"countdown","duration_seconds":300}),
            ),
        ] {
            let mut other = legacy_timer();
            other.id = kind.into();
            other.kind = kind.into();
            other.options = options;
            for addons in [
                vec![counter.clone(), other.clone()],
                vec![other.clone(), counter.clone()],
            ] {
                let pair = AddonPair {
                    left_id: addons[0].id.clone(),
                    right_id: addons[1].id.clone(),
                    size_percent: 100,
                };
                assert!(valid_addons(&addons));
                assert!(valid_pairs(&addons, &[pair]));
            }
        }
        let mut progress = counter.clone();
        progress.id = "progress".into();
        progress.kind = "progress".into();
        assert!(!valid_pairs(
            &[counter, progress],
            &[AddonPair {
                left_id: "counter".into(),
                right_id: "progress".into(),
                size_percent: 100,
            }]
        ));
    }

    #[test]
    fn optional_display_options_accept_legacy_and_boolean_values() {
        for (kind, key, options) in [
            ("date", "show_weekday", serde_json::json!({"format":"md"})),
            (
                "region_clock",
                "show_label",
                serde_json::json!({"time_zone":"Etc/UTC"}),
            ),
        ] {
            let mut addon = legacy_timer();
            addon.kind = kind.into();
            addon.options = options;
            assert!(valid_addons(&[addon.clone()]));
            addon.options[key] = serde_json::json!(false);
            assert!(valid_addons(&[addon.clone()]));
            addon.options[key] = serde_json::json!(true);
            assert!(valid_addons(&[addon.clone()]));
            addon.options[key] = serde_json::json!("yes");
            assert!(!valid_addons(&[addon]));
        }
    }

    #[test]
    fn validates_repeatable_progress_and_rejects_invalid_boundaries() {
        let mut first = legacy_timer();
        first.id = "progress-one".into();
        first.kind = "progress".into();
        first.options = serde_json::json!({
            "mode":"time", "start_date":"2026-10-30", "end_date":"2026-11-01",
            "ranges":[{"start":"09:00","end":"10:00"},{"start":"10:00","end":"11:00"}],
            "auto_hide":true
        });
        let mut second = first.clone();
        second.id = "progress-two".into();
        second.options["mode"] = serde_json::json!("date");
        assert!(valid_addons(&[first.clone(), second]));
        first.options["ranges"][0]["days"] = serde_json::json!(["mon", "wed"]);
        assert!(valid_addons(&[first.clone()]));
        for invalid_days in [
            serde_json::json!(["mon", "mon"]),
            serde_json::json!(["monday"]),
            serde_json::json!([1]),
            serde_json::json!("mon"),
        ] {
            first.options["ranges"][0]["days"] = invalid_days;
            assert!(!valid_addons(&[first.clone()]));
        }
        first.options["ranges"][0]["days"] = serde_json::json!([]);
        assert!(valid_addons(&[first.clone()]));
        first.options["ranges"][0]
            .as_object_mut()
            .unwrap()
            .remove("days");
        first.options["ranges"][1]["start"] = serde_json::json!("09:30");
        assert!(!valid_addons(&[first.clone()]));
        first.options["ranges"][0]["days"] = serde_json::json!(["mon"]);
        first.options["ranges"][1]["days"] = serde_json::json!(["wed"]);
        assert!(valid_addons(&[first.clone()]));
        first.options["ranges"][1]["days"] = serde_json::json!(["mon", "wed"]);
        assert!(!valid_addons(&[first.clone()]));
        first.options["ranges"][0]
            .as_object_mut()
            .unwrap()
            .remove("days");
        first.options["ranges"][1]
            .as_object_mut()
            .unwrap()
            .remove("days");
        first.options["ranges"][1]["start"] = serde_json::json!("10:00");
        first.options["end_date"] = serde_json::json!("2026-02-30");
        assert!(!valid_addons(&[first.clone()]));
        first.options["end_date"] = serde_json::json!("2026-11-01");
        first.options["auto_hide"] = serde_json::json!("yes");
        assert!(!valid_addons(&[first]));
    }

    #[test]
    fn progress_appearance_accepts_legacy_defaults_and_validates_new_fields() {
        let mut addon = legacy_timer();
        addon.kind = "progress".into();
        addon.options = serde_json::json!({
            "mode":"date", "start_date":"2026-10-30", "end_date":"2026-10-31",
            "ranges":[{"start":"09:00","end":"17:00"}], "auto_hide":false
        });
        assert!(valid_addons(&[addon.clone()]));
        addon.options["show_percentage"] = serde_json::json!(false);
        addon.options["bar_length_percent"] = serde_json::json!(85);
        addon.options["bar_thickness_percent"] = serde_json::json!(100);
        assert!(valid_addons(&[addon.clone()]));
        addon.options["bar_length_percent"] = serde_json::json!(151);
        assert!(!valid_addons(&[addon.clone()]));
        addon.options["bar_length_percent"] = serde_json::json!(85);
        addon.options["show_percentage"] = serde_json::json!("false");
        assert!(!valid_addons(&[addon.clone()]));
        addon.options["show_percentage"] = serde_json::json!(false);
        addon.options["unexpected"] = serde_json::json!(true);
        assert!(!valid_addons(&[addon]));
    }

    #[test]
    fn timer_resumes_and_finishes_after_restart() {
        let mut session = TimerSession::default();
        session.toggle(1_000, "countdown", 5);
        let restored: TimerSession =
            serde_json::from_str(&serde_json::to_string(&session).unwrap()).unwrap();
        assert_eq!(restored.elapsed(4_000), 3_000);
        session = restored;
        assert!(session.normalize(7_000, "countdown", 5));
        assert_eq!(session.elapsed_ms, 5_000);
        assert!(session.finished);
    }

    #[test]
    fn progress_countdown_validates_duration_and_keeps_sessions_independent() {
        let mut first = legacy_timer();
        first.id = "progress-one".into();
        first.kind = "progress".into();
        first.options = serde_json::json!({
            "mode":"countdown", "start_date":"2026-10-30", "end_date":"2026-10-31",
            "ranges":[{"start":"09:00","end":"17:00"}], "auto_hide":false,
            "countdown_seconds":10
        });
        let mut second = first.clone();
        second.id = "progress-two".into();
        second.options["countdown_seconds"] = serde_json::json!(20);
        assert!(valid_addons(&[first.clone(), second.clone()]));
        let durations = progress_countdown_options(&[first.clone(), second]);
        assert_eq!(durations["progress-one"], 10);
        assert_eq!(durations["progress-two"], 20);
        let mut sessions = HashMap::new();
        sessions.insert("progress-one".to_string(), TimerSession::default());
        sessions.insert("progress-two".to_string(), TimerSession::default());
        sessions
            .get_mut("progress-one")
            .unwrap()
            .toggle(1000, "countdown", 10);
        assert!(sessions["progress-one"].running);
        assert!(!sessions["progress-two"].running);
        first
            .options
            .as_object_mut()
            .unwrap()
            .remove("countdown_seconds");
        assert!(!valid_addons(&[first.clone()]));
        first.options["countdown_seconds"] = serde_json::json!(0);
        assert!(!valid_addons(&[first.clone()]));
        first.options["countdown_seconds"] = serde_json::json!(360000);
        assert!(!valid_addons(&[first]));
    }

    #[test]
    fn progress_minutes_lock_survives_pause_and_unlocks_on_finish_or_reset() {
        let mut session = TimerSession::default();
        assert!(!session.progress_duration_locked());
        session.toggle_progress(1_000, 5);
        assert!(session.progress_duration_locked());
        session.toggle_progress(1_000, 5);
        assert!(!session.running);
        assert_eq!(session.elapsed_ms, 0);
        assert!(session.progress_duration_locked());
        let restored: TimerSession =
            serde_json::from_value(serde_json::to_value(&session).unwrap()).unwrap();
        assert!(restored.progress_duration_locked());
        let mut finished = restored;
        finished.toggle_progress(2_000, 5);
        assert!(finished.normalize(7_000, "countdown", 5));
        assert!(!finished.progress_duration_locked());
        finished = TimerSession::default();
        assert!(!finished.progress_duration_locked());
        let mut legacy: TimerSession = serde_json::from_value(serde_json::json!({
            "running": false, "elapsed_ms": 1000, "started_at_ms": null, "finished": false
        }))
        .unwrap();
        legacy.restore_progress_started();
        assert!(legacy.progress_duration_locked());
    }

    #[test]
    fn bundled_kind_and_action_contract_matches_frontend_fixture() {
        let fixture: serde_json::Value =
            serde_json::from_str(include_str!("../../../src/addons/contracts.json")).unwrap();
        let entries = fixture.as_object().unwrap();
        assert_eq!(entries.len(), 5);
        for (kind, actions) in entries {
            assert!(registry::AddonKind::from_str(kind).is_some());
            let mut session = TimerSession::default();
            let mut counter_session = CounterSession::default();
            for action in actions.as_array().unwrap() {
                let action = action.as_str().unwrap();
                let result = match kind.as_str() {
                    "timer" => timer::apply_action(&mut session, action, 1_000, "countdown", 5),
                    "progress" => progress::apply_action(&mut session, action, 1_000, 5),
                    "counter" => counter::apply_action(&mut counter_session, action, 1_000, true),
                    _ => panic!("Unexpected actions for {kind}"),
                };
                assert!(result.is_ok());
            }
        }
    }

    #[test]
    fn settings_reconciliation_preserves_distinct_cleanup_rules() {
        let timer = legacy_timer();
        let mut numeric = TimerSession::default();
        numeric.toggle(1_000, "countdown", 300);
        let mut disabled_timer = timer.clone();
        disabled_timer.enabled = false;
        assert!(
            timer::reconcile_settings(&[timer.clone()], &[disabled_timer], &mut numeric).unwrap()
        );
        assert!(!numeric.running);
        numeric.toggle(1_000, "countdown", 300);
        let mut changed_timer = timer.clone();
        changed_timer.options["duration_seconds"] = serde_json::json!(600);
        assert!(
            timer::reconcile_settings(&[timer.clone()], &[changed_timer], &mut numeric).is_err()
        );
        assert!(numeric.running);
        assert!(timer::reconcile_settings(&[timer], &[], &mut numeric).unwrap());
        assert!(!numeric.running);

        let mut first = legacy_timer();
        first.kind = "progress".into();
        first.id = "first".into();
        first.options = serde_json::json!({"mode":"countdown","countdown_seconds":300});
        let mut second = first.clone();
        second.id = "second".into();
        let mut sessions = HashMap::new();
        let mut running = TimerSession::default();
        running.toggle_progress(1_000, 300);
        sessions.insert(first.id.clone(), running);
        sessions.insert(second.id.clone(), TimerSession::default());
        let mut disabled = first.clone();
        disabled.enabled = false;
        assert!(!progress::reconcile_settings(
            &[first.clone(), second.clone()],
            &[disabled, second.clone()],
            &mut sessions
        )
        .unwrap());
        assert!(sessions.contains_key("first"));
        let mut changed = first.clone();
        changed.options["countdown_seconds"] = serde_json::json!(600);
        assert!(progress::reconcile_settings(
            &[first.clone(), second.clone()],
            &[changed],
            &mut sessions
        )
        .is_err());
        assert_eq!(sessions.len(), 2);
        assert!(
            progress::reconcile_settings(&[first, second.clone()], &[second], &mut sessions)
                .unwrap()
        );
        assert!(!sessions.contains_key("first"));
        assert!(sessions.contains_key("second"));
    }
}
