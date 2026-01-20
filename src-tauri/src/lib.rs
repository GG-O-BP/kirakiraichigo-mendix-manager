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

pub use build_deploy::{build_and_deploy_from_selections, create_catastrophic_error_result, validate_and_build_deploy};
pub use storage::{
    add_widget_and_save, delete_widget_and_save, load_from_storage, load_widgets_ordered,
    save_to_storage,
};
pub use widget_parser::{
    count_all_spec_groups_visible_properties, initialize_property_values,
    load_widget_complete_data, parse_widget_properties_as_spec, read_editor_config,
    transform_properties_to_spec, validate_mendix_widget,
};
pub use widget_preview::build_widget_for_preview;

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
        create_widget, filter_and_sort_apps_with_priority, filter_apps_by_selected_paths,
        filter_mendix_apps, filter_mendix_versions, filter_widgets, filter_widgets_by_selected_ids,
        remove_widget_by_id, sort_widgets_by_order, Widget,
    },
    FilterOptions, SearchFilter, VersionFilter,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // Mendix version management
            get_installed_mendix_versions,
            launch_studio_pro,
            uninstall_studio_pro_and_wait,
            delete_mendix_app,
            get_apps_by_version,
            get_installed_mendix_apps,
            // Widget installation
            batch_install_widgets,
            // Widget parsing
            validate_mendix_widget,
            read_editor_config,
            initialize_property_values,
            // Web scraper
            get_downloadable_versions_from_datagrid,
            download_and_install_mendix_version,
            // Widget preview & deployment
            build_widget_for_preview,
            build_and_deploy_from_selections,
            // Filtering
            filter_mendix_versions,
            filter_mendix_apps,
            filter_widgets,
            filter_and_sort_apps_with_priority,
            // Storage
            save_to_storage,
            load_from_storage,
            load_widgets_ordered,
            delete_widget_and_save,
            add_widget_and_save,
            // Validation
            validate_build_deploy_selections,
            has_build_failures,
            // Version utilities
            exclude_installed_versions,
            filter_by_version_support_type,
            filter_downloadable_versions,
            is_version_in_installed_list,
            is_app_version_mismatch,
            is_version_currently_selected,
            calculate_next_page_number,
            create_version_options,
            // Formatting
            format_date_with_fallback,
            format_date,
            get_version_validity_badge,
            get_version_status_text,
            // Batch formatting (consolidated)
            format_versions_batch,
            format_apps_batch,
            // Path utilities
            extract_folder_name_from_path,
            // Selection filtering
            filter_widgets_by_selected_ids,
            filter_apps_by_selected_paths,
            // Widget ordering & deletion
            sort_widgets_by_order,
            remove_widget_by_id,
            // Widget creation
            create_widget,
            // Error result
            create_catastrophic_error_result,
            // Property transformation
            transform_properties_to_spec,
            parse_widget_properties_as_spec,
            // Property counting
            count_all_spec_groups_visible_properties,
            // Consolidated commands
            load_widget_complete_data,
            validate_and_build_deploy,
            compare_versions
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
