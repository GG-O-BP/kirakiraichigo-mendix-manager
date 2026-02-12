mod selection;
mod version_operations;

pub use selection::{
    clear_selection, clear_selection_with_save, get_selection, has_selection,
    init_selection_from_storage, is_selected, remove_from_selection, remove_from_selection_with_save,
    set_selection, toggle_selection, toggle_selection_with_save, SelectionState,
};
pub use version_operations::*;

use std::sync::Mutex;

#[derive(Default)]
pub struct AppState {
    pub selection: Mutex<SelectionState>,
    pub version_ops: Mutex<VersionOpsState>,
}
