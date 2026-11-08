use serde_json::{Map, Value};

pub(super) fn valid_options(options: &Map<String, Value>) -> bool {
    (options.len() == 1 || options.len() == 2)
        && (options.len() == 1
            || options
                .get("show_weekday")
                .and_then(Value::as_bool)
                .is_some())
        && matches!(
            options.get("format").and_then(Value::as_str),
            Some("ymd" | "md" | "d")
        )
}
