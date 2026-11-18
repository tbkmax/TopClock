mod discovery;
mod geometry;
mod identity;
mod manager;
pub(crate) mod positions;

pub(crate) use manager::{reconcile_displays, start_display_manager};
pub(crate) use positions::save_current_position;
use serde::Serialize;

#[derive(Clone, Copy, PartialEq, Serialize)]
pub(crate) struct MonitorBounds {
    pub(crate) x: i32,
    pub(crate) y: i32,
    pub(crate) width: u32,
    pub(crate) height: u32,
}

#[derive(Clone)]
pub(crate) struct ActiveDisplay {
    pub(crate) label: String,
    pub(crate) bounds: MonitorBounds,
}

#[derive(Clone, PartialEq, Serialize)]
pub(crate) struct DisplayInfo {
    pub(crate) id: String,
    pub(crate) name: String,
    pub(crate) primary: bool,
    pub(crate) enabled: bool,
    pub(crate) bounds: MonitorBounds,
}

#[cfg(test)]
mod tests;
