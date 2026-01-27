use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetValidationResult {
    pub is_valid: bool,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetForDelete {
    pub id: String,
    pub caption: Option<String>,
    pub path: Option<String>,
}

fn is_non_empty_string(s: &str) -> bool {
    !s.trim().is_empty()
}

#[tauri::command]
pub fn validate_widget_input(caption: String, path: String) -> WidgetValidationResult {
    let mut errors = Vec::new();

    if !is_non_empty_string(&caption) {
        errors.push("Caption is required".to_string());
    }

    if !is_non_empty_string(&path) {
        errors.push("Path is required".to_string());
    }

    WidgetValidationResult {
        is_valid: errors.is_empty(),
        errors,
    }
}

#[tauri::command]
pub fn validate_widget_for_delete(widget: Option<WidgetForDelete>) -> bool {
    widget.is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_widget_input_valid() {
        let result = validate_widget_input("My Widget".to_string(), "C:\\widgets\\my-widget".to_string());
        assert!(result.is_valid);
        assert!(result.errors.is_empty());
    }

    #[test]
    fn test_validate_widget_input_empty_caption() {
        let result = validate_widget_input("".to_string(), "C:\\widgets\\my-widget".to_string());
        assert!(!result.is_valid);
        assert!(result.errors.contains(&"Caption is required".to_string()));
    }

    #[test]
    fn test_validate_widget_input_empty_path() {
        let result = validate_widget_input("My Widget".to_string(), "".to_string());
        assert!(!result.is_valid);
        assert!(result.errors.contains(&"Path is required".to_string()));
    }

    #[test]
    fn test_validate_widget_input_both_empty() {
        let result = validate_widget_input("".to_string(), "".to_string());
        assert!(!result.is_valid);
        assert_eq!(result.errors.len(), 2);
    }

    #[test]
    fn test_validate_widget_input_whitespace_only() {
        let result = validate_widget_input("   ".to_string(), "  ".to_string());
        assert!(!result.is_valid);
        assert_eq!(result.errors.len(), 2);
    }

    #[test]
    fn test_validate_widget_for_delete_some() {
        let widget = Some(WidgetForDelete {
            id: "widget-1".to_string(),
            caption: Some("Test".to_string()),
            path: Some("C:\\test".to_string()),
        });
        assert!(validate_widget_for_delete(widget));
    }

    #[test]
    fn test_validate_widget_for_delete_none() {
        assert!(!validate_widget_for_delete(None));
    }
}
