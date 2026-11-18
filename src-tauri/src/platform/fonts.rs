use windows_sys::Win32::Graphics::Gdi::{
    EnumFontFamiliesExW, GetDC, ReleaseDC, DEFAULT_CHARSET, LOGFONTW, TEXTMETRICW,
};

unsafe extern "system" fn collect_font(
    font: *const LOGFONTW,
    _metrics: *const TEXTMETRICW,
    _font_type: u32,
    context: isize,
) -> i32 {
    if !font.is_null() {
        let names = &mut *(context as *mut Vec<String>);
        let face = &(*font).lfFaceName;
        let len = face
            .iter()
            .position(|&unit| unit == 0)
            .unwrap_or(face.len());
        let name = String::from_utf16_lossy(&face[..len]);
        if !name.is_empty() && !name.starts_with('@') {
            names.push(name);
        }
    }
    1
}

fn normalize_font_families(mut names: Vec<String>) -> Vec<String> {
    names.sort_by_key(|name| name.to_lowercase());
    names.dedup_by(|a, b| a.to_lowercase() == b.to_lowercase());
    names
}

#[tauri::command]
pub(crate) fn get_font_families() -> Result<Vec<String>, String> {
    let dc = unsafe { GetDC(std::ptr::null_mut()) };
    if dc.is_null() {
        return Err("Could not read installed fonts from Windows".into());
    }

    let mut query: LOGFONTW = unsafe { std::mem::zeroed() };
    query.lfCharSet = DEFAULT_CHARSET;
    let mut names = Vec::new();
    unsafe {
        EnumFontFamiliesExW(
            dc,
            &query,
            Some(collect_font),
            &mut names as *mut _ as isize,
            0,
        );
        ReleaseDC(std::ptr::null_mut(), dc);
    }

    let names = normalize_font_families(names);
    if names.is_empty() {
        Err("Windows returned no installed fonts".into())
    } else {
        Ok(names)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn removes_duplicate_family_names() {
        let names =
            normalize_font_families(vec!["Segoe UI".into(), "Arial".into(), "arial".into()]);
        assert_eq!(names.len(), 2);
    }

    #[test]
    fn windows_font_list_has_multiple_families() {
        assert!(get_font_families().unwrap().len() > 10);
    }
}
