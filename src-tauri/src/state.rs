use crate::displays::ActiveDisplay;
use crate::settings::PersistedConfig;
use std::{
    collections::{HashMap, HashSet},
    path::PathBuf,
    sync::{atomic::AtomicUsize, Mutex},
};

pub(crate) struct ClockState {
    pub(crate) menu_open: Mutex<HashSet<String>>,
    pub(crate) config: Mutex<PersistedConfig>,
    pub(crate) settings_path: PathBuf,
    pub(crate) hotkey_errors: Mutex<Vec<String>>,
    pub(crate) active_displays: Mutex<HashMap<String, ActiveDisplay>>,
    pub(crate) main_display_id: Mutex<Option<String>>,
    pub(crate) next_window_id: AtomicUsize,
}

impl ClockState {
    pub(crate) fn new(config: PersistedConfig, settings_path: PathBuf) -> Self {
        Self {
            menu_open: Mutex::new(HashSet::new()),
            config: Mutex::new(config),
            settings_path,
            hotkey_errors: Mutex::new(Vec::new()),
            active_displays: Mutex::new(HashMap::new()),
            main_display_id: Mutex::new(None),
            next_window_id: AtomicUsize::new(1),
        }
    }
}
