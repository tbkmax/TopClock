use crate::{config_store::save_config, state::ClockState, timer::epoch_ms};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::sync::Arc;
use tauri::{Emitter, Manager};

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct CounterSession {
    pub(crate) value_ms: i64,
    pub(crate) running: bool,
    pub(crate) direction: i8,
    pub(crate) started_at_ms: Option<u64>,
}

impl CounterSession {
    pub(crate) fn value_at(&self, now_ms: u64) -> i64 {
        if !self.running {
            return self.value_ms;
        }
        let elapsed = now_ms.saturating_sub(self.started_at_ms.unwrap_or(now_ms));
        let delta = i64::try_from(elapsed).unwrap_or(i64::MAX);
        self.value_ms
            .saturating_add(delta.saturating_mul(i64::from(self.direction)))
    }

    pub(crate) fn stop(&mut self, now_ms: u64) {
        self.value_ms = self.value_at(now_ms);
        self.running = false;
        self.started_at_ms = None;
    }

    pub(crate) fn start(&mut self, direction: i8, now_ms: u64) {
        self.stop(now_ms);
        self.direction = direction;
        self.running = true;
        self.started_at_ms = Some(now_ms);
    }

    pub(crate) fn valid(&self) -> bool {
        matches!(self.direction, -1..=1)
            && self.running == self.started_at_ms.is_some()
            && (!self.running || self.direction != 0)
    }
}

pub(super) fn valid_options(options: &Map<String, Value>) -> bool {
    options.is_empty()
}

pub(super) fn apply_action(
    session: &mut CounterSession,
    action: &str,
    now_ms: u64,
    confirmed_reset: bool,
) -> Result<(), String> {
    match action {
        "start_positive" => session.start(1, now_ms),
        "start_negative" => session.start(-1, now_ms),
        "stop" => session.stop(now_ms),
        "reset" if confirmed_reset => *session = CounterSession::default(),
        "reset" => return Err("Counter reset requires confirmation".into()),
        _ => return Err("Unknown Counter action".into()),
    }
    Ok(())
}

pub(crate) fn reconcile_settings(
    new: &[super::AddonInstance],
    session: &mut CounterSession,
    now_ms: u64,
) -> bool {
    if new.iter().any(|a| a.kind == "counter" && !a.enabled) && session.running {
        session.stop(now_ms);
        return true;
    }
    false
}

#[tauri::command]
pub(crate) fn get_counter_state(state: tauri::State<'_, Arc<ClockState>>) -> CounterSession {
    state.config.lock().unwrap().counter_session.clone()
}

#[tauri::command]
pub(crate) fn counter_action(
    app: tauri::AppHandle,
    action: String,
    confirmed_reset: bool,
) -> Result<CounterSession, String> {
    let state = app.state::<Arc<ClockState>>();
    let mut config = state.config.lock().unwrap();
    if !config
        .settings
        .addons
        .iter()
        .any(|a| a.kind == "counter" && a.enabled)
    {
        return Err("Counter add-on is not enabled".into());
    }
    let before = config.counter_session.clone();
    let now = epoch_ms();
    apply_action(&mut config.counter_session, &action, now, confirmed_reset)?;
    if let Err(error) = save_config(&state, &config) {
        config.counter_session = before;
        return Err(error);
    }
    let snapshot = config.counter_session.clone();
    drop(config);
    let _ = app.emit("counter-state-changed", &snapshot);
    Ok(snapshot)
}

pub(crate) fn stop_on_quit(app: &tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<Arc<ClockState>>();
    let mut config = state.config.lock().unwrap();
    if !config.counter_session.running {
        return Ok(());
    }
    let before = config.counter_session.clone();
    config.counter_session.stop(epoch_ms());
    if let Err(error) = save_config(&state, &config) {
        config.counter_session = before;
        return Err(error);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn signed_balance_changes_direction_and_stops() {
        let mut counter = CounterSession::default();
        counter.start(1, 1_000);
        assert_eq!(counter.value_at(3_000), 2_000);
        counter.start(-1, 3_000);
        assert_eq!(counter.value_at(6_000), -1_000);
        counter.stop(6_000);
        assert_eq!(counter.value_at(60_000), -1_000);
        assert!(counter.valid());
        assert!(apply_action(&mut counter, "reset", 60_000, false).is_err());
        assert_eq!(counter.value_ms, -1_000);
        apply_action(&mut counter, "reset", 60_000, true).unwrap();
        assert_eq!(counter, CounterSession::default());
    }

    #[test]
    fn serialized_session_keeps_stopped_balance() {
        let mut counter = CounterSession::default();
        counter.start(-1, 10);
        counter.stop(61_010);
        let saved = serde_json::to_string(&counter).unwrap();
        let restored: CounterSession = serde_json::from_str(&saved).unwrap();
        assert_eq!(restored.value_at(900_000), -61_000);
        assert!(!restored.running);
    }

    #[test]
    fn disabling_stops_but_removing_preserves_running_counter() {
        let mut addon = super::super::legacy_timer();
        addon.kind = "counter".into();
        addon.options = serde_json::json!({});
        let mut session = CounterSession::default();
        session.start(1, 1_000);
        let mut disabled = addon.clone();
        disabled.enabled = false;
        assert!(reconcile_settings(
            &[disabled.clone()],
            &mut session,
            61_000
        ));
        assert_eq!(session.value_ms, 60_000);
        assert!(!session.running);
        assert!(!reconcile_settings(&[], &mut session, 62_000));
        assert_eq!(session.value_ms, 60_000);
        session.start(1, 63_000);
        assert!(!reconcile_settings(&[], &mut session, 65_000));
        assert_eq!(session.value_at(65_000), 62_000);
        assert!(session.running);
        assert!(!reconcile_settings(&[addon], &mut session, 66_000));
        assert_eq!(session.value_at(66_000), 63_000);
    }
}
