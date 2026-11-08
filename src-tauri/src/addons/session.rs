use serde::{Deserialize, Serialize};

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
