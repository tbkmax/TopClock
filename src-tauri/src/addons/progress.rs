use super::{instance::AddonInstance, session::TimerSession};
use serde_json::{Map, Value};
use std::collections::HashMap;

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

fn progress_days_mask(range: &Map<String, Value>) -> Option<u8> {
    let Some(days) = range.get("days") else {
        return Some(0x7f);
    };
    let days = days.as_array()?;
    if days.is_empty() {
        return Some(0x7f);
    }
    if days.len() > 7 {
        return None;
    }
    let mut mask = 0u8;
    for day in days {
        let bit = match day.as_str()? {
            "sun" => 1 << 0,
            "mon" => 1 << 1,
            "tue" => 1 << 2,
            "wed" => 1 << 3,
            "thu" => 1 << 4,
            "fri" => 1 << 5,
            "sat" => 1 << 6,
            _ => return None,
        };
        if mask & bit != 0 {
            return None;
        }
        mask |= bit;
    }
    Some(mask)
}

pub(super) fn valid_options(options: &Map<String, Value>) -> bool {
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
    let mut previous_start = 0;
    let mut validated_ranges = Vec::with_capacity(ranges.len());
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
        let Some(days) = progress_days_mask(range) else {
            return false;
        };
        if !range
            .keys()
            .all(|key| matches!(key.as_str(), "start" | "end" | "days"))
            || range.len() < 2
            || range.len() > 3
            || start < previous_start
            || start >= end
            || validated_ranges
                .iter()
                .any(|(other_start, other_end, other_days)| {
                    start < *other_end && *other_start < end && days & *other_days != 0
                })
        {
            return false;
        }
        previous_start = start;
        validated_ranges.push((start, end, days));
        true
    })
}

pub(super) fn apply_action(
    session: &mut TimerSession,
    action: &str,
    now_ms: u64,
    duration: u64,
) -> Result<(), String> {
    match action {
        "toggle" => session.toggle_progress(now_ms, duration),
        "reset" => *session = TimerSession::default(),
        _ => return Err("Unknown Progress countdown action".into()),
    }
    Ok(())
}

pub(crate) fn reconcile_settings(
    old: &[AddonInstance],
    new: &[AddonInstance],
    sessions: &mut HashMap<String, TimerSession>,
) -> Result<bool, String> {
    let old_progress = progress_countdown_options(old);
    let new_progress = progress_countdown_options(new);
    if old_progress.iter().any(|(id, duration)| {
        new_progress.get(id) != Some(duration)
            && new_progress.contains_key(id)
            && sessions
                .get(id)
                .is_some_and(|session| session.progress_duration_locked())
    }) {
        return Err("Finish or reset the Progress countdown before changing its duration".into());
    }
    let mut changed = false;
    for (id, duration) in old_progress {
        if new_progress.get(&id) != Some(&duration) {
            changed |= sessions.remove(&id).is_some();
        }
    }
    Ok(changed)
}
