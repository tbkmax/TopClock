//! Local Counter state and transition history. All mutations use one SQLite transaction.
use super::counter::CounterSession;
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use std::path::Path;
use uuid::Uuid;

pub(crate) struct CounterDatabase {
    connection: Connection,
    active_tick_ms: Option<u64>,
}

pub(crate) struct StagedAction {
    pub(crate) active_run_id: Option<i64>,
    pub(crate) applied: bool,
}

#[derive(Clone)]
struct StoredState {
    value_ms: i64,
    running: bool,
    direction: i8,
    active_run_id: Option<i64>,
    revision: i64,
    reset_epoch: i64,
    last_reset_action_id: Option<String>,
}

fn database_error(error: impl std::fmt::Display) -> String {
    format!("Counter database: {error}")
}

pub(super) fn validate_action(action: &str, confirmed_reset: bool) -> Result<(), String> {
    match action {
        "start_positive" | "start_negative" | "stop" | "recover" => Ok(()),
        "reset" if confirmed_reset => Ok(()),
        "reset" => Err("Counter reset requires confirmation".into()),
        _ => Err("Unknown Counter action".into()),
    }
}

fn stored_state(tx: &Transaction<'_>) -> Result<StoredState, String> {
    tx.query_row(
        "SELECT value_ms, running, direction, active_run_id, revision, reset_epoch, last_reset_action_id
         FROM counter_state WHERE id = 1",
        [],
        |row| {
            Ok(StoredState {
                value_ms: row.get(0)?,
                running: row.get::<_, i64>(1)? != 0,
                direction: row.get(2)?,
                active_run_id: row.get(3)?,
                revision: row.get(4)?,
                reset_epoch: row.get(5)?,
                last_reset_action_id: row.get(6)?,
            })
        },
    )
    .map_err(database_error)
}

impl CounterDatabase {
    pub(crate) fn open(
        path: &Path,
        legacy: &CounterSession,
        counter_disabled: bool,
    ) -> Result<Self, String> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(database_error)?;
        }
        let mut connection = Connection::open(path).map_err(database_error)?;
        connection
            .execute_batch("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;")
            .map_err(database_error)?;
        let version: i64 = connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .map_err(database_error)?;
        if version > 2 {
            return Err(format!(
                "Counter database schema {version} is newer than this build"
            ));
        }
        if version == 0 {
            let tx = connection.transaction().map_err(database_error)?;
            tx.execute_batch(
                "CREATE TABLE counter_state (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    value_ms INTEGER NOT NULL,
                    running INTEGER NOT NULL CHECK (running IN (0, 1)),
                    direction INTEGER NOT NULL CHECK (direction BETWEEN -1 AND 1),
                    active_run_id INTEGER,
                    revision INTEGER NOT NULL,
                    reset_epoch INTEGER NOT NULL,
                    imported_legacy INTEGER NOT NULL CHECK (imported_legacy = 1),
                    last_reset_action_id TEXT,
                    CHECK ((running = 1) = (active_run_id IS NOT NULL))
                );
                CREATE TABLE counter_run (
                    id INTEGER PRIMARY KEY,
                    direction INTEGER NOT NULL CHECK (direction IN (-1, 1)),
                    started_at_utc_ms INTEGER NOT NULL,
                    ended_at_utc_ms INTEGER,
                    measured_duration_ms INTEGER CHECK (measured_duration_ms >= 0),
                    close_reason TEXT,
                    reset_epoch INTEGER NOT NULL,
                    CHECK ((ended_at_utc_ms IS NULL) = (measured_duration_ms IS NULL))
                );
                CREATE UNIQUE INDEX counter_one_open_run
                    ON counter_run ((1)) WHERE ended_at_utc_ms IS NULL;
                CREATE INDEX counter_runs_by_start
                    ON counter_run (started_at_utc_ms);
                CREATE INDEX counter_runs_by_epoch
                    ON counter_run (reset_epoch, started_at_utc_ms);
                CREATE TABLE counter_event (
                    event_id TEXT PRIMARY KEY,
                    sequence INTEGER NOT NULL UNIQUE,
                    action TEXT NOT NULL,
                    captured_at_utc_ms INTEGER NOT NULL,
                    resulting_revision INTEGER NOT NULL,
                    run_id INTEGER,
                    resulting_balance_ms INTEGER NOT NULL,
                    origin TEXT NOT NULL DEFAULT 'local',
                    FOREIGN KEY (run_id) REFERENCES counter_run(id)
                );
                PRAGMA user_version = 2;",
            )
            .map_err(database_error)?;
            tx.execute(
                "INSERT INTO counter_state
                 (id, value_ms, running, direction, active_run_id, revision, reset_epoch, imported_legacy)
                 VALUES (1, ?1, 0, ?2, NULL, 0, 0, 1)",
                params![legacy.value_ms, legacy.direction],
            )
            .map_err(database_error)?;
            tx.commit().map_err(database_error)?;
        } else if version == 1 {
            let tx = connection.transaction().map_err(database_error)?;
            tx.execute_batch(
                "ALTER TABLE counter_state ADD COLUMN last_reset_action_id TEXT;
                 PRAGMA user_version = 2;",
            )
            .map_err(database_error)?;
            tx.commit().map_err(database_error)?;
        }
        let mut database = Self {
            connection,
            active_tick_ms: None,
        };
        let state = database.read_state()?;
        if state.running {
            let reason = if counter_disabled {
                "disabled_recovery"
            } else {
                "unclean_restart"
            };
            // No monotonic anchor survives a process restart. Keep the last
            // durable balance and close the abandoned run with zero measured time.
            database.apply("recover", epoch_ms(), tick_ms(), true, Some(reason), None)?;
        }
        Ok(database)
    }

    fn read_state(&self) -> Result<StoredState, String> {
        self.connection
            .query_row(
                "SELECT value_ms, running, direction, active_run_id, revision, reset_epoch, last_reset_action_id
                 FROM counter_state WHERE id = 1",
                [],
                |row| {
                    Ok(StoredState {
                        value_ms: row.get(0)?,
                        running: row.get::<_, i64>(1)? != 0,
                        direction: row.get(2)?,
                        active_run_id: row.get(3)?,
                        revision: row.get(4)?,
                        reset_epoch: row.get(5)?,
                        last_reset_action_id: row.get(6)?,
                    })
                },
            )
            .map_err(database_error)
    }

    pub(crate) fn snapshot(
        &self,
        now_epoch_ms: u64,
        now_tick_ms: u64,
    ) -> Result<CounterSession, String> {
        let state = self.read_state()?;
        let elapsed = if state.running {
            now_tick_ms.saturating_sub(self.active_tick_ms.unwrap_or(now_tick_ms))
        } else {
            0
        };
        let delta = i64::try_from(elapsed).unwrap_or(i64::MAX);
        Ok(CounterSession {
            value_ms: state
                .value_ms
                .saturating_add(delta.saturating_mul(i64::from(state.direction))),
            running: state.running,
            direction: state.direction,
            started_at_ms: state.running.then_some(now_epoch_ms),
        })
    }

    pub(crate) fn transaction(&mut self) -> Result<Transaction<'_>, String> {
        self.connection.transaction().map_err(database_error)
    }

    pub(crate) fn stage(
        tx: &Transaction<'_>,
        action: &str,
        now_epoch_ms: u64,
        elapsed_ms: u64,
        confirmed_reset: bool,
        recovery_reason: Option<&str>,
        action_id: &str,
    ) -> Result<StagedAction, String> {
        validate_action(action, confirmed_reset)?;
        Uuid::parse_str(action_id).map_err(|_| "Invalid Counter action ID".to_string())?;
        let mut state = stored_state(tx)?;
        if state.last_reset_action_id.as_deref() == Some(action_id) {
            if action != "reset" {
                return Err("Counter action ID was already used for Reset".into());
            }
            return Ok(StagedAction {
                active_run_id: None,
                applied: false,
            });
        }
        let existing_action: Option<String> = tx
            .query_row(
                "SELECT action FROM counter_event WHERE event_id = ?1",
                [action_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(database_error)?;
        if let Some(existing_action) = existing_action {
            if existing_action != action {
                return Err("Counter action ID was already used for another action".into());
            }
            return Ok(StagedAction {
                active_run_id: state.active_run_id,
                applied: false,
            });
        }
        if action == "reset" {
            // Reset is a destructive history boundary. Keep only the singleton
            // state row and its last Reset ID so an immediate retry cannot
            // erase a new run started after the accepted Reset.
            tx.execute("DELETE FROM counter_event", [])
                .map_err(database_error)?;
            tx.execute("DELETE FROM counter_run", [])
                .map_err(database_error)?;
            tx.execute(
                "UPDATE counter_state
                 SET value_ms = 0, running = 0, direction = 0,
                     active_run_id = NULL, revision = revision + 1,
                     reset_epoch = reset_epoch + 1, last_reset_action_id = ?1
                 WHERE id = 1",
                [action_id],
            )
            .map_err(database_error)?;
            return Ok(StagedAction {
                active_run_id: None,
                applied: true,
            });
        }
        let now = i64::try_from(now_epoch_ms).unwrap_or(i64::MAX);
        let mut event_run_id = state.active_run_id;
        if state.running {
            let duration = i64::try_from(elapsed_ms).unwrap_or(i64::MAX);
            let reason = recovery_reason.unwrap_or(action);
            tx.execute(
                "UPDATE counter_run
                 SET ended_at_utc_ms = ?1, measured_duration_ms = ?2, close_reason = ?3
                 WHERE id = ?4 AND ended_at_utc_ms IS NULL",
                params![now, duration, reason, state.active_run_id],
            )
            .map_err(database_error)?;
            if action != "recover" {
                state.value_ms = state
                    .value_ms
                    .saturating_add(duration.saturating_mul(i64::from(state.direction)));
            }
            state.running = false;
            state.active_run_id = None;
        }
        match action {
            "start_positive" | "start_negative" => {
                state.direction = if action == "start_positive" { 1 } else { -1 };
                tx.execute(
                    "INSERT INTO counter_run (direction, started_at_utc_ms, reset_epoch)
                     VALUES (?1, ?2, ?3)",
                    params![state.direction, now, state.reset_epoch],
                )
                .map_err(database_error)?;
                state.active_run_id = Some(tx.last_insert_rowid());
                event_run_id = state.active_run_id;
                state.running = true;
            }
            _ => {}
        }
        state.revision += 1;
        tx.execute(
            "UPDATE counter_state
             SET value_ms = ?1, running = ?2, direction = ?3, active_run_id = ?4,
                 revision = ?5, reset_epoch = ?6 WHERE id = 1",
            params![
                state.value_ms,
                state.running as i64,
                state.direction,
                state.active_run_id,
                state.revision,
                state.reset_epoch
            ],
        )
        .map_err(database_error)?;
        tx.execute(
            "INSERT INTO counter_event
             (event_id, sequence, action, captured_at_utc_ms, resulting_revision, run_id, resulting_balance_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![action_id, state.revision, action, now, state.revision, event_run_id, state.value_ms],
        )
        .map_err(database_error)?;
        Ok(StagedAction {
            active_run_id: state.active_run_id,
            applied: true,
        })
    }

    pub(crate) fn elapsed(&self, now_tick_ms: u64) -> u64 {
        now_tick_ms.saturating_sub(self.active_tick_ms.unwrap_or(now_tick_ms))
    }

    pub(crate) fn committed(&mut self, active_run_id: Option<i64>, now_tick_ms: u64) {
        self.active_tick_ms = active_run_id.map(|_| now_tick_ms);
    }

    pub(crate) fn apply(
        &mut self,
        action: &str,
        now_epoch_ms: u64,
        now_tick_ms: u64,
        confirmed_reset: bool,
        recovery_reason: Option<&str>,
        action_id: Option<&str>,
    ) -> Result<CounterSession, String> {
        let elapsed = self.elapsed(now_tick_ms);
        let tx = self.transaction()?;
        let generated_id = Uuid::new_v4().to_string();
        let staged = Self::stage(
            &tx,
            action,
            now_epoch_ms,
            if recovery_reason.is_some() {
                0
            } else {
                elapsed
            },
            confirmed_reset,
            recovery_reason,
            action_id.unwrap_or(&generated_id),
        )?;
        tx.commit().map_err(database_error)?;
        if staged.applied {
            self.committed(staged.active_run_id, now_tick_ms);
        }
        self.snapshot(now_epoch_ms, now_tick_ms)
    }

    pub(crate) fn history(&self, limit: u32) -> Result<Vec<CounterRun>, String> {
        let mut query = self
            .connection
            .prepare(
                "SELECT id, direction, started_at_utc_ms, ended_at_utc_ms,
                    measured_duration_ms, close_reason, reset_epoch
             FROM counter_run ORDER BY started_at_utc_ms DESC, id DESC LIMIT ?1",
            )
            .map_err(database_error)?;
        let rows = query
            .query_map([limit.min(1000)], |row| {
                Ok(CounterRun {
                    id: row.get(0)?,
                    direction: row.get(1)?,
                    started_at_utc_ms: row.get(2)?,
                    ended_at_utc_ms: row.get(3)?,
                    measured_duration_ms: row.get(4)?,
                    close_reason: row.get(5)?,
                    reset_epoch: row.get(6)?,
                })
            })
            .map_err(database_error)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(database_error)
    }
}

#[derive(Debug, serde::Serialize)]
pub(crate) struct CounterRun {
    pub(crate) id: i64,
    pub(crate) direction: i8,
    pub(crate) started_at_utc_ms: i64,
    pub(crate) ended_at_utc_ms: Option<i64>,
    pub(crate) measured_duration_ms: Option<i64>,
    pub(crate) close_reason: Option<String>,
    pub(crate) reset_epoch: i64,
}

pub(crate) fn epoch_ms() -> u64 {
    super::runtime::epoch_ms()
}

#[cfg(windows)]
pub(crate) fn tick_ms() -> u64 {
    // GetTickCount64 is monotonic across wall-clock corrections and includes
    // sleep/hibernation, matching the old Counter's elapsed-time behavior.
    unsafe extern "system" {
        fn GetTickCount64() -> u64;
    }
    unsafe { GetTickCount64() }
}

#[cfg(not(windows))]
pub(crate) fn tick_ms() -> u64 {
    use std::sync::OnceLock;
    use std::time::Instant;
    static START: OnceLock<Instant> = OnceLock::new();
    START.get_or_init(Instant::now).elapsed().as_millis() as u64
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn test_path() -> PathBuf {
        std::env::temp_dir().join(format!("topclock-counter-{}.db", Uuid::new_v4()))
    }

    #[test]
    fn imports_legacy_balance_once_and_recovers_without_closed_process_time() {
        let path = test_path();
        let legacy = CounterSession {
            value_ms: -4_000,
            running: true,
            direction: -1,
            started_at_ms: Some(100),
        };
        let mut db = CounterDatabase::open(&path, &legacy, false).unwrap();
        assert_eq!(db.snapshot(1_000, 100).unwrap().value_ms, -4_000);
        assert!(!db.snapshot(1_000, 100).unwrap().running);
        db.apply("start_positive", 1_000, 100, true, None, None)
            .unwrap();
        drop(db);

        let reopened = CounterDatabase::open(
            &path,
            &CounterSession {
                value_ms: 99_999,
                ..CounterSession::default()
            },
            true,
        )
        .unwrap();
        let state = reopened.snapshot(1_000_000, 1_000_000).unwrap();
        assert_eq!(state.value_ms, -4_000);
        assert!(!state.running);
        let runs = reopened.history(10).unwrap();
        assert_eq!(runs.len(), 1);
        assert_eq!(runs[0].measured_duration_ms, Some(0));
        assert_eq!(runs[0].close_reason.as_deref(), Some("disabled_recovery"));
        drop(reopened);
        std::fs::remove_file(path).unwrap();
    }

    #[test]
    fn stores_signed_runs_then_reset_deletes_history() {
        let path = test_path();
        let mut db = CounterDatabase::open(&path, &CounterSession::default(), false).unwrap();
        db.apply("start_positive", 1_000, 100, true, None, None)
            .unwrap();
        assert_eq!(db.snapshot(3_000, 2_100).unwrap().value_ms, 2_000);
        db.apply("start_negative", 3_000, 2_100, true, None, None)
            .unwrap();
        assert_eq!(db.snapshot(6_000, 5_100).unwrap().value_ms, -1_000);
        db.apply("stop", 6_000, 5_100, true, None, None).unwrap();
        assert_eq!(db.snapshot(900_000, 900_000).unwrap().value_ms, -1_000);
        let runs = db.history(10).unwrap();
        assert_eq!(runs.len(), 2);
        assert_eq!(
            runs.iter()
                .map(|run| i64::from(run.direction) * run.measured_duration_ms.unwrap())
                .sum::<i64>(),
            -1_000
        );
        assert!(db.apply("reset", 7_000, 6_100, false, None, None).is_err());
        assert_eq!(db.history(10).unwrap().len(), 2);
        db.apply("reset", 7_000, 6_100, true, None, None).unwrap();
        assert_eq!(db.snapshot(8_000, 7_100).unwrap().value_ms, 0);
        assert!(db.history(10).unwrap().is_empty());
        let event_count: i64 = db
            .connection
            .query_row("SELECT COUNT(*) FROM counter_event", [], |row| row.get(0))
            .unwrap();
        assert_eq!(event_count, 0);
        assert_eq!(db.read_state().unwrap().reset_epoch, 1);
        db.connection.execute(
            "INSERT INTO counter_run (direction, started_at_utc_ms, reset_epoch) VALUES (1, 8_000, 1)", [],
        ).unwrap();
        assert!(db.connection.execute(
            "INSERT INTO counter_run (direction, started_at_utc_ms, reset_epoch) VALUES (1, 8_001, 1)", [],
        ).is_err());
        drop(db);
        std::fs::remove_file(path).unwrap();
    }

    #[test]
    fn reset_deletes_open_run_and_retry_does_not_erase_new_work() {
        let path = test_path();
        let mut db = CounterDatabase::open(&path, &CounterSession::default(), false).unwrap();
        db.apply("start_positive", 1_000, 100, true, None, None)
            .unwrap();
        let reset_id = Uuid::new_v4().to_string();
        db.apply("reset", 3_000, 2_100, true, None, Some(&reset_id))
            .unwrap();
        assert!(!db.snapshot(3_000, 2_100).unwrap().running);
        assert!(db.history(10).unwrap().is_empty());
        db.apply("start_negative", 4_000, 3_100, true, None, None)
            .unwrap();
        db.apply("reset", 5_000, 4_100, true, None, Some(&reset_id))
            .unwrap();
        assert!(db.snapshot(5_000, 4_100).unwrap().running);
        assert_eq!(db.history(10).unwrap().len(), 1);
        drop(db);
        let reopened = CounterDatabase::open(&path, &CounterSession::default(), false).unwrap();
        assert_eq!(reopened.history(10).unwrap().len(), 1);
        drop(reopened);
        std::fs::remove_file(path).unwrap();
    }

    #[test]
    fn version_one_database_adds_reset_retry_marker() {
        let path = test_path();
        let db = CounterDatabase::open(&path, &CounterSession::default(), false).unwrap();
        db.connection
            .execute_batch(
                "ALTER TABLE counter_state DROP COLUMN last_reset_action_id;
             PRAGMA user_version = 1;",
            )
            .unwrap();
        drop(db);
        let mut migrated = CounterDatabase::open(&path, &CounterSession::default(), false).unwrap();
        migrated
            .apply("reset", 1_000, 100, true, None, None)
            .unwrap();
        let version: i64 = migrated
            .connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .unwrap();
        assert_eq!(version, 2);
        drop(migrated);
        std::fs::remove_file(path).unwrap();
    }

    #[test]
    fn duplicate_event_id_and_rolled_back_stop_do_not_change_state() {
        let path = test_path();
        let mut db = CounterDatabase::open(&path, &CounterSession::default(), false).unwrap();
        let tx = db.transaction().unwrap();
        let action_id = Uuid::new_v4().to_string();
        let active =
            CounterDatabase::stage(&tx, "start_positive", 1_000, 0, true, None, &action_id)
                .unwrap();
        assert!(active.active_run_id.is_some());
        assert!(
            !CounterDatabase::stage(&tx, "start_positive", 1_000, 0, true, None, &action_id)
                .unwrap()
                .applied
        );
        tx.commit().unwrap();
        db.committed(active.active_run_id, 100);
        assert_eq!(db.history(10).unwrap().len(), 1);
        assert!(db
            .apply("stop", 2_000, 1_100, true, None, Some(&action_id))
            .is_err());
        db.apply("start_positive", 2_000, 1_100, true, None, Some(&action_id))
            .unwrap();
        assert_eq!(db.snapshot(2_000, 1_100).unwrap().value_ms, 1_000);
        assert_eq!(db.history(10).unwrap().len(), 1);

        let tx = db.transaction().unwrap();
        CounterDatabase::stage(
            &tx,
            "stop",
            2_000,
            1_000,
            true,
            Some("disabled"),
            &Uuid::new_v4().to_string(),
        )
        .unwrap();
        drop(tx); // JSON save failed, so the SQLite stop must roll back.
        assert!(db.snapshot(2_000, 1_100).unwrap().running);
        assert_eq!(db.snapshot(2_000, 1_100).unwrap().value_ms, 1_000);
        drop(db);
        std::fs::remove_file(path).unwrap();
    }
}
