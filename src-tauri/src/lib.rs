mod config;
mod mendix;
mod package_manager;
mod utils;
mod web_scraper;

mod widget_parser;

pub use config::PackageManagerConfig;
pub use mendix::{
    check_version_folder_exists, delete_mendix_app, get_apps_by_version, get_installed_mendix_apps,
    get_installed_mendix_versions, launch_studio_pro, uninstall_studio_pro, MendixApp,
    MendixVersion,
};
pub use package_manager::run_package_manager_command;
pub use utils::{copy_widget_to_apps, greet};
pub use web_scraper::{
    debug_page_structure, download_and_install_mendix_version, extract_build_number,
    get_download_url_for_version, get_downloadable_mendix_versions,
    get_downloadable_versions_by_type, get_downloadable_versions_from_datagrid,
    wait_for_datagrid_content, BuildInfo, DownloadProgress, DownloadableVersion,
};

pub use widget_parser::parse_widget_properties;

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
            copy_widget_to_apps,
            parse_widget_properties,
            get_downloadable_mendix_versions,
            get_downloadable_versions_by_type,
            get_downloadable_versions_from_datagrid,
            debug_page_structure,
            wait_for_datagrid_content,
            extract_build_number,
            download_and_install_mendix_version,
            get_download_url_for_version
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
