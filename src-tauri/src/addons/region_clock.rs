use serde_json::{Map, Value};

pub(super) fn valid_options(options: &Map<String, Value>) -> bool {
    (options.len() == 1 || options.len() == 2)
        && (options.len() == 1 || options.get("show_label").and_then(Value::as_bool).is_some())
        && options
            .get("time_zone")
            .and_then(Value::as_str)
            .is_some_and(|zone| {
                !zone.is_empty()
                    && zone.len() <= 80
                    && zone.bytes().all(|b| {
                        b.is_ascii_alphanumeric() || matches!(b, b'/' | b'_' | b'+' | b'-')
                    })
            })
}
