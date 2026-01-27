use std::collections::HashSet;

#[tauri::command]
pub fn collection_toggle_item(items: Vec<String>, item: String) -> Vec<String> {
    let mut set: HashSet<String> = items.into_iter().collect();
    if set.contains(&item) {
        set.remove(&item);
    } else {
        set.insert(item);
    }
    set.into_iter().collect()
}

#[tauri::command]
pub fn collection_has_items(items: Vec<String>) -> bool {
    !items.is_empty()
}

#[tauri::command]
pub fn collection_remove_item(items: Vec<String>, item: String) -> Vec<String> {
    items.into_iter().filter(|i| i != &item).collect()
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
    fn test_collection_toggle_item_add() {
        let items = vec!["a".to_string(), "b".to_string()];
        let result = collection_toggle_item(items, "c".to_string());
        assert!(result.contains(&"c".to_string()));
        assert_eq!(result.len(), 3);
    }

    #[test]
    fn test_collection_toggle_item_remove() {
        let items = vec!["a".to_string(), "b".to_string(), "c".to_string()];
        let result = collection_toggle_item(items, "b".to_string());
        assert!(!result.contains(&"b".to_string()));
        assert_eq!(result.len(), 2);
    }

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
    fn test_collection_remove_item() {
        let items = vec!["a".to_string(), "b".to_string(), "c".to_string()];
        let result = collection_remove_item(items, "b".to_string());
        assert_eq!(result, vec!["a".to_string(), "c".to_string()]);
    }

    #[test]
    fn test_collection_remove_item_not_found() {
        let items = vec!["a".to_string(), "b".to_string()];
        let result = collection_remove_item(items, "z".to_string());
        assert_eq!(result, vec!["a".to_string(), "b".to_string()]);
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
}
