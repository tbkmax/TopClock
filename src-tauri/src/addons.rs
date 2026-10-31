use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::collections::HashSet;

#[derive(Clone, PartialEq, Serialize, Deserialize)]
pub(crate) struct AddonInstance {
    pub(crate) id: String,
    pub(crate) kind: String,
    pub(crate) enabled: bool,
    pub(crate) placement: String,
    pub(crate) size_percent: u8,
    pub(crate) options: Value,
}

pub(crate) fn legacy_timer() -> AddonInstance {
    AddonInstance {
        id: "timer".into(),
        kind: "timer".into(),
        enabled: true,
        placement: "below".into(),
        size_percent: 30,
        options: serde_json::json!({"mode":"countdown","duration_seconds":300}),
    }
}

pub(crate) fn timer_options(addons: &[AddonInstance]) -> Option<(&str, u64)> {
    addons
        .iter()
        .find(|addon| addon.kind == "timer" && addon.enabled)
        .and_then(|addon| {
            Some((
                addon.options.get("mode")?.as_str()?,
                addon.options.get("duration_seconds")?.as_u64()?,
            ))
        })
}

pub(crate) fn progress_countdown_options(addons: &[AddonInstance]) -> HashMap<String, u64> {
    addons
        .iter()
        .filter(|addon| {
            addon.kind == "progress"
                && addon.options.get("mode").and_then(Value::as_str) == Some("countdown")
        })
        .filter_map(|addon| {
            Some((
                addon.id.clone(),
                addon.options.get("countdown_seconds")?.as_u64()?,
            ))
        })
        .collect()
}

fn valid_date(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() != 10
        || bytes[4] != b'-'
        || bytes[7] != b'-'
        || !bytes
            .iter()
            .enumerate()
            .all(|(index, byte)| index == 4 || index == 7 || byte.is_ascii_digit())
    {
        return false;
    }
    let year: u32 = value[0..4].parse().unwrap_or(0);
    let month: u32 = value[5..7].parse().unwrap_or(0);
    let day: u32 = value[8..10].parse().unwrap_or(0);
    let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    let days = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if leap => 29,
        2 => 28,
        _ => 0,
    };
    (1000..=9999).contains(&year) && day >= 1 && day <= days
}

fn time_minutes(value: &str) -> Option<u16> {
    let bytes = value.as_bytes();
    if bytes.len() != 5
        || bytes[2] != b':'
        || !bytes
            .iter()
            .enumerate()
            .all(|(index, byte)| index == 2 || byte.is_ascii_digit())
    {
        return None;
    }
    let hour: u16 = value[0..2].parse().ok()?;
    let minute: u16 = value[3..5].parse().ok()?;
    (hour < 24 && minute < 60).then_some(hour * 60 + minute)
}

fn valid_progress_options(options: &serde_json::Map<String, Value>) -> bool {
    if !(5..=9).contains(&options.len())
        || !options.keys().all(|key| {
            matches!(
                key.as_str(),
                "mode"
                    | "start_date"
                    | "end_date"
                    | "ranges"
                    | "auto_hide"
                    | "show_percentage"
                    | "bar_length_percent"
                    | "bar_thickness_percent"
                    | "countdown_seconds"
            )
        })
        || !matches!(
            options.get("mode").and_then(Value::as_str),
            Some("date" | "time" | "countdown")
        )
        || options
            .get("show_percentage")
            .is_some_and(|value| !value.is_boolean())
        || options.get("bar_length_percent").is_some_and(|value| {
            !value
                .as_u64()
                .is_some_and(|length| (50..=150).contains(&length))
        })
        || options.get("bar_thickness_percent").is_some_and(|value| {
            !value
                .as_u64()
                .is_some_and(|thickness| (50..=200).contains(&thickness))
        })
        || (options.get("mode").and_then(Value::as_str) == Some("countdown")
            && !options
                .get("countdown_seconds")
                .and_then(Value::as_u64)
                .is_some_and(|seconds| (1..=359_999).contains(&seconds)))
        || options.get("countdown_seconds").is_some_and(|value| {
            !value
                .as_u64()
                .is_some_and(|seconds| (1..=359_999).contains(&seconds))
        })
    {
        return false;
    }
    let (Some(start), Some(end), Some(ranges), Some(_auto_hide)) = (
        options.get("start_date").and_then(Value::as_str),
        options.get("end_date").and_then(Value::as_str),
        options.get("ranges").and_then(Value::as_array),
        options.get("auto_hide").and_then(Value::as_bool),
    ) else {
        return false;
    };
    if !valid_date(start)
        || !valid_date(end)
        || start >= end
        || ranges.is_empty()
        || ranges.len() > 8
    {
        return false;
    }
    let mut previous_end = 0;
    ranges.iter().all(|range| {
        let Some(range) = range.as_object() else {
            return false;
        };
        let (Some(start), Some(end)) = (
            range
                .get("start")
                .and_then(Value::as_str)
                .and_then(time_minutes),
            range
                .get("end")
                .and_then(Value::as_str)
                .and_then(time_minutes),
        ) else {
            return false;
        };
        if range.len() != 2 || start < previous_end || start >= end {
            return false;
        }
        previous_end = end;
        true
    })
}

pub(crate) fn valid_addons(addons: &[AddonInstance]) -> bool {
    if addons.len() > 16 {
        return false;
    }
    let mut ids = HashSet::new();
    let mut singleton_kinds = HashSet::new();
    let mut regions = 0;
    addons.iter().all(|addon| {
        if addon.id.is_empty()
            || addon.id.len() > 64
            || !addon
                .id
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
            || !ids.insert(addon.id.as_str())
            || !matches!(addon.placement.as_str(), "above" | "below")
            || !(10..=100).contains(&addon.size_percent)
        {
            return false;
        }
        let Some(options) = addon.options.as_object() else {
            return false;
        };
        match addon.kind.as_str() {
            "date" => {
                singleton_kinds.insert("date")
                    && (options.len() == 1 || options.len() == 2)
                    && (options.len() == 1
                        || options
                            .get("show_weekday")
                            .and_then(Value::as_bool)
                            .is_some())
                    && matches!(
                        options.get("format").and_then(Value::as_str),
                        Some("ymd" | "md" | "d")
                    )
            }
            "region_clock" => {
                regions += 1;
                regions <= 12
                    && (options.len() == 1 || options.len() == 2)
                    && (options.len() == 1
                        || options.get("show_label").and_then(Value::as_bool).is_some())
                    && options
                        .get("time_zone")
                        .and_then(Value::as_str)
                        .is_some_and(|zone| {
                            !zone.is_empty()
                                && zone.len() <= 80
                                && zone.bytes().all(|b| {
                                    b.is_ascii_alphanumeric()
                                        || matches!(b, b'/' | b'_' | b'+' | b'-')
                                })
                        })
            }
            "timer" => {
                singleton_kinds.insert("timer")
                    && options.len() == 2
                    && matches!(
                        options.get("mode").and_then(Value::as_str),
                        Some("countdown" | "stopwatch")
                    )
                    && options
                        .get("duration_seconds")
                        .and_then(Value::as_u64)
                        .is_some_and(|seconds| (1..=359_999).contains(&seconds))
            }
            "progress" => valid_progress_options(options),
            _ => false,
        }
    })
}

#[derive(Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct TimerSession {
    pub(crate) running: bool,
    pub(crate) elapsed_ms: u64,
    pub(crate) started_at_ms: Option<u64>,
    pub(crate) finished: bool,
    #[serde(default)]
    pub(crate) has_started: bool,
}

impl TimerSession {
    pub(crate) fn progress_duration_locked(&self) -> bool {
        self.has_started && !self.finished
    }

    pub(crate) fn toggle_progress(&mut self, now_ms: u64, duration_seconds: u64) {
        self.toggle(now_ms, "countdown", duration_seconds);
        self.has_started = true;
    }

    pub(crate) fn restore_progress_started(&mut self) {
        self.has_started |= self.running || self.elapsed_ms > 0 || self.finished;
    }

    pub(crate) fn elapsed(&self, now_ms: u64) -> u64 {
        self.elapsed_ms.saturating_add(if self.running {
            now_ms.saturating_sub(self.started_at_ms.unwrap_or(now_ms))
        } else {
            0
        })
    }

    pub(crate) fn normalize(&mut self, now_ms: u64, mode: &str, duration_seconds: u64) -> bool {
        if self.running && mode == "countdown" && self.elapsed(now_ms) >= duration_seconds * 1000 {
            self.running = false;
            self.elapsed_ms = duration_seconds * 1000;
            self.started_at_ms = None;
            self.finished = true;
            return true;
        }
        false
    }

    pub(crate) fn toggle(&mut self, now_ms: u64, mode: &str, duration_seconds: u64) {
        self.normalize(now_ms, mode, duration_seconds);
        if self.running {
            self.elapsed_ms = self.elapsed(now_ms);
            self.running = false;
            self.started_at_ms = None;
        } else {
            if self.finished {
                *self = Self::default();
            }
            self.running = true;
            self.started_at_ms = Some(now_ms);
        }
    }
}

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
        first.options["ranges"][1]["start"] = serde_json::json!("09:30");
        assert!(!valid_addons(&[first.clone()]));
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
}
