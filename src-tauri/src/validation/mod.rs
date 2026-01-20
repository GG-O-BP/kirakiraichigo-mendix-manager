use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildDeployValidationResult {
    pub is_valid: bool,
    pub error_message: Option<String>,
}

fn validate_build_deploy_selections_internal(
    selected_widget_count: usize,
    selected_app_count: usize,
) -> BuildDeployValidationResult {
    if selected_widget_count == 0 {
        return BuildDeployValidationResult {
            is_valid: false,
            error_message: Some("Please select at least one widget to build".to_string()),
        };
    }

    if selected_app_count == 0 {
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

fn has_build_failures_internal(failed: &[serde_json::Value]) -> bool {
    !failed.is_empty()
}

#[tauri::command]
pub fn validate_build_deploy_selections(
    selected_widget_count: usize,
    selected_app_count: usize,
) -> Result<BuildDeployValidationResult, String> {
    Ok(validate_build_deploy_selections_internal(
        selected_widget_count,
        selected_app_count,
    ))
}

#[tauri::command]
pub fn has_build_failures(failed: Vec<serde_json::Value>) -> Result<bool, String> {
    Ok(has_build_failures_internal(&failed))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_build_deploy_no_widgets() {
        let result = validate_build_deploy_selections_internal(0, 5);
        assert!(!result.is_valid);
        assert_eq!(
            result.error_message,
            Some("Please select at least one widget to build".to_string())
        );
    }

    #[test]
    fn test_validate_build_deploy_no_apps() {
        let result = validate_build_deploy_selections_internal(3, 0);
        assert!(!result.is_valid);
        assert_eq!(
            result.error_message,
            Some("Please select at least one app to deploy to".to_string())
        );
    }

    #[test]
    fn test_validate_build_deploy_valid() {
        let result = validate_build_deploy_selections_internal(2, 3);
        assert!(result.is_valid);
        assert!(result.error_message.is_none());
    }

    #[test]
    fn test_has_build_failures_empty() {
        let failed: Vec<serde_json::Value> = vec![];
        assert!(!has_build_failures_internal(&failed));
    }

    #[test]
    fn test_has_build_failures_with_failures() {
        let failed = vec![serde_json::json!({"widget": "test", "error": "build failed"})];
        assert!(has_build_failures_internal(&failed));
    }
}
