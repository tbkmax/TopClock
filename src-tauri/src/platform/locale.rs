#[cfg(windows)]
fn windows_user_locale() -> Option<String> {
    use std::ptr::null_mut;
    use windows_sys::Win32::Globalization::{
        GetUserDefaultLocaleName, GetUserPreferredUILanguages, MUI_LANGUAGE_NAME,
    };

    let mut language_count = 0u32;
    let mut buffer_length = 0u32;
    unsafe {
        GetUserPreferredUILanguages(
            MUI_LANGUAGE_NAME,
            &mut language_count,
            null_mut(),
            &mut buffer_length,
        );
    }
    if buffer_length > 1 {
        let mut languages = vec![0u16; buffer_length as usize];
        let ok = unsafe {
            GetUserPreferredUILanguages(
                MUI_LANGUAGE_NAME,
                &mut language_count,
                languages.as_mut_ptr(),
                &mut buffer_length,
            )
        };
        if ok != 0 && language_count > 0 {
            if let Some(end) = languages.iter().position(|unit| *unit == 0) {
                if let Ok(first) = String::from_utf16(&languages[..end]) {
                    if !first.is_empty() {
                        return Some(first);
                    }
                }
            }
        }
    }

    // Regional format is only a fallback when Windows cannot report its UI language.
    let mut name = [0u16; 85];
    let length = unsafe { GetUserDefaultLocaleName(name.as_mut_ptr(), name.len() as i32) };
    if length <= 1 {
        return None;
    }
    String::from_utf16(&name[..length as usize - 1]).ok()
}

#[tauri::command]
pub(crate) fn get_system_locale() -> String {
    #[cfg(windows)]
    {
        windows_user_locale().unwrap_or_else(|| "en".into())
    }
    #[cfg(not(windows))]
    {
        "en".into()
    }
}

pub(crate) fn effective_language(preference: &str, system_locale: &str) -> &'static str {
    let locale = if preference == "system" {
        system_locale
    } else {
        preference
    };
    let lower = locale.to_ascii_lowercase();
    if lower.starts_with("ja") {
        "ja"
    } else if lower.starts_with("zh") {
        if lower.contains("hant")
            || lower.starts_with("zh-tw")
            || lower.starts_with("zh-hk")
            || lower.starts_with("zh-mo")
        {
            "zh-Hant"
        } else {
            "zh-Hans"
        }
    } else {
        "en"
    }
}

#[cfg(test)]
mod tests {
    use super::effective_language;

    #[test]
    fn maps_windows_chinese_and_japanese_locales() {
        assert_eq!(effective_language("system", "zh-CN"), "zh-Hans");
        assert_eq!(effective_language("system", "zh-TW"), "zh-Hant");
        assert_eq!(effective_language("system", "zh-HK"), "zh-Hant");
        assert_eq!(effective_language("system", "ja-JP"), "ja");
        assert_eq!(effective_language("system", "fr-FR"), "en");
        assert_eq!(effective_language("zh-Hant", "ja-JP"), "zh-Hant");
    }
}
