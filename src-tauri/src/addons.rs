use serde::{Deserialize, Serialize};
use serde_json::Value;
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
        size_percent: 55,
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
            || !(30..=100).contains(&addon.size_percent)
        {
            return false;
        }
        let Some(options) = addon.options.as_object() else {
            return false;
        };
        match addon.kind.as_str() {
            "date" => {
                singleton_kinds.insert("date")
                    && options.len() == 1
                    && matches!(
                        options.get("format").and_then(Value::as_str),
                        Some("ymd" | "md" | "d")
                    )
            }
            "region_clock" => {
                regions += 1;
                regions <= 12
                    && options.len() == 1
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
}

impl TimerSession {
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
        addons.push(addons[0].clone());
        assert!(!valid_addons(&addons));
        addons.pop();
        addons[0].options = serde_json::json!({"mode":"countdown","duration_seconds":0});
        assert!(!valid_addons(&addons));
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
}
