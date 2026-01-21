use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildDeployValidationResult {
    pub is_valid: bool,
    pub error_message: Option<String>,
}

fn validate_widget_and_app_selection(
    widget_count: usize,
    app_count: usize,
) -> BuildDeployValidationResult {
    if widget_count == 0 {
        return BuildDeployValidationResult {
            is_valid: false,
            error_message: Some("Please select at least one widget to build".to_string()),
        };
    }

    if app_count == 0 {
        return BuildDeployValidationResult {
            is_valid: false,
            error_message: Some("Please select at least one app to deploy to".to_string()),
        };
    }

    BuildDeployValidationResult {
        is_valid: true,
        error_message: None,
    }
}

fn any_failures_exist(failed: &[serde_json::Value]) -> bool {
    !failed.is_empty()
}

#[tauri::command]
pub fn validate_build_deploy_selections(
    selected_widget_count: usize,
    selected_app_count: usize,
) -> Result<BuildDeployValidationResult, String> {
    Ok(validate_widget_and_app_selection(selected_widget_count, selected_app_count))
}

#[tauri::command]
pub fn has_build_failures(failed: Vec<serde_json::Value>) -> Result<bool, String> {
    Ok(any_failures_exist(&failed))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_no_widgets_selected() {
        let result = validate_widget_and_app_selection(0, 5);
        assert!(!result.is_valid);
        assert_eq!(
            result.error_message,
            Some("Please select at least one widget to build".to_string())
        );
    }

    #[test]
    fn test_validate_no_apps_selected() {
        let result = validate_widget_and_app_selection(3, 0);
        assert!(!result.is_valid);
        assert_eq!(
            result.error_message,
            Some("Please select at least one app to deploy to".to_string())
        );
    }

    #[test]
    fn test_validate_valid_selection() {
        let result = validate_widget_and_app_selection(2, 3);
        assert!(result.is_valid);
        assert!(result.error_message.is_none());
    }

    #[test]
    fn test_no_failures_when_empty() {
        let failed: Vec<serde_json::Value> = Vec::new();
        assert!(!any_failures_exist(&failed));
    }

    #[test]
    fn test_failures_exist() {
        let failed = vec![serde_json::json!({"widget": "test", "error": "build failed"})];
        assert!(any_failures_exist(&failed));
    }
}
