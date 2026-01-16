use super::*;
use crate::mendix::{MendixApp, MendixVersion};
use serde::{Deserialize, Serialize};

// ============= Widget Type =============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Widget {
    pub id: String,
    pub caption: String,
    pub path: String,
}

// ============= Mendix Version Extractors =============

pub fn version_extractor_for_version(item: &MendixVersion) -> Option<String> {
    Some(item.version.clone())
}

pub fn date_extractor_for_version(item: &MendixVersion) -> Option<chrono::DateTime<chrono::Local>> {
    item.install_date
}

pub fn is_valid_version(item: &MendixVersion) -> bool {
    item.is_valid
}

pub fn searchable_fields_version(item: &MendixVersion) -> Option<String> {
    Some(format!("{} {}", item.version, item.path))
}

// ============= Mendix App Extractors =============

pub fn version_extractor_for_app(item: &MendixApp) -> Option<String> {
    item.version.clone()
}

pub fn date_extractor_for_app(item: &MendixApp) -> Option<chrono::DateTime<chrono::Local>> {
    item.last_modified
}

pub fn is_valid_app(item: &MendixApp) -> bool {
    item.is_valid
}

pub fn searchable_fields_app(item: &MendixApp) -> Option<String> {
    Some(format!(
        "{} {} {}",
        item.name,
        item.version.as_ref().unwrap_or(&String::new()),
        item.path
    ))
}

// ============= Widget Extractors =============

pub fn searchable_fields_widget(item: &Widget) -> Option<String> {
    Some(format!("{} {}", item.caption, item.path))
}

// ============= Tauri Commands =============

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
pub fn paginate_mendix_versions(
    versions: Vec<MendixVersion>,
    page: usize,
    items_per_page: usize,
) -> Result<PaginatedResult<MendixVersion>, String> {
    let options = PaginationOptions {
        page,
        items_per_page,
    };

    Ok(paginate(versions, &options))
}

#[tauri::command]
pub fn paginate_mendix_apps(
    apps: Vec<MendixApp>,
    page: usize,
    items_per_page: usize,
) -> Result<PaginatedResult<MendixApp>, String> {
    let options = PaginationOptions {
        page,
        items_per_page,
    };

    Ok(paginate(apps, &options))
}

#[tauri::command]
pub fn sort_versions_by_semantic_version(
    versions: Vec<MendixVersion>,
) -> Result<Vec<MendixVersion>, String> {
    Ok(sort_by_version(versions, version_extractor_for_version))
}

#[tauri::command]
pub fn sort_apps_by_version_and_date(apps: Vec<MendixApp>) -> Result<Vec<MendixApp>, String> {
    Ok(sort_by_version_with_date_fallback(
        apps,
        version_extractor_for_app,
        date_extractor_for_app,
    ))
}

#[tauri::command]
pub fn filter_and_sort_apps_with_priority(
    apps: Vec<MendixApp>,
    search_term: Option<String>,
    priority_version: Option<String>,
) -> Result<Vec<MendixApp>, String> {
    // First filter by search term
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

    // Sort by version and date
    let mut sorted = sort_by_version_with_date_fallback(
        filtered,
        version_extractor_for_app,
        date_extractor_for_app,
    );

    // If priority version specified, partition: matching first, then others
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

// ============= Selection Filtering =============

use std::collections::HashSet;

/// Filters widgets by a list of selected IDs
/// Uses HashSet for O(n) performance
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

/// Filters apps by a list of selected paths
/// Uses HashSet for O(n) performance
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

// ============= Widget Ordering & Deletion =============

/// Sorts widgets according to a saved order
/// Widgets not in the order list are appended at the end
#[tauri::command]
pub fn sort_widgets_by_order(
    widgets: Vec<Widget>,
    order: Vec<String>,
) -> Result<Vec<Widget>, String> {
    if order.is_empty() {
        return Ok(widgets);
    }

    // Create a map for O(1) lookup of widget positions
    let order_map: std::collections::HashMap<&String, usize> = order
        .iter()
        .enumerate()
        .map(|(i, id)| (id, i))
        .collect();

    // Partition widgets into ordered and unordered
    let (mut ordered, unordered): (Vec<_>, Vec<_>) = widgets
        .into_iter()
        .partition(|w| order_map.contains_key(&w.id));

    // Sort ordered widgets by their position in the order list
    ordered.sort_by_key(|w| order_map.get(&w.id).copied().unwrap_or(usize::MAX));

    // Append unordered widgets at the end
    ordered.extend(unordered);

    Ok(ordered)
}

/// Removes a widget by its ID
#[tauri::command]
pub fn remove_widget_by_id(
    widgets: Vec<Widget>,
    widget_id: String,
) -> Result<Vec<Widget>, String> {
    Ok(widgets.into_iter().filter(|w| w.id != widget_id).collect())
}

// ============= Tests =============

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

    #[test]
    fn test_paginate_versions() {
        let versions: Vec<MendixVersion> = (1..=25)
            .map(|i| create_test_version(&format!("10.{}.0", i), true))
            .collect();

        let result = paginate_mendix_versions(versions, 0, 10).unwrap();
        assert_eq!(result.items.len(), 10);
        assert_eq!(result.total_pages, 3);
        assert!(result.has_next_page);
    }

    #[test]
    fn test_sort_versions() {
        let versions = vec![
            create_test_version("1.0.0", true),
            create_test_version("10.4.0", true),
            create_test_version("2.0.0", true),
        ];

        let result = sort_versions_by_semantic_version(versions).unwrap();
        assert_eq!(result[0].version, "10.4.0");
        assert_eq!(result[1].version, "2.0.0");
        assert_eq!(result[2].version, "1.0.0");
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
}
