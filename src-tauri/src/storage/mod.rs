use crate::data_processing::mendix_filters::Widget;
use crate::web_scraper::{DownloadableVersion, DownloadableVersionsCache};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

// Global mutex to prevent race conditions during file operations
static STORAGE_MUTEX: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));

// ============================================================================
// StorageKey Enum - Type-safe storage keys
// ============================================================================

/// Type-safe storage key enumeration.
///
/// This enum provides compile-time safety for storage operations,
/// ensuring only valid keys are used throughout the application.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum StorageKey {
    KirakiraWidgets,
    SelectedApps,
    SelectedVersion,
    PackageManagerConfig,
    WidgetProperties,
    Theme,
    LastTab,
    SelectedWidgets,
    WidgetOrder,
    DownloadableVersionsCache,
    Locale,
}

impl StorageKey {
    /// Returns the string representation of the storage key.
    ///
    /// This matches the frontend STORAGE_KEYS constants.
    pub fn as_str(&self) -> &'static str {
        match self {
            StorageKey::KirakiraWidgets => "kirakiraWidgets",
            StorageKey::SelectedApps => "selectedApps",
            StorageKey::SelectedVersion => "selectedVersion",
            StorageKey::PackageManagerConfig => "packageManagerConfig",
            StorageKey::WidgetProperties => "widgetProperties",
            StorageKey::Theme => "theme",
            StorageKey::LastTab => "lastTab",
            StorageKey::SelectedWidgets => "selectedWidgets",
            StorageKey::WidgetOrder => "widgetOrder",
            StorageKey::DownloadableVersionsCache => "downloadableVersionsCache",
            StorageKey::Locale => "locale",
        }
    }
}

impl TryFrom<&str> for StorageKey {
    type Error = String;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "kirakiraWidgets" => Ok(StorageKey::KirakiraWidgets),
            "selectedApps" => Ok(StorageKey::SelectedApps),
            "selectedVersion" => Ok(StorageKey::SelectedVersion),
            "packageManagerConfig" => Ok(StorageKey::PackageManagerConfig),
            "widgetProperties" => Ok(StorageKey::WidgetProperties),
            "theme" => Ok(StorageKey::Theme),
            "lastTab" => Ok(StorageKey::LastTab),
            "selectedWidgets" => Ok(StorageKey::SelectedWidgets),
            "widgetOrder" => Ok(StorageKey::WidgetOrder),
            "downloadableVersionsCache" => Ok(StorageKey::DownloadableVersionsCache),
            "locale" => Ok(StorageKey::Locale),
            _ => Err(format!("Unknown storage key: {}", value)),
        }
    }
}

impl std::fmt::Display for StorageKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

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
    pub downloadable_versions_cache: Option<Value>,
    pub locale: Option<String>,
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
            downloadable_versions_cache: None,
            locale: None,
        }
    }
}

impl AppState {
    /// Gets a value by StorageKey.
    pub fn get(&self, key: StorageKey) -> Option<Value> {
        match key {
            StorageKey::KirakiraWidgets => self.widgets.clone(),
            StorageKey::SelectedApps => self.selected_apps.clone(),
            StorageKey::SelectedVersion => self.selected_version.clone(),
            StorageKey::PackageManagerConfig => self.package_manager_config.clone(),
            StorageKey::WidgetProperties => self.widget_properties.clone(),
            StorageKey::Theme => self.theme.clone().map(Value::String),
            StorageKey::LastTab => self.last_tab.clone().map(Value::String),
            StorageKey::SelectedWidgets => self.selected_widgets.clone(),
            StorageKey::WidgetOrder => self.widget_order.clone(),
            StorageKey::DownloadableVersionsCache => self.downloadable_versions_cache.clone(),
            StorageKey::Locale => self.locale.clone().map(Value::String),
        }
    }

    /// Sets a value by StorageKey.
    pub fn set(&mut self, key: StorageKey, value: Value) {
        match key {
            StorageKey::KirakiraWidgets => self.widgets = Some(value),
            StorageKey::SelectedApps => self.selected_apps = Some(value),
            StorageKey::SelectedVersion => self.selected_version = Some(value),
            StorageKey::PackageManagerConfig => self.package_manager_config = Some(value),
            StorageKey::WidgetProperties => self.widget_properties = Some(value),
            StorageKey::Theme => {
                if let Some(s) = value.as_str() {
                    self.theme = Some(s.to_string());
                }
            }
            StorageKey::LastTab => {
                if let Some(s) = value.as_str() {
                    self.last_tab = Some(s.to_string());
                }
            }
            StorageKey::SelectedWidgets => self.selected_widgets = Some(value),
            StorageKey::WidgetOrder => self.widget_order = Some(value),
            StorageKey::DownloadableVersionsCache => {
                self.downloadable_versions_cache = Some(value)
            }
            StorageKey::Locale => {
                if let Some(s) = value.as_str() {
                    self.locale = Some(s.to_string());
                }
            }
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

/// Saves a specific state value using type-safe StorageKey.
fn save_specific_state_typed(key: StorageKey, value: Value) -> Result<(), String> {
    let _lock = STORAGE_MUTEX
        .lock()
        .map_err(|e| format!("Failed to acquire storage lock: {}", e))?;

    let mut state = load_state_from_file().unwrap_or_default();
    state.set(key, value);
    save_state_to_file(&state)
}

/// Loads a specific state value using type-safe StorageKey.
fn load_specific_state_typed(key: StorageKey, default_value: Value) -> Result<Value, String> {
    let state = load_state_from_file().unwrap_or_default();
    Ok(state.get(key).unwrap_or(default_value))
}

// ============================================================================
// Tauri Commands (maintain string-based API for frontend compatibility)
// ============================================================================

#[tauri::command]
pub fn save_to_storage(key: String, data: Value) -> Result<Value, String> {
    let storage_key = StorageKey::try_from(key.as_str())?;
    save_specific_state_typed(storage_key, data.clone())?;
    Ok(data)
}

#[tauri::command]
pub fn load_from_storage(key: String, default_value: Value) -> Result<Value, String> {
    let storage_key = StorageKey::try_from(key.as_str())?;
    load_specific_state_typed(storage_key, default_value)
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
    serde_json::from_value(value.clone()).map_err(|e| format!("Failed to parse widgets: {}", e))
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

    let widgets = match state.get(StorageKey::KirakiraWidgets) {
        Some(value) => parse_widgets_from_value(&value)?,
        None => return Ok(Vec::new()),
    };

    let order = match state.get(StorageKey::WidgetOrder) {
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

    let widgets = match state.get(StorageKey::KirakiraWidgets) {
        Some(value) => parse_widgets_from_value(&value)?,
        None => return Ok(Vec::new()),
    };

    let order = match state.get(StorageKey::WidgetOrder) {
        Some(value) => parse_order_from_value(&value),
        None => Vec::new(),
    };

    // Remove the widget
    let updated_widgets: Vec<Widget> = widgets
        .into_iter()
        .filter(|w| w.id != widget_id)
        .collect();

    // Update order to remove the deleted widget
    let updated_order: Vec<String> = order.into_iter().filter(|id| id != &widget_id).collect();

    // Save updated state
    state.set(StorageKey::KirakiraWidgets, widgets_to_value(&updated_widgets)?);
    state.set(StorageKey::WidgetOrder, order_to_value(&updated_order)?);
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

    let mut widgets = match state.get(StorageKey::KirakiraWidgets) {
        Some(value) => parse_widgets_from_value(&value)?,
        None => Vec::new(),
    };

    let mut order = match state.get(StorageKey::WidgetOrder) {
        Some(value) => parse_order_from_value(&value),
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
    state.set(StorageKey::KirakiraWidgets, widgets_to_value(&widgets)?);
    state.set(StorageKey::WidgetOrder, order_to_value(&order)?);
    save_state_to_file(&state)?;

    Ok(new_widget)
}

// ============================================================================
// Downloadable Versions Cache Management
// ============================================================================

fn merge_downloadable_versions(
    cached: Vec<DownloadableVersion>,
    fresh: Vec<DownloadableVersion>,
) -> Vec<DownloadableVersion> {
    let mut version_map: HashMap<String, DownloadableVersion> = cached
        .into_iter()
        .map(|v| (v.version.clone(), v))
        .collect();

    for v in fresh {
        version_map.insert(v.version.clone(), v);
    }

    let mut versions: Vec<DownloadableVersion> = version_map.into_values().collect();
    versions.sort_by(|a, b| compare_version_strings(&b.version, &a.version));
    versions
}

fn compare_version_strings(a: &str, b: &str) -> std::cmp::Ordering {
    let parse_parts = |s: &str| -> Vec<u32> {
        s.split('.')
            .filter_map(|part| part.parse::<u32>().ok())
            .collect()
    };

    let a_parts = parse_parts(a);
    let b_parts = parse_parts(b);

    for (a_part, b_part) in a_parts.iter().zip(b_parts.iter()) {
        match a_part.cmp(b_part) {
            std::cmp::Ordering::Equal => continue,
            other => return other,
        }
    }

    a_parts.len().cmp(&b_parts.len())
}

fn parse_cache_from_value(value: &Value) -> Result<Vec<DownloadableVersion>, String> {
    serde_json::from_value::<DownloadableVersionsCache>(value.clone())
        .map(|cache| cache.versions)
        .or_else(|_| {
            serde_json::from_value::<Vec<DownloadableVersion>>(value.clone())
                .map_err(|e| format!("Failed to parse cache: {}", e))
        })
}

fn versions_to_cache_value(versions: &[DownloadableVersion]) -> Result<Value, String> {
    let cache = DownloadableVersionsCache {
        versions: versions.to_vec(),
    };
    serde_json::to_value(cache).map_err(|e| format!("Failed to serialize cache: {}", e))
}

#[tauri::command]
pub fn load_downloadable_versions_cache() -> Result<Vec<DownloadableVersion>, String> {
    let state = load_state_from_file().unwrap_or_default();

    match state.get(StorageKey::DownloadableVersionsCache) {
        Some(value) => parse_cache_from_value(&value),
        None => Ok(Vec::new()),
    }
}


#[tauri::command]
pub fn merge_and_save_downloadable_versions(
    fresh: Vec<DownloadableVersion>,
) -> Result<Vec<DownloadableVersion>, String> {
    let _lock = STORAGE_MUTEX
        .lock()
        .map_err(|e| format!("Failed to acquire storage lock: {}", e))?;

    let mut state = load_state_from_file().unwrap_or_default();

    let cached = match state.get(StorageKey::DownloadableVersionsCache) {
        Some(value) => parse_cache_from_value(&value).unwrap_or_default(),
        None => Vec::new(),
    };

    let merged = merge_downloadable_versions(cached, fresh);

    state.set(
        StorageKey::DownloadableVersionsCache,
        versions_to_cache_value(&merged)?,
    );
    save_state_to_file(&state)?;

    Ok(merged)
}

#[tauri::command]
pub fn clear_downloadable_versions_cache() -> Result<(), String> {
    let _lock = STORAGE_MUTEX
        .lock()
        .map_err(|e| format!("Failed to acquire storage lock: {}", e))?;

    let mut state = load_state_from_file().unwrap_or_default();
    state.set(
        StorageKey::DownloadableVersionsCache,
        versions_to_cache_value(&[])?,
    );
    save_state_to_file(&state)
}
