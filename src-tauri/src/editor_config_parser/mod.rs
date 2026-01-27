pub mod runtime;
pub mod transformer;
pub mod types;
pub mod utils;

use std::thread;
use runtime::EditorConfigRuntime;
use types::{EditorConfigEvaluationResult, PropertyGroup, ValidationError, WidgetDefinitionSpec};

const STACK_SIZE: usize = 8 * 1024 * 1024; // 8MB stack for Boa engine

fn extract_all_property_keys(groups: &[PropertyGroup]) -> Vec<String> {
    fn extract_from_group(group: &PropertyGroup) -> Vec<String> {
        let mut keys = Vec::new();

        if let Some(properties) = &group.properties {
            for prop in properties {
                if let Some(key) = prop.get("key").and_then(|v| v.as_str()) {
                    keys.push(key.to_string());
                }
            }
        }

        if let Some(nested_groups) = &group.property_groups {
            for nested in nested_groups {
                keys.extend(extract_from_group(nested));
            }
        }

        keys
    }

    let mut all_keys: Vec<String> = groups.iter().flat_map(extract_from_group).collect();
    all_keys.sort();
    all_keys.dedup();
    all_keys
}

fn deep_clone_property_groups(groups: &[PropertyGroup]) -> Vec<PropertyGroup> {
    serde_json::from_str(&serde_json::to_string(groups).unwrap()).unwrap()
}

fn run_in_thread<F, T>(f: F) -> Result<T, String>
where
    F: FnOnce() -> Result<T, String> + Send + 'static,
    T: Send + 'static,
{
    let handle = thread::Builder::new()
        .stack_size(STACK_SIZE)
        .spawn(f)
        .map_err(|e| format!("Failed to spawn thread: {}", e))?;

    handle.join().map_err(|_| "Thread panicked".to_string())?
}

#[tauri::command]
pub fn evaluate_editor_config(
    config_content: String,
    values: serde_json::Value,
    widget_definition: WidgetDefinitionSpec,
) -> Result<EditorConfigEvaluationResult, String> {
    run_in_thread(move || {
        let mut runtime = EditorConfigRuntime::new(&config_content)?;

        let default_properties = deep_clone_property_groups(&widget_definition.property_groups);

        let filtered_groups = if runtime.is_get_properties_available() {
            runtime.get_properties(&values, &default_properties)?
        } else {
            default_properties
        };

        let visible_keys = extract_all_property_keys(&filtered_groups);

        let validation_errors = if runtime.is_check_available() {
            runtime.check(&values)?
        } else {
            Vec::new()
        };

        Ok(EditorConfigEvaluationResult {
            filtered_groups,
            visible_keys,
            validation_errors,
        })
    })
}

#[tauri::command]
pub fn get_visible_property_keys(
    config_content: String,
    values: serde_json::Value,
    widget_definition: WidgetDefinitionSpec,
) -> Result<Option<Vec<String>>, String> {
    run_in_thread(move || {
        let mut runtime = EditorConfigRuntime::new(&config_content)?;

        if !runtime.is_get_properties_available() {
            return Ok(None);
        }

        let default_properties = deep_clone_property_groups(&widget_definition.property_groups);
        let filtered_groups = runtime.get_properties(&values, &default_properties)?;
        let visible_keys = extract_all_property_keys(&filtered_groups);

        Ok(Some(visible_keys))
    })
}

#[tauri::command]
pub fn validate_editor_config_values(
    config_content: String,
    values: serde_json::Value,
) -> Result<Vec<ValidationError>, String> {
    run_in_thread(move || {
        let mut runtime = EditorConfigRuntime::new(&config_content)?;

        if !runtime.is_check_available() {
            return Ok(Vec::new());
        }

        runtime.check(&values)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_all_property_keys() {
        let groups = vec![PropertyGroup {
            key: Some("general".to_string()),
            caption: None,
            properties: Some(vec![
                serde_json::json!({"key": "name"}),
                serde_json::json!({"key": "value"}),
            ]),
            property_groups: Some(vec![PropertyGroup {
                key: Some("nested".to_string()),
                caption: None,
                properties: Some(vec![serde_json::json!({"key": "nested_prop"})]),
                property_groups: None,
            }]),
        }];

        let keys = extract_all_property_keys(&groups);
        assert_eq!(keys, vec!["name", "nested_prop", "value"]);
    }

    #[test]
    fn test_evaluate_editor_config_passthrough() {
        let config = r#"
function getProperties(values, defaultProperties) {
    return defaultProperties;
}
"#;
        let values = serde_json::json!({});
        let widget_def = WidgetDefinitionSpec {
            property_groups: vec![PropertyGroup {
                key: Some("general".to_string()),
                caption: None,
                properties: Some(vec![serde_json::json!({"key": "name"})]),
                property_groups: None,
            }],
        };

        let result = evaluate_editor_config(config.to_string(), values, widget_def).unwrap();
        assert_eq!(result.visible_keys, vec!["name"]);
        assert!(result.validation_errors.is_empty());
    }

    #[test]
    fn test_get_visible_property_keys_none_when_no_function() {
        let config = "// no getProperties function";
        let values = serde_json::json!({});
        let widget_def = WidgetDefinitionSpec {
            property_groups: vec![],
        };

        let result = get_visible_property_keys(config.to_string(), values, widget_def).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_validate_returns_empty_when_no_check() {
        let config = "// no check function";
        let values = serde_json::json!({});

        let result = validate_editor_config_values(config.to_string(), values).unwrap();
        assert!(result.is_empty());
    }
}
