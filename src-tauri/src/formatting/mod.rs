use chrono::{DateTime, Local, NaiveDateTime, TimeZone};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionValidityBadge {
    pub badge: Option<String>,
    pub badge_class: Option<String>,
}

// Batch formatting types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionDisplayInput {
    pub is_valid: bool,
    pub is_lts: bool,
    pub is_mts: bool,
    pub is_launching: bool,
    pub is_uninstalling: bool,
    pub install_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionDisplayOutput {
    pub badge: VersionValidityBadge,
    pub status_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppDisplayInput {
    pub last_modified: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppDisplayOutput {
    pub formatted_date: String,
}

fn parse_date_string(date_str: &str) -> Option<DateTime<Local>> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(date_str) {
        return Some(dt.with_timezone(&Local));
    }

    if let Ok(dt) = DateTime::parse_from_str(date_str, "%Y-%m-%dT%H:%M:%S%.f%:z") {
        return Some(dt.with_timezone(&Local));
    }

    if let Ok(naive) = NaiveDateTime::parse_from_str(date_str, "%Y-%m-%dT%H:%M:%S%.f") {
        return Local.from_local_datetime(&naive).single();
    }

    if let Ok(naive) = NaiveDateTime::parse_from_str(date_str, "%Y-%m-%d") {
        return Local.from_local_datetime(&naive).single();
    }

    if let Ok(naive_date) = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
        let naive = naive_date.and_hms_opt(0, 0, 0)?;
        return Local.from_local_datetime(&naive).single();
    }

    None
}

fn format_date_with_fallback_internal(date_str: Option<&str>, fallback: &str) -> String {
    match date_str {
        None => fallback.to_string(),
        Some("") => fallback.to_string(),
        Some(s) => match parse_date_string(s) {
            Some(dt) => dt.format("%Y-%m-%d").to_string(),
            None => fallback.to_string(),
        },
    }
}

fn format_date_internal(date_str: Option<&str>) -> String {
    format_date_with_fallback_internal(date_str, "Date unknown")
}

fn get_version_validity_badge_internal(is_valid: bool, is_lts: bool, is_mts: bool) -> VersionValidityBadge {
    if is_valid {
        VersionValidityBadge {
            badge: Some("✓".to_string()),
            badge_class: Some("valid".to_string()),
        }
    } else if is_lts {
        VersionValidityBadge {
            badge: Some("LTS".to_string()),
            badge_class: Some("lts".to_string()),
        }
    } else if is_mts {
        VersionValidityBadge {
            badge: Some("MTS".to_string()),
            badge_class: Some("mts".to_string()),
        }
    } else {
        VersionValidityBadge {
            badge: None,
            badge_class: None,
        }
    }
}

fn get_version_status_text_internal(
    is_launching: bool,
    is_uninstalling: bool,
    install_date: Option<&str>,
) -> String {
    if is_launching {
        "Launching...".to_string()
    } else if is_uninstalling {
        "Uninstalling...".to_string()
    } else {
        format_date_with_fallback_internal(install_date, "Installation date unknown")
    }
}

#[tauri::command]
pub fn format_date_with_fallback(
    date_str: Option<String>,
    fallback: String,
) -> Result<String, String> {
    Ok(format_date_with_fallback_internal(
        date_str.as_deref(),
        &fallback,
    ))
}

#[tauri::command]
pub fn format_date(date_str: Option<String>) -> Result<String, String> {
    Ok(format_date_internal(date_str.as_deref()))
}

#[tauri::command]
pub fn get_version_validity_badge(
    is_valid: bool,
    is_lts: bool,
    is_mts: bool,
) -> Result<VersionValidityBadge, String> {
    Ok(get_version_validity_badge_internal(is_valid, is_lts, is_mts))
}

#[tauri::command]
pub fn get_version_status_text(
    is_launching: bool,
    is_uninstalling: bool,
    install_date: Option<String>,
) -> Result<String, String> {
    Ok(get_version_status_text_internal(
        is_launching,
        is_uninstalling,
        install_date.as_deref(),
    ))
}

// Batch formatting functions
fn format_version_display_internal(input: &VersionDisplayInput) -> VersionDisplayOutput {
    VersionDisplayOutput {
        badge: get_version_validity_badge_internal(input.is_valid, input.is_lts, input.is_mts),
        status_text: get_version_status_text_internal(
            input.is_launching,
            input.is_uninstalling,
            input.install_date.as_deref(),
        ),
    }
}

fn format_app_display_internal(input: &AppDisplayInput) -> AppDisplayOutput {
    AppDisplayOutput {
        formatted_date: format_date_with_fallback_internal(
            input.last_modified.as_deref(),
            "Date unknown",
        ),
    }
}

#[tauri::command]
pub fn format_versions_batch(
    versions: Vec<VersionDisplayInput>,
) -> Result<Vec<VersionDisplayOutput>, String> {
    Ok(versions.iter().map(format_version_display_internal).collect())
}

#[tauri::command]
pub fn format_apps_batch(
    apps: Vec<AppDisplayInput>,
) -> Result<Vec<AppDisplayOutput>, String> {
    Ok(apps.iter().map(format_app_display_internal).collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_date_with_fallback_valid_date() {
        let result = format_date_with_fallback_internal(Some("2024-01-15"), "Unknown");
        assert_eq!(result, "2024-01-15");
    }

    #[test]
    fn test_format_date_with_fallback_invalid_date() {
        let result = format_date_with_fallback_internal(Some("invalid"), "Unknown");
        assert_eq!(result, "Unknown");
    }

    #[test]
    fn test_format_date_with_fallback_none() {
        let result = format_date_with_fallback_internal(None, "No date");
        assert_eq!(result, "No date");
    }

    #[test]
    fn test_format_date_with_fallback_empty() {
        let result = format_date_with_fallback_internal(Some(""), "Empty");
        assert_eq!(result, "Empty");
    }

    #[test]
    fn test_format_date_with_fallback_rfc3339() {
        let result = format_date_with_fallback_internal(
            Some("2024-01-15T10:30:00Z"),
            "Unknown",
        );
        // The exact format depends on local timezone, but it should be a valid date
        assert!(result.starts_with("2024-01-"));
    }

    #[test]
    fn test_get_version_validity_badge_valid() {
        let result = get_version_validity_badge_internal(true, false, false);
        assert_eq!(result.badge, Some("✓".to_string()));
        assert_eq!(result.badge_class, Some("valid".to_string()));
    }

    #[test]
    fn test_get_version_validity_badge_lts() {
        let result = get_version_validity_badge_internal(false, true, false);
        assert_eq!(result.badge, Some("LTS".to_string()));
        assert_eq!(result.badge_class, Some("lts".to_string()));
    }

    #[test]
    fn test_get_version_validity_badge_mts() {
        let result = get_version_validity_badge_internal(false, false, true);
        assert_eq!(result.badge, Some("MTS".to_string()));
        assert_eq!(result.badge_class, Some("mts".to_string()));
    }

    #[test]
    fn test_get_version_validity_badge_none() {
        let result = get_version_validity_badge_internal(false, false, false);
        assert!(result.badge.is_none());
        assert!(result.badge_class.is_none());
    }

    #[test]
    fn test_get_version_status_text_launching() {
        let result = get_version_status_text_internal(true, false, Some("2024-01-15"));
        assert_eq!(result, "Launching...");
    }

    #[test]
    fn test_get_version_status_text_uninstalling() {
        let result = get_version_status_text_internal(false, true, Some("2024-01-15"));
        assert_eq!(result, "Uninstalling...");
    }

    #[test]
    fn test_get_version_status_text_date() {
        let result = get_version_status_text_internal(false, false, Some("2024-01-15"));
        assert_eq!(result, "2024-01-15");
    }

    #[test]
    fn test_get_version_status_text_no_date() {
        let result = get_version_status_text_internal(false, false, None);
        assert_eq!(result, "Installation date unknown");
    }

    #[test]
    fn test_format_versions_batch() {
        let inputs = vec![
            VersionDisplayInput {
                is_valid: true,
                is_lts: false,
                is_mts: false,
                is_launching: false,
                is_uninstalling: false,
                install_date: Some("2024-01-15".to_string()),
            },
            VersionDisplayInput {
                is_valid: false,
                is_lts: true,
                is_mts: false,
                is_launching: true,
                is_uninstalling: false,
                install_date: Some("2024-01-16".to_string()),
            },
        ];

        let results: Vec<VersionDisplayOutput> = inputs.iter().map(format_version_display_internal).collect();

        assert_eq!(results.len(), 2);
        assert_eq!(results[0].badge.badge, Some("✓".to_string()));
        assert_eq!(results[0].status_text, "2024-01-15");
        assert_eq!(results[1].badge.badge, Some("LTS".to_string()));
        assert_eq!(results[1].status_text, "Launching...");
    }

    #[test]
    fn test_format_apps_batch() {
        let inputs = vec![
            AppDisplayInput {
                last_modified: Some("2024-01-15".to_string()),
            },
            AppDisplayInput {
                last_modified: None,
            },
        ];

        let results: Vec<AppDisplayOutput> = inputs.iter().map(format_app_display_internal).collect();

        assert_eq!(results.len(), 2);
        assert_eq!(results[0].formatted_date, "2024-01-15");
        assert_eq!(results[1].formatted_date, "Date unknown");
    }
}
