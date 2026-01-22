use serde::{Deserialize, Serialize};

/// Chrome executable path on Windows
pub const CHROME_EXECUTABLE_PATH: &str = "C:/Program Files/Google/Chrome/Application/chrome.exe";

/// Default timeout for navigation in seconds
pub const NAVIGATION_TIMEOUT_SECS: u64 = 60;

/// Default timeout for waiting for elements in seconds
pub const ELEMENT_WAIT_TIMEOUT_SECS: u64 = 30;

/// Poll interval for checking page changes in milliseconds
pub const PAGE_CHANGE_POLL_MS: u64 = 100;

/// Initial page load delay in milliseconds
pub const PAGE_LOAD_DELAY_MS: u64 = 2000;

/// Pagination navigation delay in milliseconds
pub const PAGINATION_DELAY_MS: u64 = 1500;

/// Click debounce delay in milliseconds
pub const CLICK_DEBOUNCE_MS: u64 = 500;

/// Build number extraction delay in milliseconds
pub const BUILD_NUMBER_EXTRACT_DELAY_MS: u64 = 3000;

/// Page click navigation delay in milliseconds
pub const CLICK_NAVIGATION_DELAY_MS: u64 = 2000;

/// Mendix marketplace base URL
pub const MENDIX_MARKETPLACE_URL: &str = "https://marketplace.mendix.com/link/studiopro";

/// Mendix artifacts download base URL
pub const MENDIX_ARTIFACTS_BASE_URL: &str = "https://artifacts.rnd.mendix.com/modelers";

/// Scraping configuration with timeout settings
#[derive(Debug, Clone)]
pub struct ScrapingConfig {
    pub wait_for_element_seconds: u64,
}

impl Default for ScrapingConfig {
    fn default() -> Self {
        Self {
            wait_for_element_seconds: ELEMENT_WAIT_TIMEOUT_SECS,
        }
    }
}

/// Version flags for downloadable versions
#[derive(Debug, Clone)]
pub struct VersionFlags {
    pub is_lts: bool,
    pub is_beta: bool,
    pub is_mts: bool,
    pub is_latest: bool,
}

impl VersionFlags {
    pub const fn new(is_lts: bool, is_beta: bool, is_mts: bool, is_latest: bool) -> Self {
        Self {
            is_lts,
            is_beta,
            is_mts,
            is_latest,
        }
    }

    pub const fn default() -> Self {
        Self {
            is_lts: false,
            is_beta: false,
            is_mts: false,
            is_latest: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DownloadableVersion {
    pub version: String,
    pub download_url: String,
    pub release_date: Option<String>,
    pub release_notes_url: Option<String>,
    pub file_size: Option<String>,
    pub is_lts: bool,
    pub is_beta: bool,
    pub is_mts: bool,
    pub is_latest: bool,
}

impl DownloadableVersion {
    pub fn new(
        version: String,
        download_url: String,
        release_date: Option<String>,
        release_notes_url: Option<String>,
        file_size: Option<String>,
        flags: VersionFlags,
    ) -> Self {
        Self {
            version,
            download_url,
            release_date,
            release_notes_url,
            file_size,
            is_lts: flags.is_lts,
            is_beta: flags.is_beta,
            is_mts: flags.is_mts,
            is_latest: flags.is_latest,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildInfo {
    pub build_number: String,
    pub download_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DownloadableVersionsCache {
    pub versions: Vec<DownloadableVersion>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub downloaded_bytes: u64,
    pub total_bytes: Option<u64>,
    pub percentage: Option<f32>,
}

/// Construct the marketplace URL for a specific version
pub fn construct_marketplace_url(version: &str) -> String {
    format!("{}/{}", MENDIX_MARKETPLACE_URL, version)
}

/// Construct download URL for versions below 11
pub fn construct_download_url(version: &str, build_number: &str) -> String {
    format!(
        "{}/Mendix-{}.{}-Setup.exe",
        MENDIX_ARTIFACTS_BASE_URL, version, build_number
    )
}

/// Construct download URL for version 11+
pub fn construct_download_url_v11(version: &str) -> String {
    format!("{}/Mendix-{}-Setup.exe", MENDIX_ARTIFACTS_BASE_URL, version)
}

/// Check if version is 11 or above
pub fn is_version_11_or_above(version: &str) -> bool {
    version
        .split('.')
        .next()
        .and_then(|major| major.parse::<u32>().ok())
        .map(|major| major >= 11)
        .unwrap_or(false)
}
