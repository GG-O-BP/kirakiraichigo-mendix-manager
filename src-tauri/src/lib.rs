use chrono::{DateTime, Local};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MendixVersion {
    pub version: String,
    pub path: String,
    pub exe_path: String,
    pub install_date: Option<DateTime<Local>>,
    pub is_valid: bool,
}

impl MendixVersion {
    fn new(version: String, path: String) -> Self {
        let exe_path = format!("{}\\modeler\\studiopro.exe", path);
        let is_valid = Path::new(&exe_path).exists();

        let install_date = if let Ok(metadata) = fs::metadata(&path) {
            metadata
                .created()
                .ok()
                .and_then(|time| {
                    DateTime::from_timestamp(
                        time.duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_secs() as i64,
                        0,
                    )
                })
                .map(|dt| dt.with_timezone(&Local))
        } else {
            None
        };

        Self {
            version,
            path,
            exe_path,
            install_date,
            is_valid,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MendixApp {
    pub name: String,
    pub path: String,
    pub version: Option<String>,
    pub last_modified: Option<DateTime<Local>>,
    pub is_valid: bool,
}

impl MendixApp {
    fn new(name: String, path: String) -> Self {
        let project_settings_path = format!("{}\\project-settings.user.json", path);
        let is_valid = Path::new(&project_settings_path).exists();

        let last_modified = if let Ok(metadata) = fs::metadata(&path) {
            metadata
                .modified()
                .ok()
                .and_then(|time| {
                    DateTime::from_timestamp(
                        time.duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_secs() as i64,
                        0,
                    )
                })
                .map(|dt| dt.with_timezone(&Local))
        } else {
            None
        };

        let version = if is_valid {
            extract_version_from_project_settings(&project_settings_path)
        } else {
            None
        };

        Self {
            name,
            path,
            version,
            last_modified,
            is_valid,
        }
    }
}

fn extract_version_from_project_settings(file_path: &str) -> Option<String> {
    let content = fs::read_to_string(file_path).ok()?;
    let json_value: serde_json::Value = serde_json::from_str(&content).ok()?;

    let settings_parts = json_value.get("settingsParts")?.as_array()?;

    for part in settings_parts {
        if let Some(type_str) = part.get("type").and_then(|t| t.as_str()) {
            if type_str.contains("Version=") {
                let version_regex = Regex::new(r"Version=(\d+\.\d+\.\d+)").ok()?;
                if let Some(captures) = version_regex.captures(type_str) {
                    if let Some(version_match) = captures.get(1) {
                        return Some(version_match.as_str().to_string());
                    }
                }
            }
        }
    }

    None
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_installed_mendix_versions() -> Result<Vec<MendixVersion>, String> {
    let mendix_dir = "C:\\Program Files\\Mendix";

    if !Path::new(mendix_dir).exists() {
        return Ok(Vec::new());
    }

    let version_regex = Regex::new(r"^(\d+\.\d+\.\d+)").map_err(|e| e.to_string())?;
    let mut versions = Vec::new();

    for entry in WalkDir::new(mendix_dir)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.depth() == 1 && entry.file_type().is_dir() {
            if let Some(dir_name) = entry.file_name().to_str() {
                if let Some(captures) = version_regex.captures(dir_name) {
                    if let Some(version_match) = captures.get(1) {
                        let version_str = version_match.as_str().to_string();
                        let path = entry.path().to_string_lossy().to_string();
                        let mendix_version = MendixVersion::new(version_str, path);

                        if mendix_version.is_valid {
                            versions.push(mendix_version);
                        }
                    }
                }
            }
        }
    }

    // Sort versions in descending order (newest first)
    versions.sort_by(|a, b| {
        let parse_version = |version: &str| -> Vec<u32> {
            version.split('.').map(|s| s.parse().unwrap_or(0)).collect()
        };

        let a_parts = parse_version(&a.version);
        let b_parts = parse_version(&b.version);

        b_parts.cmp(&a_parts)
    });

    Ok(versions)
}

#[tauri::command]
fn launch_studio_pro(version: String) -> Result<(), String> {
    let mendix_dir = "C:\\Program Files\\Mendix";
    let version_regex = Regex::new(r"^(\d+\.\d+\.\d+)").map_err(|e| e.to_string())?;

    // Find the directory that starts with the version
    for entry in WalkDir::new(mendix_dir)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.depth() == 1 && entry.file_type().is_dir() {
            if let Some(dir_name) = entry.file_name().to_str() {
                if let Some(captures) = version_regex.captures(dir_name) {
                    if let Some(version_match) = captures.get(1) {
                        if version_match.as_str() == version {
                            let exe_path = entry.path().join("modeler").join("studiopro.exe");

                            if exe_path.exists() {
                                Command::new(&exe_path)
                                    .spawn()
                                    .map_err(|e| format!("Failed to launch Studio Pro: {}", e))?;
                                return Ok(());
                            } else {
                                return Err("Studio Pro executable not found".to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    Err(format!("Version {} not found", version))
}

#[tauri::command]
fn get_installed_mendix_apps() -> Result<Vec<MendixApp>, String> {
    let home_dir = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "Failed to get user home directory")?;
    let mendix_dir = format!("{}\\Mendix", home_dir);

    if !Path::new(&mendix_dir).exists() {
        return Ok(Vec::new());
    }

    let mut apps = Vec::new();

    for entry in WalkDir::new(&mendix_dir)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.depth() == 1 && entry.file_type().is_dir() {
            if let Some(dir_name) = entry.file_name().to_str() {
                let path = entry.path().to_string_lossy().to_string();
                let app = MendixApp::new(dir_name.to_string(), path);

                if app.is_valid {
                    apps.push(app);
                }
            }
        }
    }

    // Sort by last modified date (newest first)
    apps.sort_by(|a, b| match (a.last_modified, b.last_modified) {
        (Some(a_time), Some(b_time)) => b_time.cmp(&a_time),
        (Some(_), None) => std::cmp::Ordering::Less,
        (None, Some(_)) => std::cmp::Ordering::Greater,
        (None, None) => a.name.cmp(&b.name),
    });

    Ok(apps)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_installed_mendix_versions,
            launch_studio_pro,
            get_installed_mendix_apps
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
