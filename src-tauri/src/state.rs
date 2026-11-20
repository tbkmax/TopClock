use crate::addons::counter_db::CounterDatabase;
use crate::config::model::PersistedConfig;
use crate::displays::ActiveDisplay;
use crate::windows::menu_window::MenuRequest;
use std::{
    collections::{HashMap, HashSet},
    path::PathBuf,
    sync::{atomic::AtomicUsize, Mutex},
};

pub(crate) struct ClockState {
    pub(crate) menu_open: Mutex<HashSet<String>>,
    pub(crate) menu_request: Mutex<Option<MenuRequest>>,
    pub(crate) config: Mutex<PersistedConfig>,
    pub(crate) counter_db: Mutex<CounterDatabase>,
    pub(crate) settings_path: PathBuf,
    pub(crate) hotkey_errors: Mutex<Vec<String>>,
    pub(crate) active_displays: Mutex<HashMap<String, ActiveDisplay>>,
    pub(crate) main_display_id: Mutex<Option<String>>,
    pub(crate) next_window_id: AtomicUsize,
    pub(crate) next_menu_request_id: AtomicUsize,
}

impl ClockState {
    pub(crate) fn new(
        config: PersistedConfig,
        settings_path: PathBuf,
        counter_db: CounterDatabase,
    ) -> Self {
        Self {
            menu_open: Mutex::new(HashSet::new()),
            menu_request: Mutex::new(None),
            config: Mutex::new(config),
            counter_db: Mutex::new(counter_db),
            settings_path,
            hotkey_errors: Mutex::new(Vec::new()),
            active_displays: Mutex::new(HashMap::new()),
            main_display_id: Mutex::new(None),
            next_window_id: AtomicUsize::new(1),
            next_menu_request_id: AtomicUsize::new(1),
        }
    }
}
