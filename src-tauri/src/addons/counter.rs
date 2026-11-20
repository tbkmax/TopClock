use crate::{
    addons::counter_db::{epoch_ms, tick_ms, CounterRun},
    state::ClockState,
};
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
    pub(crate) fn valid(&self) -> bool {
        matches!(self.direction, -1..=1)
            && self.running == self.started_at_ms.is_some()
            && (!self.running || self.direction != 0)
    }
}

pub(super) fn valid_options(options: &Map<String, Value>) -> bool {
    options.is_empty()
}

#[tauri::command]
pub(crate) fn get_counter_state(
    state: tauri::State<'_, Arc<ClockState>>,
) -> Result<CounterSession, String> {
    state
        .counter_db
        .lock()
        .unwrap()
        .snapshot(epoch_ms(), tick_ms())
}

#[tauri::command]
pub(crate) fn get_counter_history(
    state: tauri::State<'_, Arc<ClockState>>,
    limit: u32,
) -> Result<Vec<CounterRun>, String> {
    state.counter_db.lock().unwrap().history(limit)
}

#[tauri::command]
pub(crate) fn counter_action(
    app: tauri::AppHandle,
    action: String,
    confirmed_reset: bool,
    action_id: Option<String>,
) -> Result<CounterSession, String> {
    let state = app.state::<Arc<ClockState>>();
    let config = state.config.lock().unwrap();
    if !config
        .settings
        .addons
        .iter()
        .any(|a| a.kind == "counter" && a.enabled)
    {
        return Err("Counter add-on is not enabled".into());
    }
    let snapshot = state.counter_db.lock().unwrap().apply(
        &action,
        epoch_ms(),
        tick_ms(),
        confirmed_reset,
        None,
        action_id.as_deref(),
    )?;
    drop(config);
    let _ = app.emit("counter-state-changed", &snapshot);
    Ok(snapshot)
}

pub(crate) fn stop_on_quit(app: &tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<Arc<ClockState>>();
    let _config = state.config.lock().unwrap();
    let mut db = state.counter_db.lock().unwrap();
    if !db.snapshot(epoch_ms(), tick_ms())?.running {
        return Ok(());
    }
    db.apply("stop", epoch_ms(), tick_ms(), true, None, None)?;
    Ok(())
}
