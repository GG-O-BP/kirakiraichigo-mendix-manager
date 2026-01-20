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
    check_version_folder_exists, delete_mendix_app, get_apps_by_version, get_installed_mendix_apps,
    get_installed_mendix_versions, launch_studio_pro, uninstall_studio_pro,
    uninstall_studio_pro_and_wait, MendixApp, MendixVersion,
};
pub use package_manager::{batch_install_widgets, run_package_manager_command, BatchInstallSummary};
pub use utils::{copy_widget_to_apps, extract_folder_name_from_path, greet};
pub use web_scraper::{
    debug_page_structure, download_and_install_mendix_version, extract_build_number,
    get_download_url_for_version, get_downloadable_mendix_versions,
    get_downloadable_versions_by_type, get_downloadable_versions_from_datagrid,
    wait_for_datagrid_content, BuildInfo, DownloadProgress, DownloadableVersion,
};

pub use build_deploy::{
    build_and_deploy_from_selections, build_and_deploy_widgets, create_catastrophic_error_result,
};
pub use storage::{
    add_widget_and_save, clear_app_state, delete_widget_and_save, load_app_state,
    load_from_storage, load_widgets_ordered, save_app_state, save_to_storage,
};
pub use widget_parser::{
    count_all_groups_visible_properties, count_all_spec_groups_visible_properties,
    count_all_widget_groups_visible_properties, count_visible_properties_in_group,
    count_visible_properties_in_widget_group, extract_all_property_keys_from_groups,
    filter_parsed_properties_by_keys, filter_properties_by_search, get_default_value_for_type,
    get_ui_type_mappings, group_properties_by_category, initialize_property_values,
    is_property_key_in_groups, map_property_type_to_ui_type, parse_widget_properties,
    parse_widget_properties_as_spec, parse_widget_properties_to_parsed, read_editor_config,
    transform_properties_to_spec, transform_widget_definition_to_editor_format,
    validate_mendix_widget, validate_property_value,
};
pub use widget_preview::build_widget_for_preview;

pub use data_processing::version_utils::{
    calculate_next_page_number, create_version_options, exclude_installed_versions,
    filter_by_version_support_type, filter_downloadable_versions, is_app_version_mismatch,
    is_version_currently_selected, is_version_in_installed_list,
};

pub use formatting::{
    extract_searchable_text, format_date, format_date_with_fallback, get_version_status_text,
    get_version_validity_badge, text_matches_search,
};

pub use validation::{has_build_failures, validate_build_deploy_selections, validate_required_fields};

pub use data_processing::{
    mendix_filters::{
        create_widget, filter_and_sort_apps_with_priority, filter_apps_by_selected_paths,
        filter_mendix_apps, filter_mendix_versions, filter_widgets, filter_widgets_by_selected_ids,
        paginate_mendix_apps, paginate_mendix_versions, remove_widget_by_id,
        sort_apps_by_version_and_date, sort_versions_by_semantic_version, sort_widgets_by_order,
        Widget,
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
            uninstall_studio_pro_and_wait,
            check_version_folder_exists,
            delete_mendix_app,
            get_apps_by_version,
            get_installed_mendix_apps,
            run_package_manager_command,
            batch_install_widgets,
            copy_widget_to_apps,
            parse_widget_properties,
            parse_widget_properties_to_parsed,
            validate_mendix_widget,
            validate_property_value,
            read_editor_config,
            map_property_type_to_ui_type,
            get_ui_type_mappings,
            get_default_value_for_type,
            filter_properties_by_search,
            initialize_property_values,
            group_properties_by_category,
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
            build_and_deploy_from_selections,
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
            clear_app_state,
            load_widgets_ordered,
            delete_widget_and_save,
            add_widget_and_save,
            // Validation commands
            validate_build_deploy_selections,
            validate_required_fields,
            has_build_failures,
            // Version utility commands
            exclude_installed_versions,
            filter_by_version_support_type,
            filter_downloadable_versions,
            is_version_in_installed_list,
            is_app_version_mismatch,
            is_version_currently_selected,
            calculate_next_page_number,
            create_version_options,
            // Widget transformation commands
            transform_widget_definition_to_editor_format,
            extract_all_property_keys_from_groups,
            filter_parsed_properties_by_keys,
            is_property_key_in_groups,
            // Formatting commands
            format_date_with_fallback,
            format_date,
            get_version_validity_badge,
            get_version_status_text,
            extract_searchable_text,
            text_matches_search,
            // Path utility commands
            extract_folder_name_from_path,
            // Selection filtering commands
            filter_widgets_by_selected_ids,
            filter_apps_by_selected_paths,
            // Widget ordering & deletion commands
            sort_widgets_by_order,
            remove_widget_by_id,
            // Property count commands
            count_visible_properties_in_group,
            count_visible_properties_in_widget_group,
            count_all_groups_visible_properties,
            count_all_widget_groups_visible_properties,
            // Widget creation commands
            create_widget,
            // Error result commands
            create_catastrophic_error_result,
            // Property transformation commands
            transform_properties_to_spec,
            parse_widget_properties_as_spec,
            // Spec format counting commands
            count_all_spec_groups_visible_properties
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
