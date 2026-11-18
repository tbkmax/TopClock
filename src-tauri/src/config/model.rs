use crate::addons::{AddonInstance, CounterSession, TimerSession};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Clone, Copy, Serialize, Deserialize)]
pub(crate) struct ClockPosition {
    pub(crate) x: i32,
    pub(crate) y: i32,
}

#[derive(Clone, Serialize, Deserialize)]
pub(crate) struct DisplayPreference {
    #[serde(default = "default_display_visible")]
    pub(crate) visible: bool,
    #[serde(default)]
    pub(crate) position: Option<ClockPosition>,
}

impl Default for DisplayPreference {
    fn default() -> Self {
        Self {
            visible: true,
            position: None,
        }
    }
}

fn default_display_visible() -> bool {
    true
}

#[derive(Default, Serialize, Deserialize)]
pub(crate) struct PersistedConfig {
    #[serde(flatten)]
    pub(crate) settings: ClockSettings,
    pub(crate) position: Option<ClockPosition>,
    #[serde(default)]
    pub(crate) displays: HashMap<String, DisplayPreference>,
    #[serde(default)]
    pub(crate) timer_session: TimerSession,
    #[serde(default)]
    pub(crate) progress_timer_sessions: HashMap<String, TimerSession>,
    #[serde(default)]
    pub(crate) counter_session: CounterSession,
}

fn default_auto_check_updates() -> bool {
    true
}

fn default_modifier() -> String {
    "Ctrl".into()
}

fn default_palette_key() -> String {
    "Alt".into()
}

fn default_open_settings() -> String {
    "Ctrl+,".into()
}

fn default_quit() -> String {
    "Ctrl+Alt+Q".into()
}

fn default_timer_toggle() -> String {
    "Ctrl+Shift+S".into()
}

fn default_timer_reset() -> String {
    "Ctrl+Shift+R".into()
}

#[derive(Clone, PartialEq, Serialize, Deserialize)]
pub(crate) struct ShortcutSettings {
    #[serde(default = "default_modifier")]
    pub(crate) interaction_modifier: String,
    #[serde(default = "default_palette_key")]
    pub(crate) palette_key: String,
    #[serde(default = "default_open_settings")]
    pub(crate) open_settings: String,
    #[serde(default)]
    pub(crate) open_settings_enabled: bool,
    #[serde(default = "default_quit")]
    pub(crate) quit: String,
    #[serde(default)]
    pub(crate) quit_enabled: bool,
    #[serde(default = "default_timer_toggle")]
    pub(crate) timer_toggle: String,
    #[serde(default)]
    pub(crate) timer_toggle_enabled: bool,
    #[serde(default = "default_timer_reset")]
    pub(crate) timer_reset: String,
    #[serde(default)]
    pub(crate) timer_reset_enabled: bool,
}

impl Default for ShortcutSettings {
    fn default() -> Self {
        Self {
            interaction_modifier: default_modifier(),
            palette_key: default_palette_key(),
            open_settings: default_open_settings(),
            open_settings_enabled: false,
            quit: default_quit(),
            quit_enabled: false,
            timer_toggle: default_timer_toggle(),
            timer_toggle_enabled: false,
            timer_reset: default_timer_reset(),
            timer_reset_enabled: false,
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub(crate) struct ClockSettings {
    #[serde(default = "default_language")]
    pub(crate) language: String,
    pub(crate) colon_animation: String,
    pub(crate) number_animation: String,
    pub(crate) font_color: String,
    pub(crate) outline_color: String,
    pub(crate) outline_width: f32,
    pub(crate) font_size: u8,
    pub(crate) font_family: String,
    pub(crate) twenty_four_hour: bool,
    pub(crate) show_ampm: bool,
    pub(crate) time_layout: String,
    #[serde(default = "default_auto_check_updates")]
    pub(crate) auto_check_updates: bool,
    #[serde(default)]
    pub(crate) palette_enabled: bool,
    #[serde(default)]
    pub(crate) shortcuts: ShortcutSettings,
    #[serde(default, skip_serializing)]
    pub(crate) timer_addon_enabled: bool,
    #[serde(default)]
    pub(crate) addons: Vec<AddonInstance>,
    #[serde(default, deserialize_with = "deserialize_addon_pairs")]
    pub(crate) addon_pairs: Vec<crate::addons::AddonPair>,
    #[serde(default = "default_counter_halo_intensity_percent")]
    pub(crate) counter_halo_intensity_percent: u8,
    #[serde(default)]
    pub(crate) timer_reset_warning_dismissed: bool,
    #[serde(default = "default_countdown_presets")]
    pub(crate) timer_countdown_presets: Vec<u16>,
    #[serde(default)]
    pub(crate) timer_preset_warning_dismissed: bool,
    #[serde(default = "default_countdown_presets")]
    pub(crate) progress_countdown_presets: Vec<u16>,
    #[serde(default)]
    pub(crate) progress_preset_warning_dismissed: bool,
}

fn deserialize_addon_pairs<'de, D>(
    deserializer: D,
) -> Result<Vec<crate::addons::AddonPair>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let value = serde_json::Value::deserialize(deserializer)?;
    Ok(serde_json::from_value(value).unwrap_or_default())
}

impl Default for ClockSettings {
    fn default() -> Self {
        Self {
            language: default_language(),
            colon_animation: "pulse".into(),
            number_animation: "tick".into(),
            font_color: "#ffffff".into(),
            outline_color: "#000000".into(),
            outline_width: 1.5,
            font_size: 42,
            font_family: "Segoe UI".into(),
            twenty_four_hour: true,
            show_ampm: true,
            time_layout: "hms".into(),
            auto_check_updates: true,
            palette_enabled: false,
            shortcuts: ShortcutSettings::default(),
            timer_addon_enabled: false,
            addons: Vec::new(),
            addon_pairs: Vec::new(),
            counter_halo_intensity_percent: default_counter_halo_intensity_percent(),
            timer_reset_warning_dismissed: false,
            timer_countdown_presets: default_countdown_presets(),
            timer_preset_warning_dismissed: false,
            progress_countdown_presets: default_countdown_presets(),
            progress_preset_warning_dismissed: false,
        }
    }
}

fn default_language() -> String {
    "system".into()
}

fn default_countdown_presets() -> Vec<u16> {
    vec![10, 30, 60]
}

fn default_counter_halo_intensity_percent() -> u8 {
    50
}
