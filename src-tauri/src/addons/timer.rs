use super::{instance::AddonInstance, session::TimerSession};
use serde_json::{Map, Value};

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

pub(super) fn valid_options(options: &Map<String, Value>) -> bool {
    options.len() == 2
        && matches!(
            options.get("mode").and_then(Value::as_str),
            Some("countdown" | "stopwatch")
        )
        && options
            .get("duration_seconds")
            .and_then(Value::as_u64)
            .is_some_and(|seconds| (1..=359_999).contains(&seconds))
}

pub(super) fn apply_action(
    session: &mut TimerSession,
    action: &str,
    now_ms: u64,
    mode: &str,
    duration: u64,
) -> Result<(), String> {
    match action {
        "toggle" => session.toggle(now_ms, mode, duration),
        "reset" => *session = TimerSession::default(),
        _ => return Err("Unknown timer action".into()),
    }
    Ok(())
}

pub(crate) fn reconcile_settings(
    old: &[AddonInstance],
    new: &[AddonInstance],
    session: &mut TimerSession,
) -> Result<bool, String> {
    let old_timer = timer_options(old);
    let new_timer = timer_options(new);
    if old_timer == new_timer {
        return Ok(false);
    }
    if session.running && new_timer.is_some() {
        return Err("Pause the timer before changing its mode or duration".into());
    }
    *session = TimerSession::default();
    Ok(true)
}
