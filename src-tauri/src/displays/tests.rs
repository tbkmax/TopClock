use super::geometry::{centered_position, position_on_display};
use super::*;
use crate::config::model::{ClockPosition, DisplayPreference, PersistedConfig};

#[test]
fn center_uses_each_displays_physical_bounds_and_window_size() {
    let size = tauri::PhysicalSize::new(300, 100);
    let primary = MonitorBounds {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
    };
    let left = MonitorBounds {
        x: -1280,
        y: -200,
        width: 1280,
        height: 1024,
    };
    assert_eq!(
        centered_position(primary, size),
        tauri::PhysicalPosition::new(810, 490)
    );
    assert_eq!(
        centered_position(left, size),
        tauri::PhysicalPosition::new(-790, 262)
    );
}

#[test]
fn display_positions_restore_relative_to_each_display() {
    let mut config = PersistedConfig::default();
    config.displays.insert(
        "first".into(),
        DisplayPreference {
            visible: true,
            position: Some(ClockPosition { x: 100, y: 40 }),
        },
    );
    config.displays.insert(
        "second".into(),
        DisplayPreference {
            visible: true,
            position: Some(ClockPosition { x: 20, y: 60 }),
        },
    );
    let first = DisplayInfo {
        id: "first".into(),
        name: "First".into(),
        primary: true,
        enabled: true,
        bounds: MonitorBounds {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
        },
    };
    let second = DisplayInfo {
        id: "second".into(),
        name: "Second".into(),
        primary: false,
        enabled: true,
        bounds: MonitorBounds {
            x: 1920,
            y: 0,
            width: 1920,
            height: 1080,
        },
    };
    let size = tauri::PhysicalSize::new(300, 100);
    assert_eq!(position_on_display(&config, &first, size).x, 100);
    assert_eq!(position_on_display(&config, &second, size).x, 1940);
    config.displays.get_mut("second").unwrap().position = Some(ClockPosition { x: 260, y: 60 });
    assert_eq!(position_on_display(&config, &first, size).x, 100);
    assert_eq!(position_on_display(&config, &second, size).x, 2180);
    config.displays.get_mut("first").unwrap().position = Some(ClockPosition { x: 1880, y: 40 });
    assert_eq!(position_on_display(&config, &first, size).x, 1880);
    config.displays.get_mut("first").unwrap().position = Some(ClockPosition { x: -18, y: -12 });
    let unrestricted = position_on_display(&config, &first, size);
    assert_eq!((unrestricted.x, unrestricted.y), (-18, -12));
    assert_eq!(position_on_display(&config, &second, size).x, 2180);
}
