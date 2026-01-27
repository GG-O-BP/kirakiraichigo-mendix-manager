mod build_deploy;
mod config;
mod data_processing;
mod formatting;
mod mendix;
mod package_manager;
mod storage;
mod utils;
mod web_scraper;
mod widget_parser;
mod widget_preview;

pub use config::PackageManagerConfig;
pub use mendix::{
    delete_mendix_app, get_apps_by_version, get_installed_mendix_apps,
    get_installed_mendix_versions, launch_studio_pro, uninstall_studio_pro_and_wait, MendixApp,
    MendixVersion,
};
pub use package_manager::{batch_install_widgets, BatchInstallSummary};
pub use utils::extract_folder_name_from_path;
pub use web_scraper::{
    download_and_install_mendix_version, get_downloadable_versions_from_datagrid, BuildInfo,
    DownloadProgress, DownloadableVersion,
};

pub use build_deploy::{check_multiple_dist_exists, create_catastrophic_error_result, validate_and_build_deploy, validate_and_deploy_only};
pub use storage::{
    add_widget_and_save, clear_downloadable_versions_cache, delete_widget_and_save,
    load_downloadable_versions_cache, load_from_storage, load_widgets_ordered,
    merge_and_save_downloadable_versions, save_to_storage,
};
pub use widget_parser::{
    count_all_spec_groups_visible_properties, load_widget_complete_data, validate_mendix_widget,
};
pub use widget_preview::{build_and_run_preview, check_dist_exists, run_widget_preview_only};

pub use data_processing::version_utils::{
    calculate_next_page_number, compare_versions, create_version_options,
    filter_downloadable_versions,
};

pub use formatting::{format_date, format_date_with_fallback, get_version_status_text};


pub use data_processing::{
    mendix_filters::{
        create_widget, filter_mendix_versions, process_apps_pipeline, process_widgets_pipeline,
        Widget,
    },
    FilterOptions, SearchFilter, VersionFilter,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            // ================================================================
            // Mendix version management
            // ================================================================
            get_installed_mendix_versions,
            launch_studio_pro,
            uninstall_studio_pro_and_wait,
            delete_mendix_app,
            get_apps_by_version,
            get_installed_mendix_apps,
            // ================================================================
            // Widget management
            // ================================================================
            batch_install_widgets,
            validate_mendix_widget,
            create_widget,
            // ================================================================
            // Web scraper
            // ================================================================
            get_downloadable_versions_from_datagrid,
            download_and_install_mendix_version,
            // ================================================================
            // Widget preview & build
            // ================================================================
            build_and_run_preview,
            run_widget_preview_only,
            check_dist_exists,
            // ================================================================
            // Storage
            // ================================================================
            save_to_storage,
            load_from_storage,
            load_widgets_ordered,
            delete_widget_and_save,
            add_widget_and_save,
            load_downloadable_versions_cache,
            merge_and_save_downloadable_versions,
            clear_downloadable_versions_cache,
            // ================================================================
            // Version utilities
            // ================================================================
            filter_mendix_versions,
            filter_downloadable_versions,
            calculate_next_page_number,
            create_version_options,
            compare_versions,
            // ================================================================
            // Formatting
            // ================================================================
            format_date_with_fallback,
            format_date,
            get_version_status_text,
            // ================================================================
            // Path utilities
            // ================================================================
            extract_folder_name_from_path,
            // ================================================================
            // Widget data
            // ================================================================
            count_all_spec_groups_visible_properties,
            load_widget_complete_data,
            // ================================================================
            // Build & Deploy
            // ================================================================
            validate_and_build_deploy,
            validate_and_deploy_only,
            check_multiple_dist_exists,
            create_catastrophic_error_result,
            // ================================================================
            // Data processing pipelines
            // ================================================================
            process_widgets_pipeline,
            process_apps_pipeline,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
