use super::*;
use crate::mendix::{MendixApp, MendixVersion};
use serde::Deserialize;
use std::collections::HashSet;

// Re-export types and functions from sub-modules for backward compatibility
pub use super::extractors::{
    date_extractor_for_app, date_extractor_for_version, is_valid_app, is_valid_version,
    searchable_fields_app, searchable_fields_version, version_extractor_for_app,
    version_extractor_for_version,
};
pub use super::widget::{searchable_fields_widget, Widget};

#[tauri::command]
pub fn filter_mendix_versions(
    versions: Vec<MendixVersion>,
    search_term: Option<String>,
    only_valid: bool,
) -> Result<Vec<MendixVersion>, String> {
    let filter_options = FilterOptions {
        search: search_term.map(|term| SearchFilter {
            search_term: term,
            case_sensitive: false,
        }),
        version: Some(VersionFilter {
            target_version: None,
            only_valid,
        }),
    };

    Ok(apply_filters_and_sort(
        versions,
        &filter_options,
        &[searchable_fields_version],
        version_extractor_for_version,
        date_extractor_for_version,
        is_valid_version,
    ))
}

#[tauri::command]
pub fn filter_mendix_apps(
    apps: Vec<MendixApp>,
    search_term: Option<String>,
    target_version: Option<String>,
    only_valid: bool,
) -> Result<Vec<MendixApp>, String> {
    let filter_options = FilterOptions {
        search: search_term.map(|term| SearchFilter {
            search_term: term,
            case_sensitive: false,
        }),
        version: Some(VersionFilter {
            target_version,
            only_valid,
        }),
    };

    Ok(apply_filters_and_sort(
        apps,
        &filter_options,
        &[searchable_fields_app],
        version_extractor_for_app,
        date_extractor_for_app,
        is_valid_app,
    ))
}

#[tauri::command]
pub fn filter_and_sort_apps_with_priority(
    apps: Vec<MendixApp>,
    search_term: Option<String>,
    priority_version: Option<String>,
) -> Result<Vec<MendixApp>, String> {
    let filtered = if let Some(term) = search_term {
        if !term.trim().is_empty() {
            let search_filter = SearchFilter {
                search_term: term,
                case_sensitive: false,
            };
            filter_by_search(apps, &search_filter, &[searchable_fields_app])
        } else {
            apps
        }
    } else {
        apps
    };

    let mut sorted = sort_by_version_with_date_fallback(
        filtered,
        version_extractor_for_app,
        date_extractor_for_app,
    );

    if let Some(priority_ver) = priority_version {
        let (matching, non_matching): (Vec<_>, Vec<_>) = sorted
            .into_iter()
            .partition(|app| app.version.as_ref() == Some(&priority_ver));

        sorted = matching;
        sorted.extend(non_matching);
    }

    Ok(sorted)
}

#[tauri::command]
pub fn filter_widgets(
    widgets: Vec<Widget>,
    search_term: Option<String>,
) -> Result<Vec<Widget>, String> {
    if let Some(term) = search_term {
        if term.trim().is_empty() {
            return Ok(widgets);
        }

        let search_filter = SearchFilter {
            search_term: term,
            case_sensitive: false,
        };

        Ok(filter_by_search(
            widgets,
            &search_filter,
            &[searchable_fields_widget],
        ))
    } else {
        Ok(widgets)
    }
}

#[tauri::command]
pub fn filter_widgets_by_selected_ids(
    widgets: Vec<Widget>,
    selected_ids: Vec<String>,
) -> Result<Vec<Widget>, String> {
    let id_set: HashSet<&String> = selected_ids.iter().collect();
    Ok(widgets
        .into_iter()
        .filter(|w| id_set.contains(&w.id))
        .collect())
}

#[tauri::command]
pub fn filter_apps_by_selected_paths(
    apps: Vec<MendixApp>,
    selected_paths: Vec<String>,
) -> Result<Vec<MendixApp>, String> {
    let path_set: HashSet<&String> = selected_paths.iter().collect();
    Ok(apps
        .into_iter()
        .filter(|a| path_set.contains(&a.path))
        .collect())
}

#[tauri::command]
pub fn sort_widgets_by_order(
    widgets: Vec<Widget>,
    order: Vec<String>,
) -> Result<Vec<Widget>, String> {
    if order.is_empty() {
        return Ok(widgets);
    }

    let order_map: std::collections::HashMap<&String, usize> = order
        .iter()
        .enumerate()
        .map(|(i, id)| (id, i))
        .collect();

    let (mut ordered, unordered): (Vec<_>, Vec<_>) = widgets
        .into_iter()
        .partition(|w| order_map.contains_key(&w.id));

    ordered.sort_by_key(|w| order_map.get(&w.id).copied().unwrap_or(usize::MAX));
    ordered.extend(unordered);

    Ok(ordered)
}

#[tauri::command]
pub fn remove_widget_by_id(
    widgets: Vec<Widget>,
    widget_id: String,
) -> Result<Vec<Widget>, String> {
    Ok(widgets.into_iter().filter(|w| w.id != widget_id).collect())
}

// Tauri command wrapper for create_widget
#[tauri::command]
pub fn create_widget(caption: String, path: String) -> Result<Widget, String> {
    super::widget::create_widget(caption, path)
}

// ============================================================================
// Consolidated Pipeline Commands
// ============================================================================

/// Parameters for the widget processing pipeline
#[derive(Debug, Clone, Deserialize)]
pub struct ProcessWidgetsParams {
    pub widgets: Vec<Widget>,
    pub search_term: Option<String>,
    pub selected_ids: Option<Vec<String>>,
    pub order: Option<Vec<String>>,
}

/// Consolidated widget processing pipeline that combines:
/// - filter_widgets (search filtering)
/// - filter_widgets_by_selected_ids (ID filtering)
/// - sort_widgets_by_order (custom ordering)
///
/// Operations are applied in order: search -> select -> sort
#[tauri::command]
pub fn process_widgets_pipeline(params: ProcessWidgetsParams) -> Result<Vec<Widget>, String> {
    let mut result = params.widgets;

    // Step 1: Apply search filter
    if let Some(term) = &params.search_term {
        if !term.trim().is_empty() {
            let search_filter = SearchFilter {
                search_term: term.clone(),
                case_sensitive: false,
            };
            result = filter_by_search(result, &search_filter, &[searchable_fields_widget]);
        }
    }

    // Step 2: Filter by selected IDs
    if let Some(ids) = &params.selected_ids {
        if !ids.is_empty() {
            let id_set: HashSet<&String> = ids.iter().collect();
            result = result.into_iter().filter(|w| id_set.contains(&w.id)).collect();
        }
    }

    // Step 3: Apply custom ordering
    if let Some(order) = &params.order {
        if !order.is_empty() {
            let order_map: std::collections::HashMap<&String, usize> = order
                .iter()
                .enumerate()
                .map(|(i, id)| (id, i))
                .collect();

            let (mut ordered, unordered): (Vec<_>, Vec<_>) = result
                .into_iter()
                .partition(|w| order_map.contains_key(&w.id));

            ordered.sort_by_key(|w| order_map.get(&w.id).copied().unwrap_or(usize::MAX));
            ordered.extend(unordered);
            result = ordered;
        }
    }

    Ok(result)
}

/// Parameters for the app processing pipeline
#[derive(Debug, Clone, Deserialize)]
pub struct ProcessAppsParams {
    pub apps: Vec<MendixApp>,
    pub search_term: Option<String>,
    pub target_version: Option<String>,
    pub selected_paths: Option<Vec<String>>,
    pub priority_version: Option<String>,
    pub only_valid: Option<bool>,
}

/// Consolidated app processing pipeline that combines:
/// - filter_mendix_apps (search/version/validity filtering)
/// - filter_apps_by_selected_paths (path filtering)
/// - filter_and_sort_apps_with_priority (priority sorting)
///
/// Operations are applied in order: validity -> version -> search -> select -> priority sort
#[tauri::command]
pub fn process_apps_pipeline(params: ProcessAppsParams) -> Result<Vec<MendixApp>, String> {
    let mut result = params.apps;
    let only_valid = params.only_valid.unwrap_or(true);

    // Step 1: Filter by validity
    if only_valid {
        result = result.into_iter().filter(is_valid_app).collect();
    }

    // Step 2: Filter by target version
    if let Some(target_ver) = &params.target_version {
        result = result
            .into_iter()
            .filter(|app| app.version.as_ref() == Some(target_ver))
            .collect();
    }

    // Step 3: Apply search filter
    if let Some(term) = &params.search_term {
        if !term.trim().is_empty() {
            let search_filter = SearchFilter {
                search_term: term.clone(),
                case_sensitive: false,
            };
            result = filter_by_search(result, &search_filter, &[searchable_fields_app]);
        }
    }

    // Step 4: Filter by selected paths
    if let Some(paths) = &params.selected_paths {
        if !paths.is_empty() {
            let path_set: HashSet<&String> = paths.iter().collect();
            result = result.into_iter().filter(|a| path_set.contains(&a.path)).collect();
        }
    }

    // Step 5: Sort by version with date fallback
    result = sort_by_version_with_date_fallback(
        result,
        version_extractor_for_app,
        date_extractor_for_app,
    );

    // Step 6: Apply priority version (move matching apps to top)
    if let Some(priority_ver) = &params.priority_version {
        let (matching, non_matching): (Vec<_>, Vec<_>) = result
            .into_iter()
            .partition(|app| app.version.as_ref() == Some(priority_ver));

        result = matching;
        result.extend(non_matching);
    }

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Local;

    fn create_test_version(version: &str, is_valid: bool) -> MendixVersion {
        MendixVersion {
            version: version.to_string(),
            path: format!("C:\\Program Files\\Mendix\\{}", version),
            exe_path: format!(
                "C:\\Program Files\\Mendix\\{}\\modeler\\studiopro.exe",
                version
            ),
            install_date: Some(Local::now()),
            is_valid,
        }
    }

    fn create_test_app(name: &str, version: Option<&str>, is_valid: bool) -> MendixApp {
        MendixApp {
            name: name.to_string(),
            path: format!("C:\\Users\\Test\\Mendix\\{}", name),
            version: version.map(|v| v.to_string()),
            last_modified: Some(Local::now()),
            is_valid,
        }
    }

    #[test]
    fn test_filter_mendix_versions() {
        let versions = vec![
            create_test_version("10.4.0", true),
            create_test_version("10.3.0", true),
            create_test_version("9.24.0", false),
        ];

        let result = filter_mendix_versions(versions, None, true).unwrap();
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].version, "10.4.0");
    }

    #[test]
    fn test_filter_mendix_apps() {
        let apps = vec![
            create_test_app("App1", Some("10.4.0"), true),
            create_test_app("App2", Some("10.3.0"), true),
            create_test_app("App3", Some("10.4.0"), false),
        ];

        let result = filter_mendix_apps(apps, None, Some("10.4.0".to_string()), true).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name, "App1");
    }

    #[test]
    fn test_search_filter_apps() {
        let apps = vec![
            create_test_app("MyWidget", Some("10.4.0"), true),
            create_test_app("MyApp", Some("10.3.0"), true),
            create_test_app("Component", Some("10.4.0"), true),
        ];

        let result = filter_mendix_apps(apps, Some("my".to_string()), None, true).unwrap();
        assert_eq!(result.len(), 2);
    }

    fn create_test_widget(id: &str, caption: &str) -> Widget {
        Widget {
            id: id.to_string(),
            caption: caption.to_string(),
            path: format!("C:\\widgets\\{}", id),
        }
    }

    #[test]
    fn test_filter_widgets_by_selected_ids() {
        let widgets = vec![
            create_test_widget("1", "Widget A"),
            create_test_widget("2", "Widget B"),
            create_test_widget("3", "Widget C"),
        ];

        let selected = vec!["1".to_string(), "3".to_string()];
        let result = filter_widgets_by_selected_ids(widgets, selected).unwrap();

        assert_eq!(result.len(), 2);
        assert_eq!(result[0].id, "1");
        assert_eq!(result[1].id, "3");
    }

    #[test]
    fn test_filter_apps_by_selected_paths() {
        let apps = vec![
            create_test_app("App1", Some("10.0.0"), true),
            create_test_app("App2", Some("10.0.0"), true),
            create_test_app("App3", Some("10.0.0"), true),
        ];

        let selected = vec![apps[0].path.clone(), apps[2].path.clone()];
        let result = filter_apps_by_selected_paths(apps, selected).unwrap();

        assert_eq!(result.len(), 2);
        assert_eq!(result[0].name, "App1");
        assert_eq!(result[1].name, "App3");
    }

    #[test]
    fn test_sort_widgets_by_order() {
        let widgets = vec![
            create_test_widget("1", "Widget A"),
            create_test_widget("2", "Widget B"),
            create_test_widget("3", "Widget C"),
            create_test_widget("4", "Widget D"),
        ];

        // Order specifies: 3, 1, 2 (widget 4 is not in order)
        let order = vec!["3".to_string(), "1".to_string(), "2".to_string()];
        let result = sort_widgets_by_order(widgets, order).unwrap();

        assert_eq!(result.len(), 4);
        assert_eq!(result[0].id, "3");
        assert_eq!(result[1].id, "1");
        assert_eq!(result[2].id, "2");
        assert_eq!(result[3].id, "4"); // Unordered widget at the end
    }

    #[test]
    fn test_sort_widgets_by_order_empty() {
        let widgets = vec![
            create_test_widget("1", "Widget A"),
            create_test_widget("2", "Widget B"),
        ];

        let order: Vec<String> = vec![];
        let result = sort_widgets_by_order(widgets.clone(), order).unwrap();

        assert_eq!(result.len(), 2);
        assert_eq!(result[0].id, "1");
        assert_eq!(result[1].id, "2");
    }

    #[test]
    fn test_remove_widget_by_id() {
        let widgets = vec![
            create_test_widget("1", "Widget A"),
            create_test_widget("2", "Widget B"),
            create_test_widget("3", "Widget C"),
        ];

        let result = remove_widget_by_id(widgets, "2".to_string()).unwrap();

        assert_eq!(result.len(), 2);
        assert_eq!(result[0].id, "1");
        assert_eq!(result[1].id, "3");
    }

    #[test]
    fn test_remove_widget_by_id_not_found() {
        let widgets = vec![
            create_test_widget("1", "Widget A"),
            create_test_widget("2", "Widget B"),
        ];

        let result = remove_widget_by_id(widgets, "99".to_string()).unwrap();

        assert_eq!(result.len(), 2);
    }

    // =========================================================================
    // Consolidated Pipeline Tests
    // =========================================================================

    #[test]
    fn test_process_widgets_pipeline_search_only() {
        let widgets = vec![
            create_test_widget("1", "Alpha Dropdown"),
            create_test_widget("2", "Beta Dropdown"),
            create_test_widget("3", "Gamma Textbox"),
        ];

        let params = ProcessWidgetsParams {
            widgets,
            search_term: Some("Dropdown".to_string()),
            selected_ids: None,
            order: None,
        };

        let result = process_widgets_pipeline(params).unwrap();
        assert_eq!(result.len(), 2);
        assert!(result.iter().all(|w| w.caption.contains("Dropdown")));
    }

    #[test]
    fn test_process_widgets_pipeline_select_and_order() {
        let widgets = vec![
            create_test_widget("1", "Widget A"),
            create_test_widget("2", "Widget B"),
            create_test_widget("3", "Widget C"),
            create_test_widget("4", "Widget D"),
        ];

        let params = ProcessWidgetsParams {
            widgets,
            search_term: None,
            selected_ids: Some(vec!["1".to_string(), "3".to_string(), "4".to_string()]),
            order: Some(vec!["4".to_string(), "1".to_string(), "3".to_string()]),
        };

        let result = process_widgets_pipeline(params).unwrap();
        assert_eq!(result.len(), 3);
        assert_eq!(result[0].id, "4");
        assert_eq!(result[1].id, "1");
        assert_eq!(result[2].id, "3");
    }

    #[test]
    fn test_process_widgets_pipeline_full() {
        let widgets = vec![
            create_test_widget("1", "Widget Alpha"),
            create_test_widget("2", "Widget Beta"),
            create_test_widget("3", "Component Gamma"),
            create_test_widget("4", "Widget Delta"),
        ];

        let params = ProcessWidgetsParams {
            widgets,
            search_term: Some("Widget".to_string()),
            selected_ids: Some(vec!["1".to_string(), "2".to_string(), "4".to_string()]),
            order: Some(vec!["4".to_string(), "2".to_string(), "1".to_string()]),
        };

        let result = process_widgets_pipeline(params).unwrap();
        assert_eq!(result.len(), 3);
        assert_eq!(result[0].id, "4");
        assert_eq!(result[1].id, "2");
        assert_eq!(result[2].id, "1");
    }

    #[test]
    fn test_process_apps_pipeline_search_and_version() {
        let apps = vec![
            create_test_app("MyApp1", Some("10.4.0"), true),
            create_test_app("MyApp2", Some("10.3.0"), true),
            create_test_app("OtherApp", Some("10.4.0"), true),
            create_test_app("MyApp3", Some("10.4.0"), false),
        ];

        let params = ProcessAppsParams {
            apps,
            search_term: Some("MyApp".to_string()),
            target_version: Some("10.4.0".to_string()),
            selected_paths: None,
            priority_version: None,
            only_valid: Some(true),
        };

        let result = process_apps_pipeline(params).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name, "MyApp1");
    }

    #[test]
    fn test_process_apps_pipeline_with_priority() {
        let apps = vec![
            create_test_app("App1", Some("10.4.0"), true),
            create_test_app("App2", Some("10.3.0"), true),
            create_test_app("App3", Some("10.3.0"), true),
            create_test_app("App4", Some("10.4.0"), true),
        ];

        let params = ProcessAppsParams {
            apps,
            search_term: None,
            target_version: None,
            selected_paths: None,
            priority_version: Some("10.3.0".to_string()),
            only_valid: Some(true),
        };

        let result = process_apps_pipeline(params).unwrap();
        assert_eq!(result.len(), 4);
        // 10.3.0 apps should be first due to priority
        assert_eq!(result[0].version.as_ref().unwrap(), "10.3.0");
        assert_eq!(result[1].version.as_ref().unwrap(), "10.3.0");
    }

    #[test]
    fn test_process_apps_pipeline_selected_paths() {
        let apps = vec![
            create_test_app("App1", Some("10.4.0"), true),
            create_test_app("App2", Some("10.3.0"), true),
            create_test_app("App3", Some("10.5.0"), true),
        ];

        let selected = vec![apps[0].path.clone(), apps[2].path.clone()];

        let params = ProcessAppsParams {
            apps,
            search_term: None,
            target_version: None,
            selected_paths: Some(selected),
            priority_version: None,
            only_valid: Some(true),
        };

        let result = process_apps_pipeline(params).unwrap();
        assert_eq!(result.len(), 2);
        // Sorted by version descending: 10.5.0 first, then 10.4.0
        assert_eq!(result[0].name, "App3");
        assert_eq!(result[1].name, "App1");
    }
}
