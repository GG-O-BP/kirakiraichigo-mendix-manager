use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectionValidationResult {
    pub is_valid: bool,
    pub count: usize,
}

#[tauri::command]
pub fn validate_selection_not_empty(items: Vec<String>) -> SelectionValidationResult {
    SelectionValidationResult {
        is_valid: !items.is_empty(),
        count: items.len(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_selection_not_empty_with_items() {
        let result = validate_selection_not_empty(vec!["item1".to_string(), "item2".to_string()]);
        assert!(result.is_valid);
        assert_eq!(result.count, 2);
    }

    #[test]
    fn test_validate_selection_not_empty_empty() {
        let result = validate_selection_not_empty(vec![]);
        assert!(!result.is_valid);
        assert_eq!(result.count, 0);
    }
}
