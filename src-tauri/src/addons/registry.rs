use super::{date, progress, region_clock, timer};
use serde_json::{Map, Value};

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub(super) enum AddonKind {
    Date,
    RegionClock,
    Timer,
    Progress,
}

impl AddonKind {
    pub(super) fn from_str(kind: &str) -> Option<Self> {
        match kind {
            "date" => Some(Self::Date),
            "region_clock" => Some(Self::RegionClock),
            "timer" => Some(Self::Timer),
            "progress" => Some(Self::Progress),
            _ => None,
        }
    }

    pub(super) fn max_instances(self) -> usize {
        match self {
            Self::Date | Self::Timer => 1,
            Self::RegionClock => 12,
            Self::Progress => 16,
        }
    }

    pub(super) fn valid_options(self, options: &Map<String, Value>) -> bool {
        match self {
            Self::Date => date::valid_options(options),
            Self::RegionClock => region_clock::valid_options(options),
            Self::Timer => timer::valid_options(options),
            Self::Progress => progress::valid_options(options),
        }
    }
}
