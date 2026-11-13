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

#[derive(Clone, PartialEq, Serialize, Deserialize)]
pub(crate) struct AddonPair {
    pub(crate) left_id: String,
    pub(crate) right_id: String,
    pub(crate) size_percent: u8,
}

pub(crate) fn valid_pairs(addons: &[AddonInstance], pairs: &[AddonPair]) -> bool {
    let mut paired = HashSet::new();
    pairs.iter().all(|pair| {
        let Some(index) = addons.iter().position(|addon| addon.id == pair.left_id) else {
            return false;
        };
        let Some(left) = addons.get(index) else {
            return false;
        };
        let Some(right) = addons.get(index + 1) else {
            return false;
        };
        right.id == pair.right_id
            && matches!(
                left.kind.as_str(),
                "date" | "region_clock" | "timer" | "counter"
            )
            && matches!(
                right.kind.as_str(),
                "date" | "region_clock" | "timer" | "counter"
            )
            && left.placement == right.placement
            && left.enabled == right.enabled
            && (10..=100).contains(&pair.size_percent)
            && paired.insert(left.id.as_str())
            && paired.insert(right.id.as_str())
    })
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
