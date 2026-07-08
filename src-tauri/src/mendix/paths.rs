use super::scanner::{extract_version_from_directory_name, scan_mendix_directory};

/// Default Mendix installation directory
const DEFAULT_MENDIX_INSTALL_DIR: &str = "C:\\Program Files\\Mendix";

/// Default Mendix data directory (for uninstallers)
const DEFAULT_MENDIX_DATA_DIR: &str = "C:\\ProgramData\\Mendix";

/// Mendix installation directory, overridable via the KIRAICHI_MENDIX_INSTALL_DIR
/// environment variable for non-default installs.
pub fn mendix_install_dir() -> String {
    std::env::var("KIRAICHI_MENDIX_INSTALL_DIR")
        .unwrap_or_else(|_| DEFAULT_MENDIX_INSTALL_DIR.to_string())
}

/// Mendix data directory (uninstallers), overridable via KIRAICHI_MENDIX_DATA_DIR.
pub fn mendix_data_dir() -> String {
    std::env::var("KIRAICHI_MENDIX_DATA_DIR")
        .unwrap_or_else(|_| DEFAULT_MENDIX_DATA_DIR.to_string())
}

/// Get user home directory from environment
pub fn get_home_directory() -> Result<String, String> {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "Failed to get user home directory".to_string())
}

/// Get Mendix apps directory for current user
pub fn get_mendix_apps_directory() -> Result<String, String> {
    let home_dir = get_home_directory()?;
    Ok(format!("{}\\Mendix", home_dir))
}

/// Construct the full exe path for a specific Mendix version
pub fn construct_exe_path(mendix_dir: &str, version: &str) -> Option<String> {
    let entries = scan_mendix_directory(mendix_dir).ok()?;

    entries
        .into_iter()
        .find(|(dir_name, _)| {
            extract_version_from_directory_name(dir_name).is_some_and(|v| v == version)
        })
        .map(|(_, path)| format!("{}\\modeler\\studiopro.exe", path))
}

/// Construct the uninstaller path for a specific Mendix version
pub fn construct_uninstall_path(mendix_data_dir: &str, version: &str) -> Option<String> {
    let entries = scan_mendix_directory(mendix_data_dir).ok()?;

    entries
        .into_iter()
        .find(|(dir_name, _)| dir_name.starts_with(version))
        .map(|(_, path)| format!("{}\\uninst\\unins000.exe", path))
}
