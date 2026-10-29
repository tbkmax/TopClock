use windows::{
    core::HSTRING,
    ApplicationModel::{StartupTask, StartupTaskState},
};
use windows_sys::Win32::{
    Foundation::{APPMODEL_ERROR_NO_PACKAGE, ERROR_INSUFFICIENT_BUFFER, ERROR_SUCCESS},
    Storage::Packaging::Appx::GetCurrentPackageFullName,
};
use winreg::{
    enums::{HKEY_CURRENT_USER, KEY_READ, KEY_WRITE},
    RegKey,
};

const STARTUP_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
const STARTUP_NAME: &str = "TopClock";
const STARTUP_TASK_ID: &str = "TopClockStartup";

#[tauri::command]
pub(crate) fn is_packaged() -> Result<bool, String> {
    let mut length = 0;
    // A null buffer is the documented probe: packaged apps report the required length.
    let result = unsafe { GetCurrentPackageFullName(&mut length, std::ptr::null_mut()) };
    match result {
        ERROR_INSUFFICIENT_BUFFER | ERROR_SUCCESS => Ok(true),
        APPMODEL_ERROR_NO_PACKAGE => Ok(false),
        _ => Err(format!(
            "Could not determine package identity (Windows error {result})"
        )),
    }
}

async fn packaged_startup_task() -> Result<StartupTask, String> {
    StartupTask::GetAsync(&HSTRING::from(STARTUP_TASK_ID))
        .map_err(|error| error.to_string())?
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) async fn get_startup_enabled() -> Result<bool, String> {
    if is_packaged()? {
        let state = packaged_startup_task()
            .await?
            .State()
            .map_err(|error| error.to_string())?;
        return Ok(state == StartupTaskState::Enabled || state == StartupTaskState::EnabledByPolicy);
    }
    Ok(RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey_with_flags(STARTUP_KEY, KEY_READ)
        .and_then(|key| key.get_value::<String, _>(STARTUP_NAME))
        .is_ok())
}

#[tauri::command]
pub(crate) async fn set_startup_enabled(enabled: bool) -> Result<(), String> {
    if is_packaged()? {
        let task = packaged_startup_task().await?;
        if enabled {
            let state = task.State().map_err(|error| error.to_string())?;
            if state == StartupTaskState::Enabled || state == StartupTaskState::EnabledByPolicy {
                return Ok(());
            }
            if state == StartupTaskState::DisabledByUser {
                return Err("Windows disabled TopClock at sign-in. Re-enable it in Windows Settings > Apps > Startup.".into());
            }
            let result = task
                .RequestEnableAsync()
                .map_err(|error| error.to_string())?
                .await
                .map_err(|error| error.to_string())?;
            return if result == StartupTaskState::Enabled
                || result == StartupTaskState::EnabledByPolicy
            {
                Ok(())
            } else {
                Err("Windows did not enable TopClock at sign-in. Check Windows Settings > Apps > Startup.".into())
            };
        }
        return task.Disable().map_err(|error| error.to_string());
    }
    let key = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey_with_flags(STARTUP_KEY, KEY_READ | KEY_WRITE)
        .map_err(|error| error.to_string())?;
    if enabled {
        let executable = std::env::current_exe().map_err(|error| error.to_string())?;
        key.set_value(STARTUP_NAME, &format!("\"{}\"", executable.display()))
            .map_err(|error| error.to_string())
    } else {
        match key.delete_value(STARTUP_NAME) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(error) => Err(error.to_string()),
        }
    }
}
