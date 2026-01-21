mod browser;
mod config;
mod download;
mod parsing;

use std::time::Duration;

use browser::{handle_privacy_modal_if_present, navigate_to_page, BrowserSession};
use config::{
    construct_download_url, construct_download_url_v11, construct_marketplace_url,
    is_version_11_or_above, ScrapingConfig, PAGE_LOAD_DELAY_MS,
};
use download::{download_file_to_path, execute_installer};
use parsing::{extract_build_number_from_marketplace, extract_datagrid_content, parse_datagrid_html};

// Re-export public types
pub use config::{BuildInfo, DownloadProgress, DownloadableVersion};

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
    let config = ScrapingConfig::default();
    let url = config::MENDIX_MARKETPLACE_URL;

    let session = BrowserSession::new().await?;

    let result = async {
        let page_instance = session.navigate(url).await?;

        handle_privacy_modal_if_present(&page_instance).await?;

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
    result
}

/// Extract build number for a specific version (used internally)
async fn extract_build_number(version: &str) -> Result<BuildInfo, String> {
    let url = construct_marketplace_url(version);
    let session = BrowserSession::new().await?;

    tokio::time::sleep(Duration::from_millis(PAGE_LOAD_DELAY_MS)).await;

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
    execute_installer(installer_path_str)?;
    println!("✅ Installer launched successfully");

    Ok(format!(
        "Successfully started installation of Mendix Studio Pro {}",
        version
    ))
}
