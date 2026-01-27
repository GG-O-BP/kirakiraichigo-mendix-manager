use crate::data_processing::mendix_filters::Widget;
use crate::web_scraper::{DownloadableVersion, DownloadableVersionsCache};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

static STORAGE_MUTEX: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));

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

fn construct_storage_file_path(filename: &str) -> Result<PathBuf, String> {
    dirs::config_dir()
        .ok_or_else(|| "Could not find config directory".to_string())
        .map(|dir| dir.join("kirakiraichigo-mendix-manager").join(filename))
}

fn save_state_to_file(state: &AppState) -> Result<(), String> {
    let path = construct_storage_file_path("app_state.json")?;

    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create storage directory: {}", e))?;
        }
    }

    let json = serde_json::to_string_pretty(state)
        .map_err(|e| format!("Failed to serialize data: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write to file: {}", e))
}

fn load_state_from_file() -> Result<AppState, String> {
    let path = construct_storage_file_path("app_state.json")?;

    if !path.exists() {
        return Ok(AppState::default());
    }

    let json = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read from file: {}", e))?;
    serde_json::from_str(&json).map_err(|e| format!("Failed to deserialize data: {}", e))
}

fn save_specific_state_typed(key: StorageKey, value: Value) -> Result<(), String> {
    let _lock = STORAGE_MUTEX
        .lock()
        .map_err(|e| format!("Failed to acquire storage lock: {}", e))?;

    let mut state = load_state_from_file().unwrap_or_default();
    state.set(key, value);
    save_state_to_file(&state)
}

fn load_specific_state_typed(key: StorageKey, default_value: Value) -> Result<Value, String> {
    let state = load_state_from_file().unwrap_or_default();
    Ok(state.get(key).unwrap_or(default_value))
}

pub fn sort_widgets_by_order(widgets: Vec<Widget>, order: &[String]) -> Vec<Widget> {
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

#[tauri::command]
pub fn load_widgets_ordered() -> Result<Vec<Widget>, String> {
    let state = load_state_from_file().unwrap_or_default();

    let widgets: Vec<Widget> = match state.get(StorageKey::KirakiraWidgets) {
        Some(value) => serde_json::from_value(value)
            .map_err(|e| format!("Failed to parse widgets: {}", e))?,
        None => return Ok(Vec::new()),
    };

    let order: Vec<String> = state
        .get(StorageKey::WidgetOrder)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    Ok(sort_widgets_by_order(widgets, &order))
}

#[tauri::command]
pub fn delete_widget_and_save(widget_id: String) -> Result<Vec<Widget>, String> {
    let _lock = STORAGE_MUTEX
        .lock()
        .map_err(|e| format!("Failed to acquire storage lock: {}", e))?;

    let mut state = load_state_from_file().unwrap_or_default();

    let widgets: Vec<Widget> = match state.get(StorageKey::KirakiraWidgets) {
        Some(value) => serde_json::from_value(value)
            .map_err(|e| format!("Failed to parse widgets: {}", e))?,
        None => return Ok(Vec::new()),
    };

    let order: Vec<String> = state
        .get(StorageKey::WidgetOrder)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    let updated_widgets: Vec<Widget> = widgets
        .into_iter()
        .filter(|w| w.id != widget_id)
        .collect();

    let updated_order: Vec<String> = order
        .into_iter()
        .filter(|id| id != &widget_id)
        .collect();

    state.set(
        StorageKey::KirakiraWidgets,
        serde_json::to_value(&updated_widgets)
            .map_err(|e| format!("Failed to serialize widgets: {}", e))?,
    );
    state.set(
        StorageKey::WidgetOrder,
        serde_json::to_value(&updated_order)
            .map_err(|e| format!("Failed to serialize order: {}", e))?,
    );
    save_state_to_file(&state)?;

    Ok(sort_widgets_by_order(updated_widgets, &updated_order))
}

#[tauri::command]
pub fn add_widget_and_save(caption: String, path: String) -> Result<Widget, String> {
    use std::time::{SystemTime, UNIX_EPOCH};

    let _lock = STORAGE_MUTEX
        .lock()
        .map_err(|e| format!("Failed to acquire storage lock: {}", e))?;

    let mut state = load_state_from_file().unwrap_or_default();

    let mut widgets: Vec<Widget> = state
        .get(StorageKey::KirakiraWidgets)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    let mut order: Vec<String> = state
        .get(StorageKey::WidgetOrder)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    let id = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis().to_string())
        .unwrap_or_else(|_| "0".to_string());

    let new_widget = Widget {
        id: id.clone(),
        caption,
        path,
    };

    widgets.push(new_widget.clone());
    order.push(id);

    state.set(
        StorageKey::KirakiraWidgets,
        serde_json::to_value(&widgets)
            .map_err(|e| format!("Failed to serialize widgets: {}", e))?,
    );
    state.set(
        StorageKey::WidgetOrder,
        serde_json::to_value(&order)
            .map_err(|e| format!("Failed to serialize order: {}", e))?,
    );
    save_state_to_file(&state)?;

    Ok(new_widget)
}

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

    let cached = state
        .get(StorageKey::DownloadableVersionsCache)
        .and_then(|v| parse_cache_from_value(&v).ok())
        .unwrap_or_default();

    let merged = merge_downloadable_versions(cached, fresh);

    let cache = DownloadableVersionsCache {
        versions: merged.clone(),
    };
    state.set(
        StorageKey::DownloadableVersionsCache,
        serde_json::to_value(cache).map_err(|e| format!("Failed to serialize cache: {}", e))?,
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
    let cache = DownloadableVersionsCache { versions: vec![] };
    state.set(
        StorageKey::DownloadableVersionsCache,
        serde_json::to_value(cache).map_err(|e| format!("Failed to serialize cache: {}", e))?,
    );
    save_state_to_file(&state)
}
