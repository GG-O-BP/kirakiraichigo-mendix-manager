use chrono::{DateTime, Local};
use regex::Regex;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

use super::models::{MendixApp, MendixVersion};

/// Extract installation date from directory metadata
pub fn extract_install_date(path: &str) -> Option<DateTime<Local>> {
    fs::metadata(path)
        .ok()
        .and_then(|metadata| metadata.created().ok())
        .and_then(|time| {
            DateTime::from_timestamp(
                time.duration_since(std::time::UNIX_EPOCH).ok()?.as_secs() as i64,
                0,
            )
        })
        .map(|dt| dt.with_timezone(&Local))
}

/// Extract last modified date from directory metadata
pub fn extract_last_modified(path: &str) -> Option<DateTime<Local>> {
    fs::metadata(path)
        .ok()
        .and_then(|metadata| metadata.modified().ok())
        .and_then(|time| {
            DateTime::from_timestamp(
                time.duration_since(std::time::UNIX_EPOCH).ok()?.as_secs() as i64,
                0,
            )
        })
        .map(|dt| dt.with_timezone(&Local))
}

/// Extract version from project settings JSON file
pub fn extract_version_from_project_settings(file_path: &str) -> Option<String> {
    let content = fs::read_to_string(file_path).ok()?;
    let json_value: serde_json::Value = serde_json::from_str(&content).ok()?;

    json_value
        .get("settingsParts")?
        .as_array()?
        .iter()
        .filter_map(|part| part.get("type")?.as_str())
        .find(|type_str| type_str.contains("Version="))
        .and_then(|type_str| {
            Regex::new(r"Version=(\d+\.\d+\.\d+)")
                .ok()?
                .captures(type_str)?
                .get(1)
                .map(|m| m.as_str().to_string())
        })
}

/// Extract version number from directory name (e.g., "10.4.0.1234" -> "10.4.0")
pub fn extract_version_from_directory_name(dir_name: &str) -> Option<String> {
    Regex::new(r"^(\d+\.\d+\.\d+)")
        .ok()?
        .captures(dir_name)?
        .get(1)
        .map(|m| m.as_str().to_string())
}

/// Scan a directory and return list of (name, path) tuples for subdirectories
pub fn scan_mendix_directory(dir_path: &str) -> Result<Vec<(String, String)>, String> {
    if !Path::new(dir_path).exists() {
        return Ok(Vec::new());
    }

    WalkDir::new(dir_path)
        .max_depth(1)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.depth() == 1 && entry.file_type().is_dir())
        .filter_map(|entry| {
            entry
                .file_name()
                .to_str()
                .map(|name| (name.to_string(), entry.path().to_string_lossy().to_string()))
        })
        .map(|(name, path)| Ok((name, path)))
        .collect()
}

/// Create a MendixVersion from version string and path
pub fn create_mendix_version(version: String, path: String) -> MendixVersion {
    let exe_path = format!("{}\\modeler\\studiopro.exe", path);
    let is_valid = Path::new(&exe_path).exists();
    let install_date = extract_install_date(&path);

    MendixVersion {
        version,
        path,
        exe_path,
        install_date,
        is_valid,
    }
}

/// Create a MendixApp from name and path
pub fn create_mendix_app(name: String, path: String) -> MendixApp {
    let project_settings_path = format!("{}\\project-settings.user.json", path);
    let is_valid = Path::new(&project_settings_path).exists();
    let last_modified = extract_last_modified(&path);
    let version = if is_valid {
        extract_version_from_project_settings(&project_settings_path)
    } else {
        None
    };

    MendixApp {
        name,
        path,
        version,
        last_modified,
        is_valid,
    }
}

/// Process directory entries into MendixVersions
pub fn process_mendix_versions(directory_entries: Vec<(String, String)>) -> Vec<MendixVersion> {
    directory_entries
        .into_iter()
        .filter_map(|(dir_name, path)| {
            extract_version_from_directory_name(&dir_name)
                .map(|version| create_mendix_version(version, path))
        })
        .collect()
}

/// Process directory entries into MendixApps
pub fn process_mendix_apps(directory_entries: Vec<(String, String)>) -> Vec<MendixApp> {
    directory_entries
        .into_iter()
        .map(|(dir_name, path)| create_mendix_app(dir_name, path))
        .collect()
}

/// Sort versions in descending order (newest first)
pub fn sort_versions_by_descending(versions: Vec<MendixVersion>) -> Vec<MendixVersion> {
    let mut sorted = versions;
    sorted.sort_by(|a, b| {
        let parse_version = |version: &str| -> Vec<u32> {
            version.split('.').map(|s| s.parse().unwrap_or(0)).collect()
        };

        let a_parts = parse_version(&a.version);
        let b_parts = parse_version(&b.version);
        b_parts.cmp(&a_parts)
    });
    sorted
}

/// Sort apps by last modified date (newest first)
pub fn sort_apps_by_last_modified(apps: Vec<MendixApp>) -> Vec<MendixApp> {
    let mut sorted = apps;
    sorted.sort_by(|a, b| match (a.last_modified, b.last_modified) {
        (Some(a_time), Some(b_time)) => b_time.cmp(&a_time),
        (Some(_), None) => std::cmp::Ordering::Less,
        (None, Some(_)) => std::cmp::Ordering::Greater,
        (None, None) => a.name.cmp(&b.name),
    });
    sorted
}

/// Filter to only valid versions (with existing exe)
pub fn filter_valid_versions(versions: Vec<MendixVersion>) -> Vec<MendixVersion> {
    versions.into_iter().filter(|v| v.is_valid).collect()
}

/// Filter to only valid apps (with existing project settings)
pub fn filter_valid_apps(apps: Vec<MendixApp>) -> Vec<MendixApp> {
    apps.into_iter().filter(|app| app.is_valid).collect()
}

/// Filter apps by specific version
pub fn filter_apps_by_version(apps: Vec<MendixApp>, target_version: &str) -> Vec<MendixApp> {
    apps.into_iter()
        .filter(|app| app.version.as_ref() == Some(&target_version.to_string()))
        .collect()
}
