use crate::mendix::MendixVersion;
use crate::web_scraper::DownloadableVersion;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionOption {
    pub value: String,
    pub label: String,
}

fn normalize_version_string(version: &str) -> String {
    version.trim().to_string()
}

fn extract_installed_version_string(installed: &MendixVersion) -> String {
    normalize_version_string(&installed.version)
}

fn extract_downloadable_version_string(downloadable: &DownloadableVersion) -> String {
    normalize_version_string(&downloadable.version)
}

fn is_version_installed(
    downloadable: &DownloadableVersion,
    installed_versions: &[MendixVersion],
) -> bool {
    let download_version = extract_downloadable_version_string(downloadable);
    installed_versions
        .iter()
        .any(|installed| extract_installed_version_string(installed) == download_version)
}

fn exclude_already_installed(
    versions: Vec<DownloadableVersion>,
    installed_versions: &[MendixVersion],
    exclude: bool,
) -> Vec<DownloadableVersion> {
    if !exclude {
        return versions;
    }

    versions
        .into_iter()
        .filter(|v| !is_version_installed(v, installed_versions))
        .collect()
}

fn filter_by_support_type(
    versions: Vec<DownloadableVersion>,
    show_lts_only: bool,
    show_mts_only: bool,
    show_beta_only: bool,
) -> Vec<DownloadableVersion> {
    let no_filters_active = !show_lts_only && !show_mts_only && !show_beta_only;
    if no_filters_active {
        return versions;
    }

    versions
        .into_iter()
        .filter(|v| {
            (show_lts_only && v.is_lts)
                || (show_mts_only && v.is_mts)
                || (show_beta_only && v.is_beta)
        })
        .collect()
}

fn check_version_installed(version: &str, installed_versions: &[MendixVersion]) -> bool {
    let normalized_version = normalize_version_string(version);
    installed_versions
        .iter()
        .any(|installed| extract_installed_version_string(installed) == normalized_version)
}

fn check_version_mismatch(selected_version: Option<&str>, app_version: Option<&str>) -> bool {
    match (selected_version, app_version) {
        (None, _) => false,
        (Some(selected), Some(app)) => {
            normalize_version_string(selected) != normalize_version_string(app)
        }
        (Some(_), None) => true,
    }
}

fn check_version_selected(selected_version: Option<&str>, version: &str) -> bool {
    selected_version
        .map(|selected| normalize_version_string(selected) == normalize_version_string(version))
        .unwrap_or(false)
}

fn compute_next_page(total_items: usize, items_per_page: usize) -> usize {
    if items_per_page == 0 {
        return 1;
    }

    let pages = total_items / items_per_page;
    std::cmp::max(1, pages + 1)
}

fn filter_by_search(
    versions: Vec<DownloadableVersion>,
    search_term: Option<&str>,
) -> Vec<DownloadableVersion> {
    match search_term {
        None => versions,
        Some(term) if term.trim().is_empty() => versions,
        Some(term) => {
            let normalized_term = term.to_lowercase();
            versions
                .into_iter()
                .filter(|v| v.version.to_lowercase().contains(&normalized_term))
                .collect()
        }
    }
}

fn apply_version_filters(
    versions: Vec<DownloadableVersion>,
    installed_versions: &[MendixVersion],
    show_only_downloadable: bool,
    show_lts_only: bool,
    show_mts_only: bool,
    show_beta_only: bool,
    search_term: Option<&str>,
) -> Vec<DownloadableVersion> {
    let after_installed = exclude_already_installed(versions, installed_versions, show_only_downloadable);
    let after_support_type = filter_by_support_type(after_installed, show_lts_only, show_mts_only, show_beta_only);
    filter_by_search(after_support_type, search_term)
}

fn build_version_options(versions: &[MendixVersion]) -> Vec<VersionOption> {
    let mut options: Vec<VersionOption> = vec![VersionOption {
        value: "all".to_string(),
        label: "📦 All Versions".to_string(),
    }];

    for version in versions {
        options.push(VersionOption {
            value: version.version.clone(),
            label: format!("📦 {}", version.version),
        });
    }

    options
}

#[tauri::command]
pub fn filter_downloadable_versions(
    versions: Vec<DownloadableVersion>,
    installed_versions: Vec<MendixVersion>,
    show_only_downloadable: bool,
    show_lts_only: bool,
    show_mts_only: bool,
    show_beta_only: bool,
    search_term: Option<String>,
) -> Result<Vec<DownloadableVersion>, String> {
    Ok(apply_version_filters(
        versions,
        &installed_versions,
        show_only_downloadable,
        show_lts_only,
        show_mts_only,
        show_beta_only,
        search_term.as_deref(),
    ))
}

#[tauri::command]
pub fn compare_versions(
    comparison_type: String,
    value1: Option<String>,
    value2: Option<String>,
    installed_versions: Option<Vec<MendixVersion>>,
) -> Result<bool, String> {
    match comparison_type.as_str() {
        "selected" => {
            let version = value2.ok_or("version is required for 'selected' comparison")?;
            Ok(check_version_selected(value1.as_deref(), &version))
        }
        "installed" => {
            let version = value1.ok_or("version is required for 'installed' comparison")?;
            let installed = installed_versions.ok_or("installed_versions is required for 'installed' comparison")?;
            Ok(check_version_installed(&version, &installed))
        }
        "mismatch" => Ok(check_version_mismatch(value1.as_deref(), value2.as_deref())),
        _ => Err(format!("Unknown comparison_type: {}", comparison_type)),
    }
}

#[tauri::command]
pub fn calculate_next_page_number(total_items: usize, items_per_page: usize) -> Result<usize, String> {
    Ok(compute_next_page(total_items, items_per_page))
}

#[tauri::command]
pub fn create_version_options(versions: Vec<MendixVersion>) -> Result<Vec<VersionOption>, String> {
    Ok(build_version_options(&versions))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Local;

    fn create_test_installed_version(version: &str) -> MendixVersion {
        MendixVersion {
            version: version.to_string(),
            path: format!("C:\\Program Files\\Mendix\\{}", version),
            exe_path: format!(
                "C:\\Program Files\\Mendix\\{}\\modeler\\studiopro.exe",
                version
            ),
            install_date: Some(Local::now()),
            is_valid: true,
        }
    }

    fn create_test_downloadable_version(
        version: &str,
        is_lts: bool,
        is_mts: bool,
        is_beta: bool,
    ) -> DownloadableVersion {
        DownloadableVersion {
            version: version.to_string(),
            release_date: Some("2024-01-01".to_string()),
            download_url: format!("https://example.com/{}", version),
            release_notes_url: None,
            file_size: None,
            is_lts,
            is_mts,
            is_beta,
            is_latest: false,
        }
    }

    #[test]
    fn test_exclude_already_installed() {
        let installed = vec![
            create_test_installed_version("10.4.0"),
            create_test_installed_version("10.3.0"),
        ];

        let downloadable = vec![
            create_test_downloadable_version("10.4.0", true, false, false),
            create_test_downloadable_version("10.5.0", true, false, false),
            create_test_downloadable_version("10.3.0", false, true, false),
        ];

        let result = exclude_already_installed(downloadable, &installed, true);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].version, "10.5.0");
    }

    #[test]
    fn test_exclude_already_installed_disabled() {
        let installed = vec![create_test_installed_version("10.4.0")];

        let downloadable = vec![
            create_test_downloadable_version("10.4.0", true, false, false),
            create_test_downloadable_version("10.5.0", true, false, false),
        ];

        let result = exclude_already_installed(downloadable.clone(), &installed, false);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_filter_by_support_type_lts_only() {
        let versions = vec![
            create_test_downloadable_version("10.4.0", true, false, false),
            create_test_downloadable_version("10.5.0", false, true, false),
            create_test_downloadable_version("10.6.0", false, false, true),
        ];

        let result = filter_by_support_type(versions, true, false, false);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].version, "10.4.0");
    }

    #[test]
    fn test_filter_by_support_type_multiple() {
        let versions = vec![
            create_test_downloadable_version("10.4.0", true, false, false),
            create_test_downloadable_version("10.5.0", false, true, false),
            create_test_downloadable_version("10.6.0", false, false, true),
        ];

        let result = filter_by_support_type(versions, true, true, false);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_filter_by_support_type_no_filter() {
        let versions = vec![
            create_test_downloadable_version("10.4.0", true, false, false),
            create_test_downloadable_version("10.5.0", false, true, false),
        ];

        let result = filter_by_support_type(versions.clone(), false, false, false);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_check_version_installed() {
        let installed = vec![
            create_test_installed_version("10.4.0"),
            create_test_installed_version("10.3.0"),
        ];

        assert!(check_version_installed("10.4.0", &installed));
        assert!(check_version_installed("  10.4.0  ", &installed));
        assert!(!check_version_installed("10.5.0", &installed));
    }

    #[test]
    fn test_check_version_mismatch() {
        assert!(!check_version_mismatch(None, Some("10.4.0")));
        assert!(check_version_mismatch(Some("10.4.0"), Some("10.3.0")));
        assert!(!check_version_mismatch(Some("10.4.0"), Some("10.4.0")));
        assert!(check_version_mismatch(Some("10.4.0"), None));
    }

    #[test]
    fn test_check_version_selected() {
        assert!(!check_version_selected(None, "10.4.0"));
        assert!(check_version_selected(Some("10.4.0"), "10.4.0"));
        assert!(!check_version_selected(Some("10.4.0"), "10.3.0"));
    }

    #[test]
    fn test_compute_next_page() {
        assert_eq!(compute_next_page(0, 10), 1);
        assert_eq!(compute_next_page(5, 10), 1);
        assert_eq!(compute_next_page(10, 10), 2);
        assert_eq!(compute_next_page(25, 10), 3);
        assert_eq!(compute_next_page(10, 0), 1);
    }

    #[test]
    fn test_build_version_options() {
        let versions = vec![
            create_test_installed_version("10.4.0"),
            create_test_installed_version("10.3.0"),
        ];

        let options = build_version_options(&versions);
        assert_eq!(options.len(), 3);
        assert_eq!(options[0].value, "all");
        assert_eq!(options[0].label, "📦 All Versions");
        assert_eq!(options[1].value, "10.4.0");
        assert_eq!(options[1].label, "📦 10.4.0");
    }

    #[test]
    fn test_filter_by_search() {
        let versions = vec![
            create_test_downloadable_version("10.4.0", true, false, false),
            create_test_downloadable_version("10.5.0", false, true, false),
            create_test_downloadable_version("9.24.0", false, false, false),
        ];

        let result = filter_by_search(versions.clone(), Some("10.4"));
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].version, "10.4.0");

        let result = filter_by_search(versions.clone(), Some("10"));
        assert_eq!(result.len(), 2);

        let result = filter_by_search(versions.clone(), Some(""));
        assert_eq!(result.len(), 3);

        let result = filter_by_search(versions.clone(), None);
        assert_eq!(result.len(), 3);

        let result = filter_by_search(versions, Some("10.4"));
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn test_apply_version_filters_combined() {
        let installed = vec![create_test_installed_version("10.4.0")];

        let downloadable = vec![
            create_test_downloadable_version("10.4.0", true, false, false),
            create_test_downloadable_version("10.5.0", true, false, false),
            create_test_downloadable_version("10.6.0", false, true, false),
            create_test_downloadable_version("9.24.0", false, false, false),
        ];

        let result = apply_version_filters(
            downloadable.clone(),
            &installed,
            true,
            true,
            false,
            false,
            None,
        );
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].version, "10.5.0");

        let result = apply_version_filters(
            downloadable.clone(),
            &installed,
            false,
            false,
            false,
            false,
            Some("10.5"),
        );
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].version, "10.5.0");

        let result = apply_version_filters(
            downloadable,
            &installed,
            true,
            false,
            false,
            false,
            Some("10"),
        );
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_compare_versions_selected() {
        let result = compare_versions(
            "selected".to_string(),
            Some("10.4.0".to_string()),
            Some("10.4.0".to_string()),
            None,
        );
        assert!(result.is_ok());
        assert!(result.unwrap());

        let result = compare_versions(
            "selected".to_string(),
            Some("10.4.0".to_string()),
            Some("10.3.0".to_string()),
            None,
        );
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn test_compare_versions_installed() {
        let installed = vec![
            create_test_installed_version("10.4.0"),
            create_test_installed_version("10.3.0"),
        ];

        let result = compare_versions(
            "installed".to_string(),
            Some("10.4.0".to_string()),
            None,
            Some(installed.clone()),
        );
        assert!(result.is_ok());
        assert!(result.unwrap());

        let result = compare_versions(
            "installed".to_string(),
            Some("10.5.0".to_string()),
            None,
            Some(installed),
        );
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn test_compare_versions_mismatch() {
        let result = compare_versions(
            "mismatch".to_string(),
            Some("10.4.0".to_string()),
            Some("10.3.0".to_string()),
            None,
        );
        assert!(result.is_ok());
        assert!(result.unwrap());

        let result = compare_versions(
            "mismatch".to_string(),
            Some("10.4.0".to_string()),
            Some("10.4.0".to_string()),
            None,
        );
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn test_compare_versions_invalid_type() {
        let result = compare_versions(
            "invalid".to_string(),
            Some("10.4.0".to_string()),
            Some("10.4.0".to_string()),
            None,
        );
        assert!(result.is_err());
    }
}
