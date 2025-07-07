use chrono::{DateTime, Local};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::{Command, Stdio};
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
fn uninstall_studio_pro(version: String) -> Result<(), String> {
    let mendix_data_dir = "C:\\ProgramData\\Mendix";

    // Find the version directory that starts with the version
    for entry in WalkDir::new(mendix_data_dir)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.depth() == 1 && entry.file_type().is_dir() {
            if let Some(dir_name) = entry.file_name().to_str() {
                if dir_name.starts_with(&version) {
                    let uninstall_path = entry.path().join("uninst").join("unins000.exe");

                    if uninstall_path.exists() {
                        Command::new(&uninstall_path)
                            .arg("/SILENT")
                            .spawn()
                            .map_err(|e| format!("Failed to launch uninstaller: {}", e))?;
                        return Ok(());
                    } else {
                        return Err("Uninstaller not found".to_string());
                    }
                }
            }
        }
    }

    Err(format!("Version {} not found for uninstall", version))
}

#[tauri::command]
fn check_version_folder_exists(version: String) -> Result<bool, String> {
    let mendix_dir = "C:\\Program Files\\Mendix";

    if !Path::new(mendix_dir).exists() {
        return Ok(false);
    }

    for entry in WalkDir::new(mendix_dir)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.depth() == 1 && entry.file_type().is_dir() {
            if let Some(dir_name) = entry.file_name().to_str() {
                if dir_name.starts_with(&version) {
                    return Ok(true);
                }
            }
        }
    }

    Ok(false)
}

#[tauri::command]
fn delete_mendix_app(app_path: String) -> Result<(), String> {
    let path = Path::new(&app_path);

    if !path.exists() {
        return Err("App folder does not exist".to_string());
    }

    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    fs::remove_dir_all(path).map_err(|e| format!("Failed to delete app folder: {}", e))?;

    Ok(())
}

#[tauri::command]
fn get_apps_by_version(version: String) -> Result<Vec<MendixApp>, String> {
    let home_dir = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "Failed to get user home directory")?;
    let mendix_dir = format!("{}\\Mendix", home_dir);

    if !Path::new(&mendix_dir).exists() {
        return Ok(Vec::new());
    }

    let mut matching_apps = Vec::new();

    for entry in WalkDir::new(&mendix_dir)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.depth() == 1 && entry.file_type().is_dir() {
            if let Some(dir_name) = entry.file_name().to_str() {
                let path = entry.path().to_string_lossy().to_string();
                let app = MendixApp::new(dir_name.to_string(), path);

                if app.is_valid && app.version.as_ref() == Some(&version) {
                    matching_apps.push(app);
                }
            }
        }
    }

    Ok(matching_apps)
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

#[tauri::command]
fn check_package_manager(package_manager: String) -> Result<String, String> {
    let version_cmd = match package_manager.as_str() {
        "npm" => "npm --version",
        "yarn" => "yarn --version",
        "pnpm" => "pnpm --version",
        "bun" => "bun --version",
        _ => return Err("Invalid package manager".to_string()),
    };

    let mut cmd = if cfg!(target_os = "windows") {
        let mut cmd = Command::new("cmd");
        cmd.arg("/C");
        cmd.arg(version_cmd);
        cmd
    } else {
        let mut cmd = Command::new(&package_manager);
        cmd.arg("--version");
        cmd
    };

    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    match cmd.output() {
        Ok(output) => {
            if output.status.success() {
                let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                Ok(version)
            } else {
                Err(format!(
                    "{} is not installed or not in PATH",
                    package_manager
                ))
            }
        }
        Err(_) => Err(format!(
            "{} is not installed or not in PATH",
            package_manager
        )),
    }
}

#[tauri::command]
fn run_package_manager_command(
    package_manager: String,
    command: String,
    working_directory: String,
) -> Result<String, String> {
    // On Windows, we need to use cmd.exe to run npm/yarn/pnpm/bun
    let mut cmd = if cfg!(target_os = "windows") {
        let mut cmd = Command::new("cmd");
        cmd.arg("/C");

        // Build the full command
        let full_command = format!("{} {}", package_manager, command);
        cmd.arg(&full_command);
        cmd
    } else {
        // On Unix-like systems, run the package manager directly
        let mut cmd = match package_manager.as_str() {
            "npm" => Command::new("npm"),
            "yarn" => Command::new("yarn"),
            "pnpm" => Command::new("pnpm"),
            "bun" => Command::new("bun"),
            _ => return Err("Invalid package manager".to_string()),
        };

        // Parse command arguments
        let args: Vec<&str> = command.split_whitespace().collect();
        for arg in args {
            cmd.arg(arg);
        }
        cmd
    };

    // Set working directory
    cmd.current_dir(&working_directory);

    // Capture output
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    println!(
        "Executing command: {:?} in directory: {}",
        cmd, working_directory
    );

    let output = match cmd.output() {
        Ok(output) => output,
        Err(e) => {
            // Try alternative methods on Windows
            if cfg!(target_os = "windows") && e.kind() == std::io::ErrorKind::NotFound {
                // Try with .cmd extension
                let mut cmd_with_ext = Command::new("cmd");
                cmd_with_ext.arg("/C");
                cmd_with_ext.arg(format!("{}.cmd {}", package_manager, command));
                cmd_with_ext.current_dir(&working_directory);
                cmd_with_ext.stdout(Stdio::piped()).stderr(Stdio::piped());

                if let Ok(output) = cmd_with_ext.output() {
                    output
                } else {
                    // Try with PowerShell as last resort
                    let mut ps_cmd = Command::new("powershell");
                    ps_cmd.arg("-NoProfile");
                    ps_cmd.arg("-Command");
                    ps_cmd.arg(format!("{} {}", package_manager, command));
                    ps_cmd.current_dir(&working_directory);
                    ps_cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

                    match ps_cmd.output() {
                        Ok(output) => output,
                        Err(_) => {
                            return Err(format!(
                                "Failed to execute '{}'. Make sure {} is installed and available in PATH. Error: {}",
                                package_manager, package_manager, e
                            ));
                        }
                    }
                }
            } else {
                return Err(format!(
                    "Failed to execute '{}': {}. Make sure {} is installed and available in PATH.",
                    package_manager, e, package_manager
                ));
            }
        }
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if output.status.success() {
        Ok(stdout.to_string())
    } else {
        Err(format!(
            "Command '{}' failed with exit code {:?}\nOutput:\n{}\nError:\n{}",
            format!("{} {}", package_manager, command),
            output.status.code(),
            stdout,
            stderr
        ))
    }
}

#[tauri::command]
fn copy_widget_to_apps(widget_path: String, app_paths: Vec<String>) -> Result<Vec<String>, String> {
    let source_dir = Path::new(&widget_path).join("dist").join("1.0.0");

    if !source_dir.exists() {
        return Err(format!("Widget dist folder not found: {:?}", source_dir));
    }

    let mut successful_apps = Vec::new();

    for app_path in app_paths {
        let target_dir = Path::new(&app_path).join("widgets");

        // Create widgets directory if it doesn't exist
        if !target_dir.exists() {
            fs::create_dir_all(&target_dir)
                .map_err(|e| format!("Failed to create widgets directory: {}", e))?;
        }

        // Copy all files from source to target
        for entry in WalkDir::new(&source_dir).min_depth(1) {
            let entry = entry.map_err(|e| format!("Failed to read source directory: {}", e))?;
            let source_path = entry.path();

            // Get relative path from source directory
            let relative_path = source_path
                .strip_prefix(&source_dir)
                .map_err(|e| format!("Failed to get relative path: {}", e))?;

            let target_path = target_dir.join(relative_path);

            if entry.file_type().is_dir() {
                fs::create_dir_all(&target_path)
                    .map_err(|e| format!("Failed to create directory: {}", e))?;
            } else {
                // Copy file
                fs::copy(source_path, &target_path)
                    .map_err(|e| format!("Failed to copy file: {}", e))?;
            }
        }

        successful_apps.push(app_path);
    }

    Ok(successful_apps)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_installed_mendix_versions,
            launch_studio_pro,
            uninstall_studio_pro,
            check_version_folder_exists,
            delete_mendix_app,
            get_apps_by_version,
            get_installed_mendix_apps,
            check_package_manager,
            run_package_manager_command,
            copy_widget_to_apps
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
