mod browser;
mod config;
mod download;
mod parsing;

use tokio::sync::Mutex;

use browser::{handle_privacy_modal_if_present, navigate_to_page, BrowserSession};
use config::{
    construct_download_url, construct_download_url_v11, construct_marketplace_url,
    is_version_11_or_above, ScrapingConfig,
};
use download::{download_file_to_path, execute_installer};
use parsing::{
    extract_build_number_from_marketplace, extract_datagrid_content, parse_datagrid_html,
    wait_for_datagrid_rows,
};

// Re-export public types
pub use config::{BuildInfo, DownloadProgress, DownloadableVersion, DownloadableVersionsCache};

/// Serializes browser-based scraping so concurrent requests queue up instead of
/// racing each other for system resources
static SCRAPE_LOCK: Mutex<()> = Mutex::const_new(());

/// Startup sweep for resources leaked by previous runs that died mid-scrape.
/// Holds the scrape lock so the sweep never kills a browser belonging to a
/// scrape that starts during it.
pub async fn cleanup_stale_scraper_resources() {
    let _scrape_lock = SCRAPE_LOCK.lock().await;
    println!("🧹 Cleaning up stale scraper browsers and profile directories...");
    browser::kill_stale_scraper_browsers().await;
    browser::remove_stale_profile_dirs().await;
    println!("🧹 Stale scraper cleanup finished");
}

/// Create BuildInfo from build number and version
fn create_build_info(build_number: String, version: &str) -> BuildInfo {
    let download_url = construct_download_url(version, &build_number);
    BuildInfo {
        build_number,
        download_url,
    }
}

#[tauri::command]
pub async fn get_downloadable_versions_from_datagrid(
    page: Option<u32>,
) -> Result<Vec<DownloadableVersion>, String> {
    println!("🔍 Datagrid scrape requested: page={:?}", page);
    let _scrape_lock = SCRAPE_LOCK.lock().await;
    println!("🔍 Scrape lock acquired, launching browser...");
    let config = ScrapingConfig::default();
    let url = config::MENDIX_MARKETPLACE_URL;

    let session = BrowserSession::new().await?;

    let result = async {
        let page_instance = session.navigate(url).await?;

        handle_privacy_modal_if_present(&page_instance).await?;
        wait_for_datagrid_rows(&page_instance, &config).await?;

        if let Some(target_page) = page {
            if target_page > 1 {
                navigate_to_page(&page_instance, target_page).await?;
            }
        }

        let html_content = extract_datagrid_content(&page_instance, &config).await?;
        parse_datagrid_html(&html_content)
    }
    .await;

    let _ = session.cleanup().await;
    match &result {
        Ok(versions) => println!("🔍 Datagrid scrape finished: {} versions", versions.len()),
        Err(error) => println!("🔍 Datagrid scrape failed: {}", error),
    }
    result
}

/// Extract build number for a specific version (used internally)
async fn extract_build_number(version: &str) -> Result<BuildInfo, String> {
    let _scrape_lock = SCRAPE_LOCK.lock().await;
    let url = construct_marketplace_url(version);
    let session = BrowserSession::new().await?;

    let result = async {
        let page = session.navigate(&url).await?;
        handle_privacy_modal_if_present(&page).await?;
        let build_number = extract_build_number_from_marketplace(&page, version).await?;
        let build_info = create_build_info(build_number, version);
        Ok(build_info)
    }
    .await;

    let _ = session.cleanup().await;
    result
}

#[tauri::command]
pub async fn download_and_install_mendix_version(version: String) -> Result<String, String> {
    let downloads_dir =
        dirs::download_dir().ok_or_else(|| "Failed to get downloads directory".to_string())?;

    let (download_url, installer_filename) = if is_version_11_or_above(&version) {
        println!("📋 Version 11+ detected, skipping build number extraction...");
        let url = construct_download_url_v11(&version);
        let filename = format!("Mendix-{}-Setup.exe", version);
        (url, filename)
    } else {
        println!("📋 Extracting build number...");
        let build_info = extract_build_number(&version).await?;
        let filename = format!("Mendix-{}.{}-Setup.exe", version, build_info.build_number);
        (build_info.download_url, filename)
    };

    println!("📁 Setting up download path...");
    let installer_path = downloads_dir.join(&installer_filename);
    let installer_path_str = installer_path
        .to_str()
        .ok_or_else(|| "Invalid installer path".to_string())?;

    println!("⬇️ Downloading installer...");
    download_file_to_path(&download_url, installer_path_str).await?;

    println!("🚀 Launching installer...");
    execute_installer(installer_path_str).await?;
    println!("✅ Installer launched successfully");

    Ok(format!(
        "Successfully started installation of Mendix Studio Pro {}",
        version
    ))
}

#[cfg(test)]
mod tests {
    #[tokio::test]
    #[ignore = "drives a real Chrome against the live Mendix marketplace"]
    async fn live_scrapes_second_datagrid_page() {
        let versions = super::get_downloadable_versions_from_datagrid(Some(2))
            .await
            .expect("second page scrape should succeed");

        assert_eq!(versions.len(), 10);
    }

    #[tokio::test]
    #[ignore = "drives a real Chrome against the live Mendix marketplace"]
    async fn live_extracts_build_number_for_pre_v11_version() {
        let build_info = super::extract_build_number("10.24.22")
            .await
            .expect("build number extraction should succeed");

        assert_eq!(build_info.build_number, "113362");
        assert_eq!(
            build_info.download_url,
            "https://artifacts.rnd.mendix.com/modelers/Mendix-10.24.22.113362-Setup.exe"
        );
    }
}
