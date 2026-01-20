use chrono::{DateTime, Local};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;
use walkdir::WalkDir;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000; // Windows API flag to hide console window

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MendixVersion {
    pub version: String,
    pub path: String,
    pub exe_path: String,
    pub install_date: Option<DateTime<Local>>,
    pub is_valid: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MendixApp {
    pub name: String,
    pub path: String,
    pub version: Option<String>,
    pub last_modified: Option<DateTime<Local>>,
    pub is_valid: bool,
}

fn create_mendix_version(version: String, path: String) -> MendixVersion {
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

fn create_mendix_app(name: String, path: String) -> MendixApp {
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

fn extract_install_date(path: &str) -> Option<DateTime<Local>> {
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

fn extract_last_modified(path: &str) -> Option<DateTime<Local>> {
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

fn extract_version_from_project_settings(file_path: &str) -> Option<String> {
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

fn sort_versions_by_descending(versions: Vec<MendixVersion>) -> Vec<MendixVersion> {
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

fn sort_apps_by_last_modified(apps: Vec<MendixApp>) -> Vec<MendixApp> {
    let mut sorted = apps;
    sorted.sort_by(|a, b| match (a.last_modified, b.last_modified) {
        (Some(a_time), Some(b_time)) => b_time.cmp(&a_time),
        (Some(_), None) => std::cmp::Ordering::Less,
        (None, Some(_)) => std::cmp::Ordering::Greater,
        (None, None) => a.name.cmp(&b.name),
    });
    sorted
}

fn filter_valid_versions(versions: Vec<MendixVersion>) -> Vec<MendixVersion> {
    versions.into_iter().filter(|v| v.is_valid).collect()
}

fn filter_valid_apps(apps: Vec<MendixApp>) -> Vec<MendixApp> {
    apps.into_iter().filter(|app| app.is_valid).collect()
}

fn filter_apps_by_version(apps: Vec<MendixApp>, target_version: &str) -> Vec<MendixApp> {
    apps.into_iter()
        .filter(|app| app.version.as_ref() == Some(&target_version.to_string()))
        .collect()
}

fn scan_mendix_directory(dir_path: &str) -> Result<Vec<(String, String)>, String> {
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

fn extract_version_from_directory_name(dir_name: &str) -> Option<String> {
    Regex::new(r"^(\d+\.\d+\.\d+)")
        .ok()?
        .captures(dir_name)?
        .get(1)
        .map(|m| m.as_str().to_string())
}

fn process_mendix_versions(directory_entries: Vec<(String, String)>) -> Vec<MendixVersion> {
    directory_entries
        .into_iter()
        .filter_map(|(dir_name, path)| {
            extract_version_from_directory_name(&dir_name)
                .map(|version| create_mendix_version(version, path))
        })
        .collect()
}

fn process_mendix_apps(directory_entries: Vec<(String, String)>) -> Vec<MendixApp> {
    directory_entries
        .into_iter()
        .map(|(dir_name, path)| create_mendix_app(dir_name, path))
        .collect()
}

fn construct_exe_path(mendix_dir: &str, version: &str) -> Option<String> {
    let entries = scan_mendix_directory(mendix_dir).ok()?;

    entries
        .into_iter()
        .find(|(dir_name, _)| {
            extract_version_from_directory_name(dir_name).is_some_and(|v| v == version)
        })
        .map(|(_, path)| format!("{}\\modeler\\studiopro.exe", path))
}

fn construct_uninstall_path(mendix_data_dir: &str, version: &str) -> Option<String> {
    let entries = scan_mendix_directory(mendix_data_dir).ok()?;

    entries
        .into_iter()
        .find(|(dir_name, _)| dir_name.starts_with(version))
        .map(|(_, path)| format!("{}\\uninst\\unins000.exe", path))
}

fn get_home_directory() -> Result<String, String> {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "Failed to get user home directory".to_string())
}

fn execute_command(exe_path: &str, args: &[&str]) -> Result<(), String> {
    let mut cmd = Command::new(exe_path);
    cmd.args(args);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    cmd.spawn()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    Ok(())
}

fn remove_directory(path: &str) -> Result<(), String> {
    let path_obj = Path::new(path);

    if !path_obj.exists() {
        return Err("Directory does not exist".to_string());
    }

    if !path_obj.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    fs::remove_dir_all(path_obj).map_err(|e| format!("Failed to delete directory: {}", e))
}

#[tauri::command]
pub fn get_installed_mendix_versions() -> Result<Vec<MendixVersion>, String> {
    let mendix_dir = "C:\\Program Files\\Mendix";

    scan_mendix_directory(mendix_dir)
        .map(process_mendix_versions)
        .map(filter_valid_versions)
        .map(sort_versions_by_descending)
}

#[tauri::command]
pub fn get_installed_mendix_apps() -> Result<Vec<MendixApp>, String> {
    let home_dir = get_home_directory()?;
    let mendix_dir = format!("{}\\Mendix", home_dir);

    scan_mendix_directory(&mendix_dir)
        .map(process_mendix_apps)
        .map(filter_valid_apps)
        .map(sort_apps_by_last_modified)
}

#[tauri::command]
pub fn get_apps_by_version(version: String) -> Result<Vec<MendixApp>, String> {
    let home_dir = get_home_directory()?;
    let mendix_dir = format!("{}\\Mendix", home_dir);

    scan_mendix_directory(&mendix_dir)
        .map(process_mendix_apps)
        .map(filter_valid_apps)
        .map(|apps| filter_apps_by_version(apps, &version))
}

#[tauri::command]
pub fn launch_studio_pro(version: String) -> Result<(), String> {
    let mendix_dir = "C:\\Program Files\\Mendix";

    construct_exe_path(mendix_dir, &version)
        .filter(|path| Path::new(path).exists())
        .ok_or_else(|| format!("Studio Pro executable not found for version {}", version))
        .and_then(|exe_path| execute_command(&exe_path, &[]))
}

// Used internally by uninstall_studio_pro_and_wait
fn uninstall_studio_pro(version: &str) -> Result<(), String> {
    let mendix_data_dir = "C:\\ProgramData\\Mendix";

    construct_uninstall_path(mendix_data_dir, version)
        .filter(|path| Path::new(path).exists())
        .ok_or_else(|| format!("Uninstaller not found for version {}", version))
        .and_then(|uninstall_path| execute_command(&uninstall_path, &["/SILENT"]))
}

#[tauri::command]
pub fn delete_mendix_app(app_path: String) -> Result<(), String> {
    remove_directory(&app_path)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UninstallResult {
    pub success: bool,
    pub version: String,
    pub timed_out: bool,
}

#[tauri::command]
pub async fn uninstall_studio_pro_and_wait(
    version: String,
    timeout_seconds: Option<u64>,
) -> Result<UninstallResult, String> {
    let timeout = timeout_seconds.unwrap_or(60);
    let mendix_dir = "C:\\Program Files\\Mendix";

    uninstall_studio_pro(&version)?;

    let poll_interval = std::time::Duration::from_secs(1);
    let start_time = std::time::Instant::now();
    let timeout_duration = std::time::Duration::from_secs(timeout);

    loop {
        let folder_exists = scan_mendix_directory(mendix_dir)
            .map(|entries| {
                entries
                    .into_iter()
                    .any(|(dir_name, _)| dir_name.starts_with(&version))
            })
            .unwrap_or(false);

        if !folder_exists {
            return Ok(UninstallResult {
                success: true,
                version,
                timed_out: false,
            });
        }

        if start_time.elapsed() >= timeout_duration {
            return Ok(UninstallResult {
                success: false,
                version,
                timed_out: true,
            });
        }

        tokio::time::sleep(poll_interval).await;
    }
}
