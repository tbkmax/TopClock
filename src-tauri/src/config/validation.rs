use super::model::ClockSettings;
use crate::addons::{valid_addons, valid_pairs};

pub(crate) fn valid_countdown_presets(presets: &[u16]) -> bool {
    presets.len() <= 8
        && presets.iter().all(|minutes| (1..=5999).contains(minutes))
        && presets.windows(2).all(|pair| pair[0] < pair[1])
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
    matches!(
        settings.language.as_str(),
        "system" | "en" | "zh-Hans" | "zh-Hant" | "ja"
    ) && valid_color(&settings.font_color)
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
        && matches!(
            settings.shortcuts.palette_key.as_str(),
            "" | "Ctrl" | "Alt" | "Shift"
        )
        && (!settings.palette_enabled
            || (!settings.shortcuts.palette_key.is_empty()
                && settings.shortcuts.palette_key != settings.shortcuts.interaction_modifier))
        && valid_shortcut_string(&settings.shortcuts.open_settings)
        && valid_shortcut_string(&settings.shortcuts.quit)
        && valid_shortcut_string(&settings.shortcuts.timer_toggle)
        && valid_shortcut_string(&settings.shortcuts.timer_reset)
        && valid_countdown_presets(&settings.timer_countdown_presets)
        && valid_countdown_presets(&settings.progress_countdown_presets)
        && settings.default_transparency_percent <= 100
        && settings.counter_halo_intensity_percent <= 100
        && valid_addons(&settings.addons)
        && valid_pairs(&settings.addons, &settings.addon_pairs)
}
