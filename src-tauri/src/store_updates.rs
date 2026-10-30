use std::sync::mpsc::sync_channel;
use tauri::WebviewWindow;
use windows::{
    core::{AgileReference, Interface},
    Services::Store::{StoreContext, StorePackageUpdateState},
    Win32::{
        Foundation::{HWND, RPC_E_CHANGED_MODE},
        System::WinRT::{RoInitialize, RoUninitialize, RO_INIT_MULTITHREADED},
        UI::Shell::IInitializeWithWindow,
    },
};

// StoreContext's desktop dialogs need a real owner window, and Store calls
// that create their async operations must start on the UI thread.
async fn on_ui_thread<T: Send + 'static>(
    window: &WebviewWindow,
    action: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    let (sender, receiver) = sync_channel(1);
    window
        .run_on_main_thread(move || {
            let _ = sender.send(action());
        })
        .map_err(|error| error.to_string())?;
    tauri::async_runtime::spawn_blocking(move || receiver.recv())
        .await
        .map_err(|error| error.to_string())?
        .map_err(|error| error.to_string())?
}

struct WinRtApartment(bool);

impl WinRtApartment {
    fn initialize() -> Result<Self, String> {
        match unsafe { RoInitialize(RO_INIT_MULTITHREADED) } {
            Ok(()) => Ok(Self(true)),
            // A worker that already has an STA can still use its current apartment.
            Err(error) if error.code() == RPC_E_CHANGED_MODE => Ok(Self(false)),
            Err(error) => Err(error.to_string()),
        }
    }
}

impl Drop for WinRtApartment {
    fn drop(&mut self) {
        if self.0 {
            unsafe { RoUninitialize() };
        }
    }
}

async fn on_store_worker<T: Send + 'static>(
    action: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let _apartment = WinRtApartment::initialize()?;
        action()
    })
    .await
    .map_err(|error| error.to_string())?
}

fn store_context(hwnd_raw: isize) -> Result<StoreContext, String> {
    let context = StoreContext::GetDefault().map_err(|error| error.to_string())?;
    let owner: IInitializeWithWindow = context.cast().map_err(|error| error.to_string())?;
    unsafe { owner.Initialize(HWND(hwnd_raw as *mut _)) }.map_err(|error| error.to_string())?;
    Ok(context)
}

fn settings_hwnd(window: &WebviewWindow) -> Result<isize, String> {
    if window.label() != "settings" {
        return Err("Store updates can only be requested from Settings".into());
    }
    window
        .hwnd()
        .map(|hwnd| hwnd.0 as isize)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) async fn check_store_updates(window: WebviewWindow) -> Result<bool, String> {
    if !crate::startup::is_packaged()? {
        return Err("Microsoft Store updates require a packaged installation".into());
    }
    let hwnd_raw = settings_hwnd(&window)?;
    let operation = on_ui_thread(&window, move || {
        store_context(hwnd_raw)?
            .GetAppAndOptionalStorePackageUpdatesAsync()
            .map_err(|error| error.to_string())
    })
    .await?;
    on_store_worker(move || {
        let updates = operation.join().map_err(|error| error.to_string())?;
        Ok(updates.Size().map_err(|error| error.to_string())? > 0)
    })
    .await
}

#[tauri::command]
pub(crate) async fn install_store_update(window: WebviewWindow) -> Result<String, String> {
    if !crate::startup::is_packaged()? {
        return Err("Microsoft Store updates require a packaged installation".into());
    }
    let hwnd_raw = settings_hwnd(&window)?;
    let (context, check_operation) = on_ui_thread(&window, move || {
        let context = store_context(hwnd_raw)?;
        let operation = context
            .GetAppAndOptionalStorePackageUpdatesAsync()
            .map_err(|error| error.to_string())?;
        Ok((context, operation))
    })
    .await?;
    let updates = on_store_worker(move || {
        let view = check_operation.join().map_err(|error| error.to_string())?;
        if view.Size().map_err(|error| error.to_string())? == 0 {
            return Ok(None);
        }
        AgileReference::new(&view)
            .map(Some)
            .map_err(|error| error.to_string())
    })
    .await?;
    let Some(updates) = updates else {
        return Ok("up_to_date".into());
    };
    let install_operation = on_ui_thread(&window, move || {
        let updates = updates.resolve().map_err(|error| error.to_string())?;
        context
            .RequestDownloadAndInstallStorePackageUpdatesAsync(&updates)
            .map_err(|error| error.to_string())
    })
    .await?;
    on_store_worker(move || {
        let result = install_operation
            .join()
            .map_err(|error| error.to_string())?;
        match result.OverallState().map_err(|error| error.to_string())? {
            StorePackageUpdateState::Completed => Ok("completed".into()),
            StorePackageUpdateState::Canceled => Ok("canceled".into()),
            state => Err(format!(
                "Microsoft Store could not complete the update (state {}).",
                state.0
            )),
        }
    })
    .await
}
