mod build_deploy;
mod config;
mod data_processing;
mod formatting;
mod mendix;
mod package_manager;
mod storage;
mod utils;
mod validation;
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

pub use build_deploy::{build_and_deploy_from_selections, check_multiple_dist_exists, create_catastrophic_error_result, validate_and_build_deploy, validate_and_deploy_only};
pub use storage::{
    add_widget_and_save, clear_downloadable_versions_cache, delete_widget_and_save,
    load_downloadable_versions_cache, load_from_storage, load_widgets_ordered,
    merge_and_save_downloadable_versions, save_downloadable_versions_cache, save_to_storage,
};
pub use widget_parser::{
    count_all_spec_groups_visible_properties, initialize_property_values,
    load_widget_complete_data, parse_widget_properties_as_spec, read_editor_config,
    transform_properties_to_spec, validate_mendix_widget,
};
pub use widget_preview::{build_and_run_preview, check_dist_exists, run_widget_preview_only};

pub use data_processing::version_utils::{
    calculate_next_page_number, compare_versions, create_version_options, exclude_installed_versions,
    filter_by_version_support_type, filter_downloadable_versions, is_app_version_mismatch,
    is_version_currently_selected, is_version_in_installed_list,
};

pub use formatting::{
    format_apps_batch, format_date, format_date_with_fallback, format_versions_batch,
    get_version_status_text, get_version_validity_badge,
};

pub use validation::{has_build_failures, validate_build_deploy_selections};

pub use data_processing::{
    mendix_filters::{
        create_widget, filter_mendix_versions, process_apps_pipeline, process_widgets_pipeline,
        remove_widget_by_id, Widget,
    },
    FilterOptions, SearchFilter, VersionFilter,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
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
            read_editor_config,
            initialize_property_values,
            remove_widget_by_id,
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
            build_and_deploy_from_selections,
            // ================================================================
            // Storage
            // ================================================================
            save_to_storage,
            load_from_storage,
            load_widgets_ordered,
            delete_widget_and_save,
            add_widget_and_save,
            load_downloadable_versions_cache,
            save_downloadable_versions_cache,
            merge_and_save_downloadable_versions,
            clear_downloadable_versions_cache,
            // ================================================================
            // Version utilities
            // ================================================================
            filter_mendix_versions,
            exclude_installed_versions,
            filter_by_version_support_type,
            filter_downloadable_versions,
            is_version_in_installed_list,
            is_app_version_mismatch,
            is_version_currently_selected,
            calculate_next_page_number,
            create_version_options,
            // ================================================================
            // Formatting
            // ================================================================
            format_date_with_fallback,
            format_date,
            get_version_validity_badge,
            get_version_status_text,
            format_versions_batch,
            format_apps_batch,
            // ================================================================
            // Path utilities
            // ================================================================
            extract_folder_name_from_path,
            // ================================================================
            // Validation
            // ================================================================
            validate_build_deploy_selections,
            has_build_failures,
            // ================================================================
            // Property transformation
            // ================================================================
            transform_properties_to_spec,
            parse_widget_properties_as_spec,
            count_all_spec_groups_visible_properties,
            // ================================================================
            // Consolidated commands (preferred)
            // ================================================================
            load_widget_complete_data,
            validate_and_build_deploy,
            validate_and_deploy_only,
            check_multiple_dist_exists,
            compare_versions,
            process_widgets_pipeline,
            process_apps_pipeline,
            // ================================================================
            // Error handling
            // ================================================================
            create_catastrophic_error_result
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
