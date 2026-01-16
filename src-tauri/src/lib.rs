mod build_deploy;
mod config;
mod data_processing;
mod mendix;
mod package_manager;
mod storage;
mod utils;
mod web_scraper;
mod widget_parser;
mod widget_preview;

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

pub use build_deploy::build_and_deploy_widgets;
pub use storage::{
    clear_app_state, load_app_state, load_from_storage, save_app_state, save_to_storage,
};
pub use widget_parser::{parse_widget_properties, read_editor_config, validate_mendix_widget};
pub use widget_preview::build_widget_for_preview;

pub use data_processing::{
    mendix_filters::{
        filter_and_sort_apps_with_priority, filter_mendix_apps, filter_mendix_versions,
        filter_widgets, paginate_mendix_apps, paginate_mendix_versions,
        sort_apps_by_version_and_date, sort_versions_by_semantic_version, Widget,
    },
    FilterOptions, PaginatedResult, PaginationOptions, SearchFilter, VersionFilter,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
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
            validate_mendix_widget,
            read_editor_config,
            get_downloadable_mendix_versions,
            get_downloadable_versions_by_type,
            get_downloadable_versions_from_datagrid,
            debug_page_structure,
            wait_for_datagrid_content,
            extract_build_number,
            download_and_install_mendix_version,
            get_download_url_for_version,
            build_widget_for_preview,
            build_and_deploy_widgets,
            filter_mendix_versions,
            filter_mendix_apps,
            filter_widgets,
            filter_and_sort_apps_with_priority,
            paginate_mendix_versions,
            paginate_mendix_apps,
            sort_versions_by_semantic_version,
            sort_apps_by_version_and_date,
            save_to_storage,
            load_from_storage,
            save_app_state,
            load_app_state,
            clear_app_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
