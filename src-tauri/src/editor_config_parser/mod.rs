pub mod runtime;
pub mod transformer;
pub mod types;
pub mod utils;

use std::collections::HashMap;
use std::thread;
use runtime::EditorConfigRuntime;
use types::{PropertyGroup, PropertyVisibilityResult, WidgetDefinitionSpec};

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

fn count_visible_properties_in_group(
    group: &PropertyGroup,
    visible_keys: Option<&[String]>,
) -> usize {
    let direct_count = match (visible_keys, &group.properties) {
        (Some(keys), Some(props)) => props
            .iter()
            .filter_map(|p| p.get("key").and_then(|v| v.as_str()))
            .filter(|key| keys.contains(&key.to_string()))
            .count(),
        (None, Some(props)) => props.len(),
        _ => 0,
    };

    let nested_count: usize = group
        .property_groups
        .as_ref()
        .map(|groups| {
            groups
                .iter()
                .map(|nested| count_visible_properties_in_group(nested, visible_keys))
                .sum()
        })
        .unwrap_or(0);

    direct_count + nested_count
}

fn count_all_groups_recursive(
    group: &PropertyGroup,
    parent_path: &str,
    visible_keys: Option<&[String]>,
    results: &mut HashMap<String, usize>,
) {
    let caption = group.caption.as_deref().unwrap_or("");
    let group_path = if parent_path.is_empty() {
        caption.to_string()
    } else if caption.is_empty() {
        parent_path.to_string()
    } else {
        format!("{}.{}", parent_path, caption)
    };

    let count = count_visible_properties_in_group(group, visible_keys);
    if !group_path.is_empty() {
        results.insert(group_path.clone(), count);
    }

    if let Some(nested_groups) = &group.property_groups {
        for nested in nested_groups {
            count_all_groups_recursive(nested, &group_path, visible_keys, results);
        }
    }
}

#[tauri::command]
pub fn get_property_visibility_with_counts(
    config_content: String,
    values: serde_json::Value,
    widget_definition: WidgetDefinitionSpec,
) -> Result<PropertyVisibilityResult, String> {
    run_in_thread(move || {
        let mut runtime = EditorConfigRuntime::new(&config_content)?;

        let visible_keys = if runtime.is_get_properties_available() {
            let default_properties = deep_clone_property_groups(&widget_definition.property_groups);
            let filtered_groups = runtime.get_properties(&values, &default_properties)?;
            Some(extract_all_property_keys(&filtered_groups))
        } else {
            None
        };

        let mut group_counts = HashMap::new();
        for group in &widget_definition.property_groups {
            count_all_groups_recursive(group, "", visible_keys.as_deref(), &mut group_counts);
        }

        Ok(PropertyVisibilityResult {
            visible_keys,
            group_counts,
        })
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
    fn test_get_property_visibility_with_counts_no_function() {
        let config = "// no getProperties function";
        let values = serde_json::json!({});
        let widget_def = WidgetDefinitionSpec {
            property_groups: vec![PropertyGroup {
                key: Some("general".to_string()),
                caption: Some("General".to_string()),
                properties: Some(vec![serde_json::json!({"key": "name"})]),
                property_groups: None,
            }],
        };

        let result = get_property_visibility_with_counts(config.to_string(), values, widget_def).unwrap();
        assert!(result.visible_keys.is_none());
        assert_eq!(result.group_counts.get("General"), Some(&1));
    }

    #[test]
    fn test_get_property_visibility_with_counts_passthrough() {
        let config = r#"
function getProperties(values, defaultProperties) {
    return defaultProperties;
}
"#;
        let values = serde_json::json!({});
        let widget_def = WidgetDefinitionSpec {
            property_groups: vec![PropertyGroup {
                key: Some("general".to_string()),
                caption: Some("General".to_string()),
                properties: Some(vec![serde_json::json!({"key": "name"})]),
                property_groups: None,
            }],
        };

        let result = get_property_visibility_with_counts(config.to_string(), values, widget_def).unwrap();
        assert_eq!(result.visible_keys, Some(vec!["name".to_string()]));
        assert_eq!(result.group_counts.get("General"), Some(&1));
    }
}
