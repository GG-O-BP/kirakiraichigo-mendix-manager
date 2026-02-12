use chrono::{DateTime, Local, NaiveDateTime, TimeZone};

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

fn format_optional_date(date_str: Option<&str>, fallback: &str) -> String {
    match date_str {
        None => fallback.to_string(),
        Some("") => fallback.to_string(),
        Some(s) => parse_date_string(s)
            .map(|dt| dt.format("%Y-%m-%d").to_string())
            .unwrap_or_else(|| fallback.to_string()),
    }
}

fn create_status_text(is_launching: bool, is_uninstalling: bool, install_date: Option<&str>) -> String {
    if is_launching {
        "Launching...".to_string()
    } else if is_uninstalling {
        "Uninstalling...".to_string()
    } else {
        format_optional_date(install_date, "Installation date unknown")
    }
}

#[tauri::command]
pub fn format_date_with_fallback(
    date_str: Option<String>,
    fallback: String,
) -> Result<String, String> {
    Ok(format_optional_date(date_str.as_deref(), &fallback))
}

#[tauri::command]
pub fn format_date(date_str: Option<String>) -> Result<String, String> {
    Ok(format_optional_date(date_str.as_deref(), "Date unknown"))
}

#[tauri::command]
pub fn get_version_status_text(
    is_launching: bool,
    is_uninstalling: bool,
    install_date: Option<String>,
) -> Result<String, String> {
    Ok(create_status_text(is_launching, is_uninstalling, install_date.as_deref()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_optional_date_valid_date() {
        let result = format_optional_date(Some("2024-01-15"), "Unknown");
        assert_eq!(result, "2024-01-15");
    }

    #[test]
    fn test_format_optional_date_invalid_date() {
        let result = format_optional_date(Some("invalid"), "Unknown");
        assert_eq!(result, "Unknown");
    }

    #[test]
    fn test_format_optional_date_none() {
        let result = format_optional_date(None, "No date");
        assert_eq!(result, "No date");
    }

    #[test]
    fn test_format_optional_date_empty() {
        let result = format_optional_date(Some(""), "Empty");
        assert_eq!(result, "Empty");
    }

    #[test]
    fn test_format_optional_date_rfc3339() {
        let result = format_optional_date(Some("2024-01-15T10:30:00Z"), "Unknown");
        assert!(result.starts_with("2024-01-"));
    }

    #[test]
    fn test_create_status_text_launching() {
        let result = create_status_text(true, false, Some("2024-01-15"));
        assert_eq!(result, "Launching...");
    }

    #[test]
    fn test_create_status_text_uninstalling() {
        let result = create_status_text(false, true, Some("2024-01-15"));
        assert_eq!(result, "Uninstalling...");
    }

    #[test]
    fn test_create_status_text_date() {
        let result = create_status_text(false, false, Some("2024-01-15"));
        assert_eq!(result, "2024-01-15");
    }

    #[test]
    fn test_create_status_text_no_date() {
        let result = create_status_text(false, false, None);
        assert_eq!(result, "Installation date unknown");
    }
}
