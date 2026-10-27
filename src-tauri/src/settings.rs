use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Serialize, Deserialize)]
pub(crate) struct ClockPosition {
    pub(crate) x: i32,
    pub(crate) y: i32,
}

#[derive(Default, Serialize, Deserialize)]
pub(crate) struct PersistedConfig {
    #[serde(flatten)]
    pub(crate) settings: ClockSettings,
    pub(crate) position: Option<ClockPosition>,
}

fn default_auto_check_updates() -> bool {
    true
}

fn default_modifier() -> String {
    "Ctrl".into()
}

fn default_open_settings() -> String {
    "Ctrl+,".into()
}

fn default_quit() -> String {
    "Ctrl+Q".into()
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
    #[serde(default = "default_open_settings")]
    pub(crate) open_settings: String,
    #[serde(default = "default_quit")]
    pub(crate) quit: String,
    #[serde(default = "default_timer_toggle")]
    pub(crate) timer_toggle: String,
    #[serde(default = "default_timer_reset")]
    pub(crate) timer_reset: String,
}

impl Default for ShortcutSettings {
    fn default() -> Self {
        Self {
            interaction_modifier: default_modifier(),
            open_settings: default_open_settings(),
            quit: default_quit(),
            timer_toggle: default_timer_toggle(),
            timer_reset: default_timer_reset(),
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub(crate) struct ClockSettings {
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
    pub(crate) shortcuts: ShortcutSettings,
    #[serde(default)]
    pub(crate) timer_addon_enabled: bool,
}

impl Default for ClockSettings {
    fn default() -> Self {
        Self {
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
            shortcuts: ShortcutSettings::default(),
            timer_addon_enabled: false,
        }
    }
}

fn valid_color(value: &str) -> bool {
    value.len() == 7
        && value.starts_with('#')
        && value[1..].bytes().all(|byte| byte.is_ascii_hexdigit())
}

fn valid_shortcut_string(value: &str) -> bool {
    value.chars().count() <= 40 && value.chars().all(|ch| !ch.is_control())
}

pub(crate) fn valid_settings(settings: &ClockSettings) -> bool {
    valid_color(&settings.font_color)
        && valid_color(&settings.outline_color)
        && (24..=200).contains(&settings.font_size)
        && settings.outline_width.is_finite()
        && (0.0..=4.0).contains(&settings.outline_width)
        && !settings.font_family.is_empty()
        && settings.font_family.chars().count() <= 80
        && settings.font_family.chars().all(|ch| !ch.is_control())
        && matches!(
            settings.time_layout.as_str(),
            "hms" | "hm" | "ms" | "h" | "m" | "s"
        )
        && matches!(
            settings.colon_animation.as_str(),
            "pulse" | "fade" | "slide" | "none"
        )
        && matches!(
            settings.number_animation.as_str(),
            "tick" | "fade" | "slide" | "none"
        )
        && matches!(
            settings.shortcuts.interaction_modifier.as_str(),
            "Ctrl" | "Alt" | "Shift"
        )
        && valid_shortcut_string(&settings.shortcuts.open_settings)
        && valid_shortcut_string(&settings.shortcuts.quit)
        && valid_shortcut_string(&settings.shortcuts.timer_toggle)
        && valid_shortcut_string(&settings.shortcuts.timer_reset)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn settings_and_position_round_trip_together() {
        let mut settings = ClockSettings::default();
        settings.outline_width = 3.5;
        settings.font_family = "Times New Roman".into();
        settings.twenty_four_hour = false;
        settings.show_ampm = false;
        settings.time_layout = "ms".into();
        settings.colon_animation = "none".into();
        settings.number_animation = "slide".into();
        let config = PersistedConfig {
            settings,
            position: Some(ClockPosition { x: -120, y: 240 }),
        };
        let loaded: PersistedConfig =
            serde_json::from_str(&serde_json::to_string(&config).unwrap()).unwrap();
        let position = loaded.position.unwrap();
        assert_eq!((position.x, position.y), (-120, 240));
        assert_eq!(loaded.settings.outline_width, 3.5);
        assert_eq!(loaded.settings.font_family, "Times New Roman");
        assert_eq!(loaded.settings.time_layout, "ms");
        assert_eq!(loaded.settings.colon_animation, "none");
        assert_eq!(loaded.settings.number_animation, "slide");
        assert_eq!(loaded.settings.shortcuts.interaction_modifier, "Ctrl");
        assert_eq!(loaded.settings.shortcuts.quit, "Ctrl+Q");
        assert_eq!(loaded.settings.shortcuts.open_settings, "Ctrl+,");
        assert!(loaded.settings.auto_check_updates);
        assert!(valid_settings(&loaded.settings));
    }

    #[test]
    fn shortcut_settings_round_trip_and_validation() {
        let mut settings = ClockSettings::default();
        settings.shortcuts.interaction_modifier = "Alt".into();
        settings.shortcuts.quit = "".into(); // Allowed (no shortcut)
        settings.shortcuts.open_settings = "Ctrl+Shift+P".into();
        assert!(valid_settings(&settings));

        settings.shortcuts.interaction_modifier = "InvalidKey".into();
        assert!(!valid_settings(&settings));
        settings.shortcuts.interaction_modifier = "Shift".into();
        assert!(valid_settings(&settings));

        settings.shortcuts.quit = "VeryLongShortcutKeyStringThatExceedsTheMaximumAllowedCharactersLimit".into();
        assert!(!valid_settings(&settings));
    }

    #[test]
    fn rejects_invalid_new_settings() {
        let mut settings = ClockSettings::default();
        settings.font_size = 200;
        assert!(valid_settings(&settings));
        settings.font_size = 201;
        assert!(!valid_settings(&settings));
        settings.font_size = 42;
        settings.outline_width = f32::NAN;
        assert!(!valid_settings(&settings));
        settings.outline_width = 1.5;
        settings.font_family = "Arial\ncolor:red".into();
        assert!(!valid_settings(&settings));
        settings.font_family = "Segoe UI".into();
        settings.time_layout = "invalid".into();
        assert!(!valid_settings(&settings));
        settings.time_layout = "hms".into();
        settings.colon_animation = "invalid".into();
        assert!(!valid_settings(&settings));
        settings.colon_animation = "pulse".into();
        settings.number_animation = "invalid".into();
        assert!(!valid_settings(&settings));
    }
}
