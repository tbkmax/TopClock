use super::registry::AddonKind;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{HashMap, HashSet};

#[derive(Clone, PartialEq, Serialize, Deserialize)]
pub(crate) struct AddonInstance {
    pub(crate) id: String,
    pub(crate) kind: String,
    pub(crate) enabled: bool,
    pub(crate) placement: String,
    pub(crate) size_percent: u8,
    pub(crate) options: Value,
}

pub(crate) fn valid_addons(addons: &[AddonInstance]) -> bool {
    if addons.len() > 16 {
        return false;
    }
    let mut ids = HashSet::new();
    let mut counts: HashMap<AddonKind, usize> = HashMap::new();
    addons.iter().all(|addon| {
        if addon.id.is_empty()
            || addon.id.len() > 64
            || !addon
                .id
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
            || !ids.insert(addon.id.as_str())
            || !matches!(addon.placement.as_str(), "above" | "below")
            || !(10..=100).contains(&addon.size_percent)
        {
            return false;
        }
        let Some(kind) = AddonKind::from_str(&addon.kind) else {
            return false;
        };
        let count = counts.entry(kind).or_default();
        *count += 1;
        *count <= kind.max_instances()
            && addon
                .options
                .as_object()
                .is_some_and(|options| kind.valid_options(options))
    })
}
