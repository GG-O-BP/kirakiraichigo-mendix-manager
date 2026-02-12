use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PropertyGroup {
    pub caption: Option<String>,
}

#[tauri::command]
pub fn build_initial_expanded_state(
    property_groups: Vec<PropertyGroup>,
) -> HashMap<String, bool> {
    if property_groups.is_empty() {
        return HashMap::new();
    }

    let first_caption = property_groups
        .first()
        .and_then(|g| g.caption.clone());

    property_groups
        .iter()
        .filter_map(|g| g.caption.clone())
        .map(|caption| {
            let is_first = Some(&caption) == first_caption.as_ref();
            (caption, is_first)
        })
        .collect()
}

#[tauri::command]
pub fn toggle_group_expansion(
    mut expanded_groups: HashMap<String, bool>,
    group_caption: String,
) -> HashMap<String, bool> {
    let current = expanded_groups.get(&group_caption).copied().unwrap_or(true);
    expanded_groups.insert(group_caption, !current);
    expanded_groups
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_initial_expanded_state_empty() {
        let result = build_initial_expanded_state(vec![]);
        assert!(result.is_empty());
    }

    #[test]
    fn test_build_initial_expanded_state_single() {
        let groups = vec![PropertyGroup {
            caption: Some("General".to_string()),
        }];
        let result = build_initial_expanded_state(groups);
        assert_eq!(result.len(), 1);
        assert_eq!(result.get("General"), Some(&true));
    }

    #[test]
    fn test_build_initial_expanded_state_multiple() {
        let groups = vec![
            PropertyGroup {
                caption: Some("General".to_string()),
            },
            PropertyGroup {
                caption: Some("Advanced".to_string()),
            },
            PropertyGroup {
                caption: Some("Style".to_string()),
            },
        ];
        let result = build_initial_expanded_state(groups);

        assert_eq!(result.len(), 3);
        assert_eq!(result.get("General"), Some(&true));
        assert_eq!(result.get("Advanced"), Some(&false));
        assert_eq!(result.get("Style"), Some(&false));
    }

    #[test]
    fn test_build_initial_expanded_state_with_none_caption() {
        let groups = vec![
            PropertyGroup { caption: None },
            PropertyGroup {
                caption: Some("General".to_string()),
            },
        ];
        let result = build_initial_expanded_state(groups);

        assert_eq!(result.len(), 1);
        assert_eq!(result.get("General"), Some(&false));
    }

    #[test]
    fn test_toggle_group_expansion_expand() {
        let mut initial = HashMap::new();
        initial.insert("General".to_string(), false);

        let result = toggle_group_expansion(initial, "General".to_string());
        assert_eq!(result.get("General"), Some(&true));
    }

    #[test]
    fn test_toggle_group_expansion_collapse() {
        let mut initial = HashMap::new();
        initial.insert("General".to_string(), true);

        let result = toggle_group_expansion(initial, "General".to_string());
        assert_eq!(result.get("General"), Some(&false));
    }

    #[test]
    fn test_toggle_group_expansion_new_key() {
        let initial = HashMap::new();
        let result = toggle_group_expansion(initial, "NewGroup".to_string());
        assert_eq!(result.get("NewGroup"), Some(&false));
    }
}
