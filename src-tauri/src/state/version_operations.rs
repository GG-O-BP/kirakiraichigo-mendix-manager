use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;

use crate::state::AppState;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum VersionOperation {
    Launch,
    Uninstall,
    Download,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionLoadingState {
    pub version_id: String,
    pub operation: VersionOperation,
    pub value: bool,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionLoadingFlags {
    pub is_launching: bool,
    pub is_uninstalling: bool,
    pub is_downloading: bool,
}

#[derive(Default)]
pub struct VersionOpsState {
    states: HashMap<String, VersionLoadingState>,
}

impl VersionOpsState {
    pub fn set_operation(
        &mut self,
        version_id: String,
        operation: VersionOperation,
        is_active: bool,
    ) -> HashMap<String, VersionLoadingState> {
        if is_active {
            let state = VersionLoadingState {
                version_id: version_id.clone(),
                operation,
                value: true,
                timestamp: chrono::Utc::now().timestamp_millis(),
            };
            self.states.insert(version_id, state);
        } else {
            self.states.remove(&version_id);
        }
        self.states.clone()
    }

    pub fn get_loading_state(&self, version_id: &str) -> VersionLoadingFlags {
        match self.states.get(version_id) {
            Some(state) if state.value => VersionLoadingFlags {
                is_launching: state.operation == VersionOperation::Launch,
                is_uninstalling: state.operation == VersionOperation::Uninstall,
                is_downloading: state.operation == VersionOperation::Download,
            },
            _ => VersionLoadingFlags::default(),
        }
    }

    pub fn is_busy(&self, version_id: &str) -> bool {
        match self.states.get(version_id) {
            Some(state) => {
                state.value
                    && (state.operation == VersionOperation::Launch
                        || state.operation == VersionOperation::Uninstall)
            }
            None => false,
        }
    }

    pub fn get_all(&self) -> HashMap<String, VersionLoadingState> {
        self.states.clone()
    }
}

#[tauri::command]
pub fn set_version_operation(
    state: State<'_, AppState>,
    version_id: String,
    operation: VersionOperation,
    is_active: bool,
) -> Result<HashMap<String, VersionLoadingState>, String> {
    let mut version_ops = state
        .version_ops
        .lock()
        .map_err(|e| format!("Failed to lock version ops state: {}", e))?;
    Ok(version_ops.set_operation(version_id, operation, is_active))
}

#[tauri::command]
pub fn get_version_loading_state(
    state: State<'_, AppState>,
    version_id: String,
) -> Result<VersionLoadingFlags, String> {
    let version_ops = state
        .version_ops
        .lock()
        .map_err(|e| format!("Failed to lock version ops state: {}", e))?;
    Ok(version_ops.get_loading_state(&version_id))
}

#[tauri::command]
pub fn is_version_busy(state: State<'_, AppState>, version_id: String) -> Result<bool, String> {
    let version_ops = state
        .version_ops
        .lock()
        .map_err(|e| format!("Failed to lock version ops state: {}", e))?;
    Ok(version_ops.is_busy(&version_id))
}

#[tauri::command]
pub fn get_all_version_operations(
    state: State<'_, AppState>,
) -> Result<HashMap<String, VersionLoadingState>, String> {
    let version_ops = state
        .version_ops
        .lock()
        .map_err(|e| format!("Failed to lock version ops state: {}", e))?;
    Ok(version_ops.get_all())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_set_operation_active() {
        let mut state = VersionOpsState::default();

        let result =
            state.set_operation("v1".to_string(), VersionOperation::Launch, true);
        assert!(result.contains_key("v1"));
        assert_eq!(result.get("v1").unwrap().operation, VersionOperation::Launch);
    }

    #[test]
    fn test_set_operation_inactive() {
        let mut state = VersionOpsState::default();

        state.set_operation("v1".to_string(), VersionOperation::Launch, true);
        let result = state.set_operation("v1".to_string(), VersionOperation::Launch, false);
        assert!(!result.contains_key("v1"));
    }

    #[test]
    fn test_get_loading_state() {
        let mut state = VersionOpsState::default();

        let flags = state.get_loading_state("v1");
        assert!(!flags.is_launching);
        assert!(!flags.is_uninstalling);
        assert!(!flags.is_downloading);

        state.set_operation("v1".to_string(), VersionOperation::Launch, true);
        let flags = state.get_loading_state("v1");
        assert!(flags.is_launching);
        assert!(!flags.is_uninstalling);
        assert!(!flags.is_downloading);

        state.set_operation("v2".to_string(), VersionOperation::Uninstall, true);
        let flags = state.get_loading_state("v2");
        assert!(!flags.is_launching);
        assert!(flags.is_uninstalling);
    }

    #[test]
    fn test_is_busy() {
        let mut state = VersionOpsState::default();

        assert!(!state.is_busy("v1"));

        state.set_operation("v1".to_string(), VersionOperation::Launch, true);
        assert!(state.is_busy("v1"));

        state.set_operation("v2".to_string(), VersionOperation::Download, true);
        assert!(!state.is_busy("v2"));

        state.set_operation("v3".to_string(), VersionOperation::Uninstall, true);
        assert!(state.is_busy("v3"));
    }

    #[test]
    fn test_get_all() {
        let mut state = VersionOpsState::default();

        state.set_operation("v1".to_string(), VersionOperation::Launch, true);
        state.set_operation("v2".to_string(), VersionOperation::Download, true);

        let all = state.get_all();
        assert_eq!(all.len(), 2);
        assert!(all.contains_key("v1"));
        assert!(all.contains_key("v2"));
    }
}
