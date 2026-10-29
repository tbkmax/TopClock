//! Match Tauri's GDI display names to Windows display targets.
use std::{collections::HashMap, mem::size_of, ptr};
use windows_sys::Win32::{
    Devices::Display::{
        DisplayConfigGetDeviceInfo, GetDisplayConfigBufferSizes, QueryDisplayConfig,
        DISPLAYCONFIG_DEVICE_INFO_GET_SOURCE_NAME, DISPLAYCONFIG_DEVICE_INFO_GET_TARGET_NAME,
        DISPLAYCONFIG_MODE_INFO, DISPLAYCONFIG_PATH_INFO, DISPLAYCONFIG_SOURCE_DEVICE_NAME,
        DISPLAYCONFIG_TARGET_DEVICE_NAME, QDC_ONLY_ACTIVE_PATHS,
    },
    Foundation::ERROR_INSUFFICIENT_BUFFER,
};

#[derive(Clone)]
pub(crate) struct DisplayIdentity {
    pub(crate) id: String,
    pub(crate) friendly_name: String,
}

fn wide_string(value: &[u16]) -> String {
    String::from_utf16_lossy(&value[..value.iter().position(|&ch| ch == 0).unwrap_or(value.len())])
}

pub(crate) fn active_display_identities() -> HashMap<String, DisplayIdentity> {
    let mut result = HashMap::new();
    for _ in 0..3 {
        let (mut path_count, mut mode_count) = (0, 0);
        if unsafe {
            GetDisplayConfigBufferSizes(QDC_ONLY_ACTIVE_PATHS, &mut path_count, &mut mode_count)
        } != 0
        {
            break;
        }
        let mut paths = vec![DISPLAYCONFIG_PATH_INFO::default(); path_count as usize];
        let mut modes = vec![DISPLAYCONFIG_MODE_INFO::default(); mode_count as usize];
        let status = unsafe {
            QueryDisplayConfig(
                QDC_ONLY_ACTIVE_PATHS,
                &mut path_count,
                paths.as_mut_ptr(),
                &mut mode_count,
                modes.as_mut_ptr(),
                ptr::null_mut(),
            )
        };
        if status == ERROR_INSUFFICIENT_BUFFER {
            continue;
        }
        if status != 0 {
            break;
        }
        for path in paths.iter().take(path_count as usize) {
            let mut source = DISPLAYCONFIG_SOURCE_DEVICE_NAME::default();
            source.header.size = size_of::<DISPLAYCONFIG_SOURCE_DEVICE_NAME>() as u32;
            source.header.r#type = DISPLAYCONFIG_DEVICE_INFO_GET_SOURCE_NAME;
            source.header.adapterId = path.sourceInfo.adapterId;
            source.header.id = path.sourceInfo.id;
            if unsafe { DisplayConfigGetDeviceInfo(&mut source.header) } != 0 {
                continue;
            }
            let source_name = wide_string(&source.viewGdiDeviceName);
            if source_name.is_empty() {
                continue;
            }
            let mut target = DISPLAYCONFIG_TARGET_DEVICE_NAME::default();
            target.header.size = size_of::<DISPLAYCONFIG_TARGET_DEVICE_NAME>() as u32;
            target.header.r#type = DISPLAYCONFIG_DEVICE_INFO_GET_TARGET_NAME;
            target.header.adapterId = path.targetInfo.adapterId;
            target.header.id = path.targetInfo.id;
            let target_ok = unsafe { DisplayConfigGetDeviceInfo(&mut target.header) } == 0;
            let device_path = if target_ok {
                wide_string(&target.monitorDevicePath)
            } else {
                String::new()
            };
            let friendly_name = if target_ok {
                wide_string(&target.monitorFriendlyDeviceName)
            } else {
                String::new()
            };
            // The device path identifies a target across display-order changes. A source
            // slot is used only when Windows supplies no target path.
            let id = if device_path.is_empty() {
                format!("slot:{}", source_name.to_ascii_lowercase())
            } else {
                format!("target:{}", device_path.to_ascii_lowercase())
            };
            result.insert(
                source_name.to_ascii_lowercase(),
                DisplayIdentity { id, friendly_name },
            );
        }
        break;
    }
    result
}
