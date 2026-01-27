use serde::{Deserialize, Serialize};

const LIGHT_THEMES: [&str; 2] = ["latte", "kiraichi-light"];
const CUSTOM_THEMES: [&str; 2] = ["kiraichi", "kiraichi-light"];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThemeMetadata {
    pub is_light: bool,
    pub is_custom: bool,
    pub theme_class: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThemeInfo {
    pub name: String,
    pub display_name: String,
    pub is_light: bool,
    pub is_custom: bool,
}

fn is_light_theme(theme_name: &str) -> bool {
    LIGHT_THEMES.contains(&theme_name)
}

fn is_custom_theme(theme_name: &str) -> bool {
    CUSTOM_THEMES.contains(&theme_name)
}

#[tauri::command]
pub fn get_theme_metadata(theme_name: String) -> ThemeMetadata {
    ThemeMetadata {
        is_light: is_light_theme(&theme_name),
        is_custom: is_custom_theme(&theme_name),
        theme_class: format!("theme-{}", theme_name),
    }
}

#[tauri::command]
pub fn get_available_themes() -> Vec<ThemeInfo> {
    vec![
        ThemeInfo {
            name: "kiraichi".to_string(),
            display_name: "KiraIchi (Dark)".to_string(),
            is_light: false,
            is_custom: true,
        },
        ThemeInfo {
            name: "kiraichi-light".to_string(),
            display_name: "KiraIchi (Light)".to_string(),
            is_light: true,
            is_custom: true,
        },
        ThemeInfo {
            name: "latte".to_string(),
            display_name: "Latte".to_string(),
            is_light: true,
            is_custom: false,
        },
        ThemeInfo {
            name: "frappe".to_string(),
            display_name: "Frappé".to_string(),
            is_light: false,
            is_custom: false,
        },
        ThemeInfo {
            name: "macchiato".to_string(),
            display_name: "Macchiato".to_string(),
            is_light: false,
            is_custom: false,
        },
        ThemeInfo {
            name: "mocha".to_string(),
            display_name: "Mocha".to_string(),
            is_light: false,
            is_custom: false,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_theme_metadata_dark() {
        let result = get_theme_metadata("mocha".to_string());
        assert!(!result.is_light);
        assert!(!result.is_custom);
        assert_eq!(result.theme_class, "theme-mocha");
    }

    #[test]
    fn test_get_theme_metadata_light() {
        let result = get_theme_metadata("latte".to_string());
        assert!(result.is_light);
        assert!(!result.is_custom);
        assert_eq!(result.theme_class, "theme-latte");
    }

    #[test]
    fn test_get_theme_metadata_custom_dark() {
        let result = get_theme_metadata("kiraichi".to_string());
        assert!(!result.is_light);
        assert!(result.is_custom);
        assert_eq!(result.theme_class, "theme-kiraichi");
    }

    #[test]
    fn test_get_theme_metadata_custom_light() {
        let result = get_theme_metadata("kiraichi-light".to_string());
        assert!(result.is_light);
        assert!(result.is_custom);
        assert_eq!(result.theme_class, "theme-kiraichi-light");
    }

    #[test]
    fn test_get_available_themes() {
        let themes = get_available_themes();
        assert_eq!(themes.len(), 6);

        let kiraichi = themes.iter().find(|t| t.name == "kiraichi").unwrap();
        assert!(!kiraichi.is_light);
        assert!(kiraichi.is_custom);

        let latte = themes.iter().find(|t| t.name == "latte").unwrap();
        assert!(latte.is_light);
        assert!(!latte.is_custom);
    }
}
