mod selection;
mod version_operations;

pub use selection::*;
pub use version_operations::*;

use std::sync::Mutex;

#[derive(Default)]
pub struct AppState {
    pub selection: Mutex<SelectionState>,
    pub version_ops: Mutex<VersionOpsState>,
}
