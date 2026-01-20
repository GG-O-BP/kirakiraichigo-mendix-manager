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

fn exclude_installed_versions_internal(
    versions: Vec<DownloadableVersion>,
    installed_versions: &[MendixVersion],
    show_only_downloadable: bool,
) -> Vec<DownloadableVersion> {
    if !show_only_downloadable {
        return versions;
    }

    versions
        .into_iter()
        .filter(|v| !is_version_installed(v, installed_versions))
        .collect()
}

fn filter_by_version_support_type_internal(
    versions: Vec<DownloadableVersion>,
    show_lts_only: bool,
    show_mts_only: bool,
    show_beta_only: bool,
) -> Vec<DownloadableVersion> {
    // If no filters are active, return all versions
    if !show_lts_only && !show_mts_only && !show_beta_only {
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

fn is_version_in_installed_list_internal(
    version: &str,
    installed_versions: &[MendixVersion],
) -> bool {
    let normalized_version = normalize_version_string(version);
    installed_versions
        .iter()
        .any(|installed| extract_installed_version_string(installed) == normalized_version)
}

fn is_app_version_mismatch_internal(
    selected_version: Option<&str>,
    app_version: Option<&str>,
) -> bool {
    match (selected_version, app_version) {
        (None, _) => false, // No selected version means no mismatch
        (Some(selected), Some(app)) => {
            normalize_version_string(selected) != normalize_version_string(app)
        }
        (Some(_), None) => true, // App has no version but we have a selected version
    }
}

fn is_version_currently_selected_internal(
    selected_version: Option<&str>,
    version: &str,
) -> bool {
    match selected_version {
        None => false,
        Some(selected) => normalize_version_string(selected) == normalize_version_string(version),
    }
}

fn calculate_next_page_number_internal(total_items: usize, items_per_page: usize) -> usize {
    if items_per_page == 0 {
        return 1;
    }

    let pages = total_items / items_per_page;
    std::cmp::max(1, pages + 1)
}

fn filter_by_search_term_internal(
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

fn filter_downloadable_versions_internal(
    versions: Vec<DownloadableVersion>,
    installed_versions: &[MendixVersion],
    show_only_downloadable: bool,
    show_lts_only: bool,
    show_mts_only: bool,
    show_beta_only: bool,
    search_term: Option<&str>,
) -> Vec<DownloadableVersion> {
    // Step 1: Exclude installed versions if requested
    let after_installed = exclude_installed_versions_internal(
        versions,
        installed_versions,
        show_only_downloadable,
    );

    // Step 2: Filter by version support type
    let after_support_type = filter_by_version_support_type_internal(
        after_installed,
        show_lts_only,
        show_mts_only,
        show_beta_only,
    );

    // Step 3: Filter by search term
    filter_by_search_term_internal(after_support_type, search_term)
}

fn create_version_options_internal(versions: &[MendixVersion]) -> Vec<VersionOption> {
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
pub fn exclude_installed_versions(
    versions: Vec<DownloadableVersion>,
    installed_versions: Vec<MendixVersion>,
    show_only_downloadable: bool,
) -> Result<Vec<DownloadableVersion>, String> {
    Ok(exclude_installed_versions_internal(
        versions,
        &installed_versions,
        show_only_downloadable,
    ))
}

#[tauri::command]
pub fn filter_by_version_support_type(
    versions: Vec<DownloadableVersion>,
    show_lts_only: bool,
    show_mts_only: bool,
    show_beta_only: bool,
) -> Result<Vec<DownloadableVersion>, String> {
    Ok(filter_by_version_support_type_internal(
        versions,
        show_lts_only,
        show_mts_only,
        show_beta_only,
    ))
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
    Ok(filter_downloadable_versions_internal(
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
pub fn is_version_in_installed_list(
    version: String,
    installed_versions: Vec<MendixVersion>,
) -> Result<bool, String> {
    Ok(is_version_in_installed_list_internal(
        &version,
        &installed_versions,
    ))
}

#[tauri::command]
pub fn is_app_version_mismatch(
    selected_version: Option<String>,
    app_version: Option<String>,
) -> Result<bool, String> {
    Ok(is_app_version_mismatch_internal(
        selected_version.as_deref(),
        app_version.as_deref(),
    ))
}

#[tauri::command]
pub fn is_version_currently_selected(
    selected_version: Option<String>,
    version: String,
) -> Result<bool, String> {
    Ok(is_version_currently_selected_internal(
        selected_version.as_deref(),
        &version,
    ))
}

#[tauri::command]
pub fn calculate_next_page_number(
    total_items: usize,
    items_per_page: usize,
) -> Result<usize, String> {
    Ok(calculate_next_page_number_internal(total_items, items_per_page))
}

#[tauri::command]
pub fn create_version_options(versions: Vec<MendixVersion>) -> Result<Vec<VersionOption>, String> {
    Ok(create_version_options_internal(&versions))
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
    fn test_exclude_installed_versions() {
        let installed = vec![
            create_test_installed_version("10.4.0"),
            create_test_installed_version("10.3.0"),
        ];

        let downloadable = vec![
            create_test_downloadable_version("10.4.0", true, false, false),
            create_test_downloadable_version("10.5.0", true, false, false),
            create_test_downloadable_version("10.3.0", false, true, false),
        ];

        let result = exclude_installed_versions_internal(downloadable, &installed, true);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].version, "10.5.0");
    }

    #[test]
    fn test_exclude_installed_versions_disabled() {
        let installed = vec![create_test_installed_version("10.4.0")];

        let downloadable = vec![
            create_test_downloadable_version("10.4.0", true, false, false),
            create_test_downloadable_version("10.5.0", true, false, false),
        ];

        let result = exclude_installed_versions_internal(downloadable.clone(), &installed, false);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_filter_by_version_support_type_lts_only() {
        let versions = vec![
            create_test_downloadable_version("10.4.0", true, false, false),
            create_test_downloadable_version("10.5.0", false, true, false),
            create_test_downloadable_version("10.6.0", false, false, true),
        ];

        let result = filter_by_version_support_type_internal(versions, true, false, false);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].version, "10.4.0");
    }

    #[test]
    fn test_filter_by_version_support_type_multiple() {
        let versions = vec![
            create_test_downloadable_version("10.4.0", true, false, false),
            create_test_downloadable_version("10.5.0", false, true, false),
            create_test_downloadable_version("10.6.0", false, false, true),
        ];

        let result = filter_by_version_support_type_internal(versions, true, true, false);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_filter_by_version_support_type_no_filter() {
        let versions = vec![
            create_test_downloadable_version("10.4.0", true, false, false),
            create_test_downloadable_version("10.5.0", false, true, false),
        ];

        let result = filter_by_version_support_type_internal(versions.clone(), false, false, false);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_is_version_in_installed_list() {
        let installed = vec![
            create_test_installed_version("10.4.0"),
            create_test_installed_version("10.3.0"),
        ];

        assert!(is_version_in_installed_list_internal("10.4.0", &installed));
        assert!(is_version_in_installed_list_internal("  10.4.0  ", &installed));
        assert!(!is_version_in_installed_list_internal("10.5.0", &installed));
    }

    #[test]
    fn test_is_app_version_mismatch() {
        assert!(!is_app_version_mismatch_internal(None, Some("10.4.0")));
        assert!(is_app_version_mismatch_internal(
            Some("10.4.0"),
            Some("10.3.0")
        ));
        assert!(!is_app_version_mismatch_internal(
            Some("10.4.0"),
            Some("10.4.0")
        ));
        assert!(is_app_version_mismatch_internal(Some("10.4.0"), None));
    }

    #[test]
    fn test_is_version_currently_selected() {
        assert!(!is_version_currently_selected_internal(None, "10.4.0"));
        assert!(is_version_currently_selected_internal(
            Some("10.4.0"),
            "10.4.0"
        ));
        assert!(!is_version_currently_selected_internal(
            Some("10.4.0"),
            "10.3.0"
        ));
    }

    #[test]
    fn test_calculate_next_page_number() {
        assert_eq!(calculate_next_page_number_internal(0, 10), 1);
        assert_eq!(calculate_next_page_number_internal(5, 10), 1);
        assert_eq!(calculate_next_page_number_internal(10, 10), 2);
        assert_eq!(calculate_next_page_number_internal(25, 10), 3);
        assert_eq!(calculate_next_page_number_internal(10, 0), 1);
    }

    #[test]
    fn test_create_version_options() {
        let versions = vec![
            create_test_installed_version("10.4.0"),
            create_test_installed_version("10.3.0"),
        ];

        let options = create_version_options_internal(&versions);
        assert_eq!(options.len(), 3);
        assert_eq!(options[0].value, "all");
        assert_eq!(options[0].label, "📦 All Versions");
        assert_eq!(options[1].value, "10.4.0");
        assert_eq!(options[1].label, "📦 10.4.0");
    }

    #[test]
    fn test_filter_by_search_term() {
        let versions = vec![
            create_test_downloadable_version("10.4.0", true, false, false),
            create_test_downloadable_version("10.5.0", false, true, false),
            create_test_downloadable_version("9.24.0", false, false, false),
        ];

        // Search for "10.4"
        let result = filter_by_search_term_internal(versions.clone(), Some("10.4"));
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].version, "10.4.0");

        // Search for "10" (matches two)
        let result = filter_by_search_term_internal(versions.clone(), Some("10"));
        assert_eq!(result.len(), 2);

        // Empty search term returns all
        let result = filter_by_search_term_internal(versions.clone(), Some(""));
        assert_eq!(result.len(), 3);

        // None search term returns all
        let result = filter_by_search_term_internal(versions.clone(), None);
        assert_eq!(result.len(), 3);

        // Case insensitive search
        let result = filter_by_search_term_internal(versions, Some("10.4"));
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn test_filter_downloadable_versions_combined() {
        let installed = vec![create_test_installed_version("10.4.0")];

        let downloadable = vec![
            create_test_downloadable_version("10.4.0", true, false, false),
            create_test_downloadable_version("10.5.0", true, false, false),
            create_test_downloadable_version("10.6.0", false, true, false),
            create_test_downloadable_version("9.24.0", false, false, false),
        ];

        // Filter: exclude installed, LTS only
        let result = filter_downloadable_versions_internal(
            downloadable.clone(),
            &installed,
            true,  // show_only_downloadable (exclude installed)
            true,  // show_lts_only
            false, // show_mts_only
            false, // show_beta_only
            None,
        );
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].version, "10.5.0");

        // Filter: all versions with search term
        let result = filter_downloadable_versions_internal(
            downloadable.clone(),
            &installed,
            false, // don't exclude installed
            false, // no LTS filter
            false, // no MTS filter
            false, // no beta filter
            Some("10.5"),
        );
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].version, "10.5.0");

        // Filter: exclude installed + search term
        let result = filter_downloadable_versions_internal(
            downloadable,
            &installed,
            true,  // exclude installed
            false, // no support type filter
            false,
            false,
            Some("10"),
        );
        assert_eq!(result.len(), 2); // 10.5.0 and 10.6.0 (10.4.0 is installed)
    }
}
