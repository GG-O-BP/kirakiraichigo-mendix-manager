use serde::{Deserialize, Serialize};

// ============= Validation Result Types =============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildDeployValidationResult {
    pub is_valid: bool,
    pub error_message: Option<String>,
}

// ============= Pure Validation Functions =============

/// Validates that at least one widget and one app are selected for build/deploy
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

/// Validates that all required fields have non-empty values
fn validate_required_fields_internal(
    required_fields: &[String],
    values: &std::collections::HashMap<String, String>,
) -> bool {
    required_fields.iter().all(|field| {
        values
            .get(field)
            .map(|v| !v.trim().is_empty())
            .unwrap_or(false)
    })
}

/// Checks if there are any build failures in the result
fn has_build_failures_internal(failed: &[serde_json::Value]) -> bool {
    !failed.is_empty()
}

// ============= Tauri Commands =============

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
pub fn validate_required_fields(
    required_fields: Vec<String>,
    values: std::collections::HashMap<String, String>,
) -> Result<bool, String> {
    Ok(validate_required_fields_internal(&required_fields, &values))
}

#[tauri::command]
pub fn has_build_failures(failed: Vec<serde_json::Value>) -> Result<bool, String> {
    Ok(has_build_failures_internal(&failed))
}

// ============= Tests =============

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

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
    fn test_validate_required_fields_all_present() {
        let mut values = HashMap::new();
        values.insert("name".to_string(), "Test Widget".to_string());
        values.insert("caption".to_string(), "My Caption".to_string());

        let required = vec!["name".to_string(), "caption".to_string()];
        assert!(validate_required_fields_internal(&required, &values));
    }

    #[test]
    fn test_validate_required_fields_missing() {
        let mut values = HashMap::new();
        values.insert("name".to_string(), "Test Widget".to_string());
        values.insert("caption".to_string(), "".to_string()); // Empty

        let required = vec!["name".to_string(), "caption".to_string()];
        assert!(!validate_required_fields_internal(&required, &values));
    }

    #[test]
    fn test_validate_required_fields_whitespace_only() {
        let mut values = HashMap::new();
        values.insert("name".to_string(), "   ".to_string()); // Whitespace only

        let required = vec!["name".to_string()];
        assert!(!validate_required_fields_internal(&required, &values));
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
