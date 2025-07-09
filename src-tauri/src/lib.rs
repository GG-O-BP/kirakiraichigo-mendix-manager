mod config;
mod mendix;
mod package_manager;
mod utils;

pub use config::PackageManagerConfig;
pub use mendix::{
    check_version_folder_exists, delete_mendix_app, get_apps_by_version, get_installed_mendix_apps,
    get_installed_mendix_versions, launch_studio_pro, uninstall_studio_pro, MendixApp,
    MendixVersion,
};
pub use package_manager::run_package_manager_command;
pub use utils::{copy_widget_to_apps, greet};

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
            run_package_manager_command,
            copy_widget_to_apps
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
