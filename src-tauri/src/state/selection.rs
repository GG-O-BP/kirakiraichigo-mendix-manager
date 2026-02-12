use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use tauri::State;

use crate::state::AppState;
use crate::storage::{load_from_storage, save_to_storage};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SelectionType {
    Widgets,
    Apps,
    Versions,
}

impl SelectionType {
    pub fn storage_key(&self) -> &'static str {
        match self {
            SelectionType::Widgets => "selectedWidgets",
            SelectionType::Apps => "selectedApps",
            SelectionType::Versions => "selectedVersion",
        }
    }
}

#[derive(Default)]
pub struct SelectionState {
    selections: HashMap<SelectionType, HashSet<String>>,
}

impl SelectionState {
    pub fn toggle(&mut self, selection_type: SelectionType, item_id: String) -> Vec<String> {
        let set = self.selections.entry(selection_type).or_default();
        if set.contains(&item_id) {
            set.remove(&item_id);
        } else {
            set.insert(item_id);
        }
        set.iter().cloned().collect()
    }

    pub fn get(&self, selection_type: SelectionType) -> Vec<String> {
        self.selections
            .get(&selection_type)
            .map(|set| set.iter().cloned().collect())
            .unwrap_or_default()
    }

    pub fn clear(&mut self, selection_type: SelectionType) {
        self.selections.remove(&selection_type);
    }

    pub fn is_selected(&self, selection_type: SelectionType, item_id: &str) -> bool {
        self.selections
            .get(&selection_type)
            .map(|set| set.contains(item_id))
            .unwrap_or(false)
    }

    pub fn has_selection(&self, selection_type: SelectionType) -> bool {
        self.selections
            .get(&selection_type)
            .map(|set| !set.is_empty())
            .unwrap_or(false)
    }

    pub fn set(&mut self, selection_type: SelectionType, items: Vec<String>) {
        self.selections
            .insert(selection_type, items.into_iter().collect());
    }

    pub fn remove(&mut self, selection_type: SelectionType, item_id: &str) -> Vec<String> {
        if let Some(set) = self.selections.get_mut(&selection_type) {
            set.remove(item_id);
            set.iter().cloned().collect()
        } else {
            Vec::new()
        }
    }
}

#[tauri::command]
pub fn toggle_selection(
    state: State<'_, AppState>,
    selection_type: SelectionType,
    item_id: String,
) -> Result<Vec<String>, String> {
    let mut selection = state
        .selection
        .lock()
        .map_err(|e| format!("Failed to lock selection state: {}", e))?;
    Ok(selection.toggle(selection_type, item_id))
}

#[tauri::command]
pub fn get_selection(
    state: State<'_, AppState>,
    selection_type: SelectionType,
) -> Result<Vec<String>, String> {
    let selection = state
        .selection
        .lock()
        .map_err(|e| format!("Failed to lock selection state: {}", e))?;
    Ok(selection.get(selection_type))
}

#[tauri::command]
pub fn clear_selection(
    state: State<'_, AppState>,
    selection_type: SelectionType,
) -> Result<(), String> {
    let mut selection = state
        .selection
        .lock()
        .map_err(|e| format!("Failed to lock selection state: {}", e))?;
    selection.clear(selection_type);
    Ok(())
}

#[tauri::command]
pub fn is_selected(
    state: State<'_, AppState>,
    selection_type: SelectionType,
    item_id: String,
) -> Result<bool, String> {
    let selection = state
        .selection
        .lock()
        .map_err(|e| format!("Failed to lock selection state: {}", e))?;
    Ok(selection.is_selected(selection_type, &item_id))
}

#[tauri::command]
pub fn has_selection(
    state: State<'_, AppState>,
    selection_type: SelectionType,
) -> Result<bool, String> {
    let selection = state
        .selection
        .lock()
        .map_err(|e| format!("Failed to lock selection state: {}", e))?;
    Ok(selection.has_selection(selection_type))
}

#[tauri::command]
pub fn set_selection(
    state: State<'_, AppState>,
    selection_type: SelectionType,
    items: Vec<String>,
) -> Result<(), String> {
    let mut selection = state
        .selection
        .lock()
        .map_err(|e| format!("Failed to lock selection state: {}", e))?;
    selection.set(selection_type, items);
    Ok(())
}

#[tauri::command]
pub fn remove_from_selection(
    state: State<'_, AppState>,
    selection_type: SelectionType,
    item_id: String,
) -> Result<Vec<String>, String> {
    let mut selection = state
        .selection
        .lock()
        .map_err(|e| format!("Failed to lock selection state: {}", e))?;
    Ok(selection.remove(selection_type, &item_id))
}

#[tauri::command]
pub fn init_selection_from_storage(
    state: State<'_, AppState>,
    selection_type: SelectionType,
) -> Result<Vec<String>, String> {
    let storage_key = selection_type.storage_key().to_string();
    let stored_value = load_from_storage(storage_key, Value::Array(vec![]))?;

    let items: Vec<String> = serde_json::from_value(stored_value)
        .map_err(|e| format!("Failed to parse stored selection: {}", e))?;

    let mut selection = state
        .selection
        .lock()
        .map_err(|e| format!("Failed to lock selection state: {}", e))?;
    selection.set(selection_type, items.clone());

    Ok(items)
}

#[tauri::command]
pub fn toggle_selection_with_save(
    state: State<'_, AppState>,
    selection_type: SelectionType,
    item_id: String,
) -> Result<Vec<String>, String> {
    let result = {
        let mut selection = state
            .selection
            .lock()
            .map_err(|e| format!("Failed to lock selection state: {}", e))?;
        selection.toggle(selection_type, item_id)
    };

    let storage_key = selection_type.storage_key().to_string();
    let value = serde_json::to_value(&result)
        .map_err(|e| format!("Failed to serialize selection: {}", e))?;
    save_to_storage(storage_key, value)?;

    Ok(result)
}

#[tauri::command]
pub fn remove_from_selection_with_save(
    state: State<'_, AppState>,
    selection_type: SelectionType,
    item_id: String,
) -> Result<Vec<String>, String> {
    let result = {
        let mut selection = state
            .selection
            .lock()
            .map_err(|e| format!("Failed to lock selection state: {}", e))?;
        selection.remove(selection_type, &item_id)
    };

    let storage_key = selection_type.storage_key().to_string();
    let value = serde_json::to_value(&result)
        .map_err(|e| format!("Failed to serialize selection: {}", e))?;
    save_to_storage(storage_key, value)?;

    Ok(result)
}

#[tauri::command]
pub fn clear_selection_with_save(
    state: State<'_, AppState>,
    selection_type: SelectionType,
) -> Result<(), String> {
    {
        let mut selection = state
            .selection
            .lock()
            .map_err(|e| format!("Failed to lock selection state: {}", e))?;
        selection.clear(selection_type);
    }

    let storage_key = selection_type.storage_key().to_string();
    save_to_storage(storage_key, Value::Array(vec![]))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_toggle_selection() {
        let mut state = SelectionState::default();

        let result = state.toggle(SelectionType::Widgets, "widget-1".to_string());
        assert_eq!(result, vec!["widget-1"]);

        let result = state.toggle(SelectionType::Widgets, "widget-2".to_string());
        assert!(result.contains(&"widget-1".to_string()));
        assert!(result.contains(&"widget-2".to_string()));

        let result = state.toggle(SelectionType::Widgets, "widget-1".to_string());
        assert_eq!(result, vec!["widget-2"]);
    }

    #[test]
    fn test_get_selection() {
        let mut state = SelectionState::default();

        assert!(state.get(SelectionType::Apps).is_empty());

        state.toggle(SelectionType::Apps, "app-1".to_string());
        let result = state.get(SelectionType::Apps);
        assert_eq!(result, vec!["app-1"]);
    }

    #[test]
    fn test_clear_selection() {
        let mut state = SelectionState::default();

        state.toggle(SelectionType::Versions, "v1".to_string());
        state.toggle(SelectionType::Versions, "v2".to_string());
        assert!(state.has_selection(SelectionType::Versions));

        state.clear(SelectionType::Versions);
        assert!(!state.has_selection(SelectionType::Versions));
    }

    #[test]
    fn test_is_selected() {
        let mut state = SelectionState::default();

        assert!(!state.is_selected(SelectionType::Widgets, "widget-1"));

        state.toggle(SelectionType::Widgets, "widget-1".to_string());
        assert!(state.is_selected(SelectionType::Widgets, "widget-1"));
        assert!(!state.is_selected(SelectionType::Widgets, "widget-2"));
    }

    #[test]
    fn test_has_selection() {
        let mut state = SelectionState::default();

        assert!(!state.has_selection(SelectionType::Apps));

        state.toggle(SelectionType::Apps, "app-1".to_string());
        assert!(state.has_selection(SelectionType::Apps));
    }

    #[test]
    fn test_set_selection() {
        let mut state = SelectionState::default();

        state.set(
            SelectionType::Widgets,
            vec!["w1".to_string(), "w2".to_string()],
        );
        let result = state.get(SelectionType::Widgets);
        assert!(result.contains(&"w1".to_string()));
        assert!(result.contains(&"w2".to_string()));
    }

    #[test]
    fn test_remove_from_selection() {
        let mut state = SelectionState::default();

        state.set(
            SelectionType::Apps,
            vec!["a1".to_string(), "a2".to_string()],
        );
        let result = state.remove(SelectionType::Apps, "a1");
        assert_eq!(result, vec!["a2"]);
    }

    #[test]
    fn test_storage_key() {
        assert_eq!(SelectionType::Widgets.storage_key(), "selectedWidgets");
        assert_eq!(SelectionType::Apps.storage_key(), "selectedApps");
        assert_eq!(SelectionType::Versions.storage_key(), "selectedVersion");
    }
}
