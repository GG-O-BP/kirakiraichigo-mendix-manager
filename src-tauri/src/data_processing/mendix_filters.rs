use super::*;
use crate::mendix::{MendixApp, MendixVersion};
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
}
