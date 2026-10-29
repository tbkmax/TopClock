use webview2_com_sys::Microsoft::Web::WebView2::Win32::GetAvailableCoreWebView2BrowserVersionString;
use windows::core::{PCWSTR, PWSTR};
use windows_sys::Win32::{
    System::Com::CoTaskMemFree,
    UI::WindowsAndMessaging::{MessageBoxW, MB_ICONERROR, MB_OK},
};

const DOWNLOAD_URL: &str = "https://developer.microsoft.com/en-us/microsoft-edge/webview2/";

pub(crate) fn ensure_available() {
    let mut version = PWSTR::null();
    let result =
        unsafe { GetAvailableCoreWebView2BrowserVersionString(PCWSTR::null(), &mut version) };
    if !version.is_null() {
        unsafe { CoTaskMemFree(version.0.cast()) };
    }
    if result.is_ok() {
        return;
    }

    let message = format!(
        "TopClock needs the Microsoft Edge WebView2 Runtime to show its clock and Settings.\n\nInstall the Evergreen Runtime from:\n{DOWNLOAD_URL}\n\nThen start TopClock again.\n\nRuntime check: {}",
        result.unwrap_err()
    );
    let title: Vec<u16> = "TopClock needs WebView2"
        .encode_utf16()
        .chain([0])
        .collect();
    let body: Vec<u16> = message.encode_utf16().chain([0]).collect();
    unsafe {
        MessageBoxW(
            std::ptr::null_mut(),
            body.as_ptr(),
            title.as_ptr(),
            MB_OK | MB_ICONERROR,
        );
    }
    std::process::exit(1);
}
