use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

// ============================================================================
// Pure Data Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppState {
    pub widgets: Option<Value>,
    pub selected_apps: Option<Value>,
    pub selected_version: Option<Value>,
    pub package_manager_config: Option<Value>,
    pub widget_properties: Option<Value>,
    pub theme: Option<String>,
    pub last_tab: Option<String>,
}

impl Default for AppState {
    fn default() -> Self {
        AppState {
            widgets: None,
            selected_apps: None,
            selected_version: None,
            package_manager_config: None,
            widget_properties: None,
            theme: Some("light".to_string()),
            last_tab: Some("widgetManager".to_string()),
        }
    }
}

// ============================================================================
// Pure Functions - Path Construction
// ============================================================================

fn construct_storage_directory_path() -> Result<PathBuf, String> {
    dirs::config_dir()
        .ok_or_else(|| "Could not find config directory".to_string())
        .map(|dir| dir.join("kirakiraichigo-mendix-manager"))
}

fn construct_storage_file_path(filename: &str) -> Result<PathBuf, String> {
    construct_storage_directory_path().map(|dir| dir.join(filename))
}

// ============================================================================
// Pure Functions - Serialization/Deserialization
// ============================================================================

fn serialize_to_json<T: Serialize>(data: &T) -> Result<String, String> {
    serde_json::to_string_pretty(data).map_err(|e| format!("Failed to serialize data: {}", e))
}

fn deserialize_from_json<T: for<'de> Deserialize<'de>>(json: &str) -> Result<T, String> {
    serde_json::from_str(json).map_err(|e| format!("Failed to deserialize data: {}", e))
}

// ============================================================================
// IO Functions
// ============================================================================

fn ensure_storage_directory_exists() -> Result<(), String> {
    let dir = construct_storage_directory_path()?;
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create storage directory: {}", e))?;
    }
    Ok(())
}

fn write_to_file(path: &PathBuf, content: &str) -> Result<(), String> {
    ensure_storage_directory_exists()?;
    fs::write(path, content).map_err(|e| format!("Failed to write to file: {}", e))
}

fn read_from_file(path: &PathBuf) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| format!("Failed to read from file: {}", e))
}

// ============================================================================
// State Management Functions
// ============================================================================

fn save_state_to_file(state: &AppState) -> Result<(), String> {
    let path = construct_storage_file_path("app_state.json")?;
    let json = serialize_to_json(state)?;
    write_to_file(&path, &json)
}

fn load_state_from_file() -> Result<AppState, String> {
    let path = construct_storage_file_path("app_state.json")?;

    if !path.exists() {
        return Ok(AppState::default());
    }

    let json = read_from_file(&path)?;
    deserialize_from_json(&json)
}

fn save_specific_state(key: &str, value: Value) -> Result<(), String> {
    let mut state = load_state_from_file().unwrap_or_default();

    match key {
        "kirakiraWidgets" => state.widgets = Some(value),
        "selectedApps" => state.selected_apps = Some(value),
        "selectedVersion" => state.selected_version = Some(value),
        "packageManagerConfig" => state.package_manager_config = Some(value),
        "widgetProperties" => state.widget_properties = Some(value),
        "theme" => {
            if let Some(s) = value.as_str() {
                state.theme = Some(s.to_string());
            }
        }
        "lastTab" => {
            if let Some(s) = value.as_str() {
                state.last_tab = Some(s.to_string());
            }
        }
        _ => return Err(format!("Unknown storage key: {}", key)),
    }

    save_state_to_file(&state)
}

fn load_specific_state(key: &str, default_value: Value) -> Result<Value, String> {
    let state = load_state_from_file().unwrap_or_default();

    let result = match key {
        "kirakiraWidgets" => state.widgets,
        "selectedApps" => state.selected_apps,
        "selectedVersion" => state.selected_version,
        "packageManagerConfig" => state.package_manager_config,
        "widgetProperties" => state.widget_properties,
        "theme" => state.theme.map(|s| Value::String(s)),
        "lastTab" => state.last_tab.map(|s| Value::String(s)),
        _ => return Err(format!("Unknown storage key: {}", key)),
    };

    Ok(result.unwrap_or(default_value))
}

// ============================================================================
// Tauri Commands
// ============================================================================

#[tauri::command]
pub fn save_to_storage(key: String, data: Value) -> Result<Value, String> {
    save_specific_state(&key, data.clone())?;
    Ok(data)
}

#[tauri::command]
pub fn load_from_storage(key: String, default_value: Value) -> Result<Value, String> {
    load_specific_state(&key, default_value)
}

#[tauri::command]
pub fn save_app_state(state: AppState) -> Result<(), String> {
    save_state_to_file(&state)
}

#[tauri::command]
pub fn load_app_state() -> Result<AppState, String> {
    load_state_from_file()
}

#[tauri::command]
pub fn clear_app_state() -> Result<(), String> {
    let path = construct_storage_file_path("app_state.json")?;

    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to clear app state: {}", e))?;
    }

    Ok(())
}
