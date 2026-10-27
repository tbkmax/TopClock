use super::{apply_timer_action, save_current_position, show_settings, ClockState};
use crate::settings::ShortcutSettings;
use std::{ptr, sync::Arc, thread, time::Duration};
use tauri::Emitter;
use windows_sys::Win32::UI::{
    Input::KeyboardAndMouse::{
        RegisterHotKey, UnregisterHotKey, MOD_ALT, MOD_CONTROL, MOD_NOREPEAT, MOD_SHIFT,
    },
    WindowsAndMessaging::{PeekMessageW, MSG, PM_NOREMOVE, PM_REMOVE, WM_HOTKEY},
};

fn parse_shortcut(binding: &str) -> Option<(u32, u32)> {
    if binding.is_empty() {
        return None;
    }
    let mut modifiers = MOD_NOREPEAT;
    let mut key = None;
    for part in binding.split('+') {
        match part.trim().to_ascii_lowercase().as_str() {
            "ctrl" => modifiers |= MOD_CONTROL,
            "alt" => modifiers |= MOD_ALT,
            "shift" => modifiers |= MOD_SHIFT,
            value => {
                if key.is_some() {
                    return None;
                }
                let vk = if value.len() == 1 {
                    let ch = value.chars().next()?;
                    match ch {
                        'a'..='z' => ch.to_ascii_uppercase() as u32,
                        '0'..='9' => ch as u32,
                        ',' => 0xBC,
                        '.' => 0xBE,
                        '/' => 0xBF,
                        ';' => 0xBA,
                        '\'' => 0xDE,
                        '[' => 0xDB,
                        ']' => 0xDD,
                        '\\' => 0xDC,
                        '-' => 0xBD,
                        '=' => 0xBB,
                        '`' => 0xC0,
                        _ => return None,
                    }
                } else if let Some(number) =
                    value.strip_prefix('f').and_then(|n| n.parse::<u32>().ok())
                {
                    if !(1..=24).contains(&number) {
                        return None;
                    }
                    0x70 + number - 1
                } else {
                    match value {
                        "space" => 0x20,
                        "enter" => 0x0D,
                        "tab" => 0x09,
                        "escape" => 0x1B,
                        "backspace" => 0x08,
                        "delete" => 0x2E,
                        "insert" => 0x2D,
                        "home" => 0x24,
                        "end" => 0x23,
                        "pageup" => 0x21,
                        "pagedown" => 0x22,
                        "arrowleft" => 0x25,
                        "arrowup" => 0x26,
                        "arrowright" => 0x27,
                        "arrowdown" => 0x28,
                        _ => return None,
                    }
                };
                key = Some(vk);
            }
        }
    }
    if modifiers == MOD_NOREPEAT {
        return None;
    }
    Some((modifiers, key?))
}

pub(super) fn start_hotkeys(app: tauri::AppHandle, state: Arc<ClockState>) {
    thread::spawn(move || {
        // Ensure this thread has a Windows message queue before registering thread hotkeys.
        let mut queue_message: MSG = unsafe { std::mem::zeroed() };
        unsafe {
            PeekMessageW(&mut queue_message, ptr::null_mut(), 0, 0, PM_NOREMOVE);
        }
        let mut current: Option<(ShortcutSettings, bool)> = None;
        let mut registered = Vec::new();
        loop {
            let desired = {
                let config = state.config.lock().unwrap();
                (
                    config.settings.shortcuts.clone(),
                    config
                        .settings
                        .addons
                        .iter()
                        .any(|a| a.kind == "timer" && a.enabled),
                )
            };
            if current.as_ref() != Some(&desired) {
                for id in registered.drain(..) {
                    unsafe {
                        UnregisterHotKey(ptr::null_mut(), id);
                    }
                }
                let bindings = [
                    (
                        1,
                        "Open Settings",
                        if desired.0.open_settings_enabled {
                            desired.0.open_settings.as_str()
                        } else {
                            ""
                        },
                    ),
                    (
                        2,
                        "Quit TopClock",
                        if desired.0.quit_enabled {
                            desired.0.quit.as_str()
                        } else {
                            ""
                        },
                    ),
                    (
                        3,
                        "Timer Start / Pause",
                        if desired.1 && desired.0.timer_toggle_enabled {
                            desired.0.timer_toggle.as_str()
                        } else {
                            ""
                        },
                    ),
                    (
                        4,
                        "Timer Reset",
                        if desired.1 && desired.0.timer_reset_enabled {
                            desired.0.timer_reset.as_str()
                        } else {
                            ""
                        },
                    ),
                ];
                let mut errors = Vec::new();
                for (id, label, binding) in bindings {
                    if binding.is_empty() {
                        continue;
                    }
                    match parse_shortcut(binding) {
                        Some((modifiers, vk)) => {
                            if unsafe { RegisterHotKey(ptr::null_mut(), id, modifiers, vk) } != 0 {
                                registered.push(id);
                            } else {
                                errors.push(format!("{label}: {binding} is unavailable or conflicts with another application"));
                            }
                        }
                        None => errors.push(format!(
                            "{label}: {binding} is not a supported system-wide shortcut"
                        )),
                    }
                }
                *state.hotkey_errors.lock().unwrap() = errors.clone();
                let _ = app.emit("hotkey-errors-changed", errors);
                current = Some(desired);
            }

            let mut message: MSG = unsafe { std::mem::zeroed() };
            while unsafe { PeekMessageW(&mut message, ptr::null_mut(), 0, 0, PM_REMOVE) } != 0 {
                if message.message != WM_HOTKEY {
                    continue;
                }
                match message.wParam as i32 {
                    1 => show_settings(&app),
                    2 => {
                        save_current_position(&app);
                        app.exit(0);
                        return;
                    }
                    3 => {
                        let _ = apply_timer_action(&app, "toggle");
                    }
                    4 => {
                        let _ = apply_timer_action(&app, "reset");
                    }
                    _ => {}
                }
            }
            thread::sleep(Duration::from_millis(20));
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_common_global_shortcuts() {
        assert_eq!(
            parse_shortcut("Ctrl+,"),
            Some((MOD_CONTROL | MOD_NOREPEAT, 0xBC))
        );
        assert_eq!(
            parse_shortcut("Ctrl+Shift+S"),
            Some((MOD_CONTROL | MOD_SHIFT | MOD_NOREPEAT, 0x53))
        );
        assert!(parse_shortcut("Q").is_none());
        assert!(parse_shortcut("Ctrl+InvalidKey").is_none());
    }
}
