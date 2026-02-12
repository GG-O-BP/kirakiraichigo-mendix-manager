use std::collections::HashSet;

use crate::data_processing::mendix_filters::Widget;

#[tauri::command]
pub fn extract_selected_widget_paths(
    selected_ids: Vec<String>,
    widgets: Vec<Widget>,
) -> Vec<String> {
    let selected_set: HashSet<&str> = selected_ids.iter().map(|s| s.as_str()).collect();
    widgets
        .into_iter()
        .filter(|w| selected_set.contains(w.id.as_str()))
        .map(|w| w.path)
        .collect()
}

#[tauri::command]
pub fn collection_has_items(items: Vec<String>) -> bool {
    !items.is_empty()
}

#[tauri::command]
pub fn collection_count(items: Vec<String>) -> usize {
    items.len()
}

#[tauri::command]
pub fn collection_contains(items: Vec<String>, item: String) -> bool {
    items.contains(&item)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_collection_has_items_true() {
        let items = vec!["a".to_string()];
        assert!(collection_has_items(items));
    }

    #[test]
    fn test_collection_has_items_false() {
        let items: Vec<String> = vec![];
        assert!(!collection_has_items(items));
    }

    #[test]
    fn test_collection_count() {
        let items = vec!["a".to_string(), "b".to_string(), "c".to_string()];
        assert_eq!(collection_count(items), 3);
    }

    #[test]
    fn test_collection_count_empty() {
        let items: Vec<String> = vec![];
        assert_eq!(collection_count(items), 0);
    }

    #[test]
    fn test_collection_contains_true() {
        let items = vec!["a".to_string(), "b".to_string()];
        assert!(collection_contains(items, "a".to_string()));
    }

    #[test]
    fn test_collection_contains_false() {
        let items = vec!["a".to_string(), "b".to_string()];
        assert!(!collection_contains(items, "z".to_string()));
    }

    #[test]
    fn test_extract_selected_widget_paths() {
        let widgets = vec![
            Widget {
                id: "1".to_string(),
                caption: "Widget A".to_string(),
                path: "/path/a".to_string(),
            },
            Widget {
                id: "2".to_string(),
                caption: "Widget B".to_string(),
                path: "/path/b".to_string(),
            },
            Widget {
                id: "3".to_string(),
                caption: "Widget C".to_string(),
                path: "/path/c".to_string(),
            },
        ];
        let selected_ids = vec!["1".to_string(), "3".to_string()];
        let result = extract_selected_widget_paths(selected_ids, widgets);
        assert_eq!(result.len(), 2);
        assert!(result.contains(&"/path/a".to_string()));
        assert!(result.contains(&"/path/c".to_string()));
    }

    #[test]
    fn test_extract_selected_widget_paths_empty_selection() {
        let widgets = vec![Widget {
            id: "1".to_string(),
            caption: "Widget A".to_string(),
            path: "/path/a".to_string(),
        }];
        let selected_ids: Vec<String> = vec![];
        let result = extract_selected_widget_paths(selected_ids, widgets);
        assert!(result.is_empty());
    }
}
