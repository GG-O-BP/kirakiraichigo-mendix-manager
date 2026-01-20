use crate::data_processing::mendix_filters::Widget;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use once_cell::sync::Lazy;

// Global mutex to prevent race conditions during file operations
static STORAGE_MUTEX: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));

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
    pub selected_widgets: Option<Value>,
    pub widget_order: Option<Value>,
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
            selected_widgets: None,
            widget_order: None,
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
    // Acquire lock to prevent race conditions
    let _lock = STORAGE_MUTEX
        .lock()
        .map_err(|e| format!("Failed to acquire storage lock: {}", e))?;

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
        "selectedWidgets" => state.selected_widgets = Some(value),
        "widgetOrder" => state.widget_order = Some(value),
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
        "selectedWidgets" => state.selected_widgets,
        "widgetOrder" => state.widget_order,
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

// ============================================================================
// Widget Storage Management Functions
// ============================================================================

fn sort_widgets_by_order_internal(widgets: Vec<Widget>, order: &[String]) -> Vec<Widget> {
    if order.is_empty() {
        return widgets;
    }

    let order_map: HashMap<&String, usize> = order
        .iter()
        .enumerate()
        .map(|(i, id)| (id, i))
        .collect();

    let (mut ordered, unordered): (Vec<_>, Vec<_>) = widgets
        .into_iter()
        .partition(|w| order_map.contains_key(&w.id));

    ordered.sort_by_key(|w| order_map.get(&w.id).copied().unwrap_or(usize::MAX));
    ordered.extend(unordered);

    ordered
}

fn parse_widgets_from_value(value: &Value) -> Result<Vec<Widget>, String> {
    serde_json::from_value(value.clone())
        .map_err(|e| format!("Failed to parse widgets: {}", e))
}

fn parse_order_from_value(value: &Value) -> Vec<String> {
    serde_json::from_value(value.clone()).unwrap_or_default()
}

fn widgets_to_value(widgets: &[Widget]) -> Result<Value, String> {
    serde_json::to_value(widgets).map_err(|e| format!("Failed to serialize widgets: {}", e))
}

fn order_to_value(order: &[String]) -> Result<Value, String> {
    serde_json::to_value(order).map_err(|e| format!("Failed to serialize order: {}", e))
}

#[tauri::command]
pub fn load_widgets_ordered() -> Result<Vec<Widget>, String> {
    let state = load_state_from_file().unwrap_or_default();

    let widgets = match state.widgets {
        Some(value) => parse_widgets_from_value(&value)?,
        None => return Ok(Vec::new()),
    };

    let order = match state.widget_order {
        Some(value) => parse_order_from_value(&value),
        None => Vec::new(),
    };

    Ok(sort_widgets_by_order_internal(widgets, &order))
}

#[tauri::command]
pub fn delete_widget_and_save(widget_id: String) -> Result<Vec<Widget>, String> {
    let _lock = STORAGE_MUTEX
        .lock()
        .map_err(|e| format!("Failed to acquire storage lock: {}", e))?;

    let mut state = load_state_from_file().unwrap_or_default();

    let widgets = match &state.widgets {
        Some(value) => parse_widgets_from_value(value)?,
        None => return Ok(Vec::new()),
    };

    let order = match &state.widget_order {
        Some(value) => parse_order_from_value(value),
        None => Vec::new(),
    };

    // Remove the widget
    let updated_widgets: Vec<Widget> = widgets
        .into_iter()
        .filter(|w| w.id != widget_id)
        .collect();

    // Update order to remove the deleted widget
    let updated_order: Vec<String> = order
        .into_iter()
        .filter(|id| id != &widget_id)
        .collect();

    // Save updated state
    state.widgets = Some(widgets_to_value(&updated_widgets)?);
    state.widget_order = Some(order_to_value(&updated_order)?);
    save_state_to_file(&state)?;

    // Return sorted widgets
    Ok(sort_widgets_by_order_internal(updated_widgets, &updated_order))
}

#[tauri::command]
pub fn add_widget_and_save(caption: String, path: String) -> Result<Widget, String> {
    use std::time::{SystemTime, UNIX_EPOCH};

    let _lock = STORAGE_MUTEX
        .lock()
        .map_err(|e| format!("Failed to acquire storage lock: {}", e))?;

    let mut state = load_state_from_file().unwrap_or_default();

    let mut widgets = match &state.widgets {
        Some(value) => parse_widgets_from_value(value)?,
        None => Vec::new(),
    };

    let mut order = match &state.widget_order {
        Some(value) => parse_order_from_value(value),
        None => Vec::new(),
    };

    // Create new widget
    let id = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis().to_string())
        .unwrap_or_else(|_| "0".to_string());

    let new_widget = Widget {
        id: id.clone(),
        caption,
        path,
    };

    // Add to widgets and order
    widgets.push(new_widget.clone());
    order.push(id);

    // Save updated state
    state.widgets = Some(widgets_to_value(&widgets)?);
    state.widget_order = Some(order_to_value(&order)?);
    save_state_to_file(&state)?;

    Ok(new_widget)
}
