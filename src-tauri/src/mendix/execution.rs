use std::fs;
use std::path::Path;
use std::process::Command;

use super::models::{MendixApp, MendixVersion, UninstallResult};
use super::paths::{
    construct_exe_path, construct_uninstall_path, get_mendix_apps_directory, MENDIX_DATA_DIR,
    MENDIX_INSTALL_DIR,
};
use super::scanner::{
    filter_apps_by_version, filter_valid_apps, filter_valid_versions, process_mendix_apps,
    process_mendix_versions, scan_mendix_directory, sort_apps_by_last_modified,
    sort_versions_by_descending,
};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Execute a command without showing a console window
fn execute_command(exe_path: &str, args: &[&str]) -> Result<(), String> {
    let mut cmd = Command::new(exe_path);
    cmd.args(args);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    cmd.spawn()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    Ok(())
}

/// Remove a directory recursively
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

/// Start the uninstaller for a Mendix version
fn uninstall_studio_pro(version: &str) -> Result<(), String> {
    construct_uninstall_path(MENDIX_DATA_DIR, version)
        .filter(|path| Path::new(path).exists())
        .ok_or_else(|| format!("Uninstaller not found for version {}", version))
        .and_then(|uninstall_path| execute_command(&uninstall_path, &["/SILENT"]))
}

#[tauri::command]
pub fn get_installed_mendix_versions() -> Result<Vec<MendixVersion>, String> {
    scan_mendix_directory(MENDIX_INSTALL_DIR)
        .map(process_mendix_versions)
        .map(filter_valid_versions)
        .map(sort_versions_by_descending)
}

#[tauri::command]
pub fn get_installed_mendix_apps() -> Result<Vec<MendixApp>, String> {
    let mendix_dir = get_mendix_apps_directory()?;

    scan_mendix_directory(&mendix_dir)
        .map(process_mendix_apps)
        .map(filter_valid_apps)
        .map(sort_apps_by_last_modified)
}

#[tauri::command]
pub fn get_apps_by_version(version: String) -> Result<Vec<MendixApp>, String> {
    let mendix_dir = get_mendix_apps_directory()?;

    scan_mendix_directory(&mendix_dir)
        .map(process_mendix_apps)
        .map(filter_valid_apps)
        .map(|apps| filter_apps_by_version(apps, &version))
}

#[tauri::command]
pub fn launch_studio_pro(version: String) -> Result<(), String> {
    construct_exe_path(MENDIX_INSTALL_DIR, &version)
        .filter(|path| Path::new(path).exists())
        .ok_or_else(|| format!("Studio Pro executable not found for version {}", version))
        .and_then(|exe_path| execute_command(&exe_path, &[]))
}

#[tauri::command]
pub fn delete_mendix_app(app_path: String) -> Result<(), String> {
    remove_directory(&app_path)
}

#[tauri::command]
pub async fn uninstall_studio_pro_and_wait(
    version: String,
    timeout_seconds: Option<u64>,
) -> Result<UninstallResult, String> {
    let timeout = timeout_seconds.unwrap_or(60);

    uninstall_studio_pro(&version)?;

    let poll_interval = std::time::Duration::from_secs(1);
    let start_time = std::time::Instant::now();
    let timeout_duration = std::time::Duration::from_secs(timeout);

    loop {
        let folder_exists = scan_mendix_directory(MENDIX_INSTALL_DIR)
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
