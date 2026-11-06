use std::{io, time::Duration};
use tauri::WebviewWindow;
use windows_sys::Win32::{
    Foundation::HWND,
    UI::WindowsAndMessaging::{
        IsIconic, IsWindowVisible, SetWindowPos, HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE,
        SWP_NOOWNERZORDER, SWP_NOSIZE,
    },
};

pub(crate) const REFRESH_INTERVAL: Duration = Duration::from_secs(2);

pub(crate) fn schedule_refresh(window: &WebviewWindow) -> tauri::Result<()> {
    let clock = window.clone();
    window.run_on_main_thread(move || {
        // Resolve the handle on its owning thread, not from a cached HWND that
        // could be destroyed/reused while a display is being disconnected.
        if let Ok(hwnd) = clock.hwnd() {
            if let Err(error) = refresh_topmost(hwnd.0 as HWND) {
                eprintln!("Unable to restore topmost clock {}: {error}", clock.label());
            }
        }
    })
}

// Call on the window's owning thread. Never show a hidden/disabled display,
// restore a minimized window, activate the clock, or rewrite its input styles.
fn refresh_topmost(hwnd: HWND) -> io::Result<()> {
    unsafe {
        if IsWindowVisible(hwnd) == 0 || IsIconic(hwnd) != 0 {
            return Ok(());
        }
        // Tao's set_always_on_top(true) can short-circuit on its cached flag.
        // Reassert the native Z order directly without a NOTOPMOST round trip.
        if SetWindowPos(
            hwnd,
            HWND_TOPMOST,
            0,
            0,
            0,
            0,
            SWP_NOACTIVATE | SWP_NOMOVE | SWP_NOSIZE | SWP_NOOWNERZORDER,
        ) == 0
        {
            return Err(io::Error::last_os_error());
        }
    }
    Ok(())
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;
    use windows_sys::Win32::{
        Foundation::RECT,
        UI::WindowsAndMessaging::{
            CreateWindowExW, DestroyWindow, GetForegroundWindow, GetWindow, GetWindowLongPtrW,
            GetWindowRect, SetLayeredWindowAttributes, ShowWindow, GWL_EXSTYLE, GW_HWNDPREV,
            HWND_NOTOPMOST, LWA_ALPHA, SW_HIDE, SW_SHOWMINNOACTIVE, SW_SHOWNOACTIVATE,
            WS_EX_LAYERED, WS_EX_TOOLWINDOW, WS_EX_TOPMOST, WS_EX_TRANSPARENT, WS_POPUP,
        },
    };

    struct TestWindow(HWND);

    impl TestWindow {
        fn new() -> Self {
            let class: Vec<u16> = "STATIC\0".encode_utf16().collect();
            let hwnd = unsafe {
                CreateWindowExW(
                    WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW,
                    class.as_ptr(),
                    class.as_ptr(),
                    WS_POPUP,
                    -30000,
                    -30000,
                    10,
                    10,
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    std::ptr::null(),
                )
            };
            assert!(!hwnd.is_null(), "{}", io::Error::last_os_error());
            let window = Self(hwnd);
            // Test real visible-window Z ordering without displaying content.
            assert_ne!(
                unsafe { SetLayeredWindowAttributes(hwnd, 0, 0, LWA_ALPHA) },
                0
            );
            window
        }

        fn styles(&self) -> isize {
            unsafe { GetWindowLongPtrW(self.0, GWL_EXSTYLE) }
        }

        fn bounds(&self) -> (i32, i32, i32, i32) {
            let mut rect = RECT::default();
            assert_ne!(unsafe { GetWindowRect(self.0, &mut rect) }, 0);
            (rect.left, rect.top, rect.right, rect.bottom)
        }
    }

    impl Drop for TestWindow {
        fn drop(&mut self) {
            unsafe { DestroyWindow(self.0) };
        }
    }

    fn is_above(upper: HWND, lower: HWND) -> bool {
        let mut current = unsafe { GetWindow(lower, GW_HWNDPREV) };
        // Bound traversal because other desktop windows can change concurrently.
        for _ in 0..10000 {
            if current.is_null() {
                break;
            }
            if current == upper {
                return true;
            }
            current = unsafe { GetWindow(current, GW_HWNDPREV) };
        }
        false
    }

    #[test]
    fn recovers_demotion_and_competing_topmost_without_changing_input_or_geometry() {
        let clock = TestWindow::new();
        let competitor = TestWindow::new();
        unsafe {
            ShowWindow(clock.0, SW_SHOWNOACTIVATE);
            ShowWindow(competitor.0, SW_SHOWNOACTIVATE);
        }
        let bounds = clock.bounds();
        let styles = clock.styles() & !(WS_EX_TOPMOST as isize);
        let foreground = unsafe { GetForegroundWindow() };

        refresh_topmost(clock.0).unwrap();
        refresh_topmost(competitor.0).unwrap();
        assert!(is_above(competitor.0, clock.0));
        assert_ne!(clock.styles() & WS_EX_TOPMOST as isize, 0);

        // The flag alone cannot detect this failure; the order must be repaired.
        refresh_topmost(clock.0).unwrap();
        assert!(is_above(clock.0, competitor.0));
        assert_ne!(
            unsafe {
                SetWindowPos(
                    clock.0,
                    HWND_NOTOPMOST,
                    0,
                    0,
                    0,
                    0,
                    SWP_NOACTIVATE | SWP_NOMOVE | SWP_NOSIZE,
                )
            },
            0
        );
        assert_eq!(clock.styles() & WS_EX_TOPMOST as isize, 0);
        refresh_topmost(clock.0).unwrap();
        assert_ne!(clock.styles() & WS_EX_TOPMOST as isize, 0);
        assert!(is_above(clock.0, competitor.0));
        assert_eq!(clock.styles() & !(WS_EX_TOPMOST as isize), styles);
        assert_eq!(clock.bounds(), bounds);
        assert_eq!(unsafe { GetForegroundWindow() }, foreground);

        // Preserve Ctrl/menu interaction as well as ordinary click-through.
        for ignore in [false, true] {
            crate::interaction::set_click_through(clock.0, ignore);
            let input_styles = clock.styles();
            assert_eq!(input_styles & WS_EX_TRANSPARENT as isize != 0, ignore);
            assert_ne!(input_styles & WS_EX_LAYERED as isize, 0);
            refresh_topmost(competitor.0).unwrap();
            refresh_topmost(clock.0).unwrap();
            assert!(is_above(clock.0, competitor.0));
            assert_eq!(clock.styles(), input_styles);
            assert_eq!(clock.bounds(), bounds);
            assert_eq!(unsafe { GetForegroundWindow() }, foreground);
        }
    }

    #[test]
    fn recovery_leaves_hidden_and_minimized_clocks_alone() {
        let clock = TestWindow::new();
        refresh_topmost(clock.0).unwrap();
        assert_eq!(unsafe { IsWindowVisible(clock.0) }, 0);
        assert_eq!(clock.styles() & WS_EX_TOPMOST as isize, 0);
        unsafe { ShowWindow(clock.0, SW_SHOWMINNOACTIVE) };
        assert_ne!(unsafe { IsIconic(clock.0) }, 0);
        refresh_topmost(clock.0).unwrap();
        assert_ne!(unsafe { IsIconic(clock.0) }, 0);
        assert_eq!(clock.styles() & WS_EX_TOPMOST as isize, 0);
        unsafe { ShowWindow(clock.0, SW_HIDE) };
    }
}
