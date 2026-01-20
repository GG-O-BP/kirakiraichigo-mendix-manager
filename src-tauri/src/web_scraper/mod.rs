use chromiumoxide::browser::{Browser, BrowserConfig};
use chromiumoxide::page::Page;
use chromiumoxide::Element;
use futures::StreamExt;
use futures::TryStreamExt;
use regex::Regex;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};

use std::process::Command;
use std::time::Duration;
use tokio::io::AsyncWriteExt;
use tokio::time::timeout;

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildInfo {
    pub build_number: String,
    pub download_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub downloaded_bytes: u64,
    pub total_bytes: Option<u64>,
    pub percentage: Option<f32>,
}

#[derive(Debug, Clone)]
pub struct ScrapingConfig {
    pub wait_for_element_seconds: u64,
}

#[derive(Debug, Clone)]
pub struct VersionFlags {
    pub is_lts: bool,
    pub is_beta: bool,
    pub is_mts: bool,
    pub is_latest: bool,
}

const fn create_default_scraping_config() -> ScrapingConfig {
    ScrapingConfig {
        wait_for_element_seconds: 30,
    }
}

const fn create_downloadable_version(
    version: String,
    download_url: String,
    release_date: Option<String>,
    release_notes_url: Option<String>,
    file_size: Option<String>,
    flags: VersionFlags,
) -> DownloadableVersion {
    DownloadableVersion {
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

const fn create_version_flags(
    is_lts: bool,
    is_beta: bool,
    is_mts: bool,
    is_latest: bool,
) -> VersionFlags {
    VersionFlags {
        is_lts,
        is_beta,
        is_mts,
        is_latest,
    }
}

fn extract_build_number_from_text(text: &str) -> Option<String> {
    Regex::new(r"Build\s+(\d{5})")
        .ok()?
        .captures(text)?
        .get(1)
        .map(|m| m.as_str().to_string())
}

fn construct_download_url(version: &str, build_number: &str) -> String {
    format!(
        "https://artifacts.rnd.mendix.com/modelers/Mendix-{}.{}-Setup.exe",
        version, build_number
    )
}

fn construct_download_url_v11(version: &str) -> String {
    format!(
        "https://artifacts.rnd.mendix.com/modelers/Mendix-{}-Setup.exe",
        version
    )
}

fn is_version_11_or_above(version: &str) -> bool {
    version
        .split('.')
        .next()
        .and_then(|major| major.parse::<u32>().ok())
        .map(|major| major >= 11)
        .unwrap_or(false)
}

fn construct_marketplace_url(version: &str) -> String {
    format!("https://marketplace.mendix.com/link/studiopro/{}", version)
}

fn create_build_info(build_number: String, version: &str) -> BuildInfo {
    let download_url = construct_download_url(version, &build_number);
    BuildInfo {
        build_number,
        download_url,
    }
}

async fn create_browser_instance() -> Result<(Browser, chromiumoxide::handler::Handler), String> {
    let temp_dir = std::env::temp_dir().join(format!("kiraichi-chrome-{}", std::process::id()));
    let user_data_dir = temp_dir.to_string_lossy().to_string();

    let config = BrowserConfig::builder()
        .chrome_executable("C:/Program Files/Google/Chrome/Application/chrome.exe")
        .user_data_dir(&user_data_dir)
        .args(vec![
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-extensions",
            "--disable-background-timer-throttling",
            "--disable-default-apps",
            "--disable-sync",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-features=VizDisplayCompositor",
            "--headless=new",
        ])
        .build()?;

    Browser::launch(config)
        .await
        .map_err(|e| format!("Failed to launch browser: {}", e))
}

async fn navigate_to_url(browser: &Browser, url: &str) -> Result<Page, String> {
    let page = browser
        .new_page("about:blank")
        .await
        .map_err(|e| format!("Failed to create new page: {}", e))?;

    let navigation_timeout = Duration::from_secs(60);
    timeout(navigation_timeout, page.goto(url))
        .await
        .map_err(|_| format!("Navigation to {} timed out", url))?
        .map_err(|e| format!("Failed to navigate to {}: {}", url, e))?;

    Ok(page)
}

async fn extract_element_html(element: &Element) -> Result<String, String> {
    element
        .inner_html()
        .await
        .map_err(|e| format!("Failed to extract HTML: {}", e))?
        .ok_or_else(|| "Element has no HTML content".to_string())
}

async fn wait_for_element_with_timeout(
    page: &Page,
    selector: &str,
    timeout_secs: u64,
) -> Result<Vec<Element>, String> {
    let timeout_duration = Duration::from_secs(timeout_secs);
    let start_time = std::time::Instant::now();

    loop {
        if let Ok(elements) = page.find_elements(selector).await {
            if !elements.is_empty() {
                tokio::time::sleep(Duration::from_millis(500)).await;
                return Ok(elements);
            }
        }

        if start_time.elapsed() > timeout_duration {
            return Err(format!("Timeout waiting for element '{}'", selector));
        }
    }
}

async fn handle_privacy_modal_if_present(page: &Page) -> Result<(), String> {
    let modal_selectors = [
        "[data-testid='uc-default-wall']",
        ".cookie-banner",
        "#cookie-banner",
        "[class*='cookie']",
        "[class*='privacy']",
    ];

    for modal_selector in &modal_selectors {
        if let Ok(_) = page.find_element(*modal_selector).await {
            let button_selectors = [
                "[data-testid='uc-deny-all-button']",
                "[data-testid='uc-reject-all-button']",
                "button[class*='reject']",
                "button[class*='deny']",
                "button:contains('Reject')",
                "button:contains('Deny')",
            ];

            for button_selector in &button_selectors {
                if let Ok(button) = page.find_element(*button_selector).await {
                    let _ = button.click().await;
                    return Ok(());
                }
            }
        }
    }

    Ok(())
}

async fn cleanup_browser_resources(
    mut browser: Browser,
    handler_task: tokio::task::JoinHandle<()>,
) -> Result<(), String> {
    let _ = browser.close().await;
    handler_task.abort();
    Ok(())
}

fn parse_datagrid_row(row: &scraper::ElementRef) -> Option<DownloadableVersion> {
    let version_selector = Selector::parse("div[role=gridcell] > div > div > a").ok()?;
    let span_selector = Selector::parse("div[role=gridcell] > div > div > span").ok()?;

    let version_text = row
        .select(&version_selector)
        .next()?
        .text()
        .collect::<String>()
        .trim()
        .to_string();

    let flags = row
        .select(&span_selector)
        .map(|span| span.text().collect::<String>().trim().to_uppercase())
        .fold(
            create_version_flags(false, false, false, false),
            |mut flags, text| {
                match text.as_str() {
                    "LTS" => flags.is_lts = true,
                    "MTS" => flags.is_mts = true,
                    "LATEST" => flags.is_latest = true,
                    "BETA" => flags.is_beta = true,
                    _ => {}
                }
                flags
            },
        );

    Some(create_downloadable_version(
        version_text,
        String::new(),
        None,
        None,
        None,
        flags,
    ))
}

fn parse_datagrid_html(html_content: &str) -> Result<Vec<DownloadableVersion>, String> {
    let document = Html::parse_document(html_content);
    let row_selector = Selector::parse("div.tr[role=row]")
        .map_err(|e| format!("Failed to parse row selector: {}", e))?;

    let versions = document
        .select(&row_selector)
        .filter_map(|row| parse_datagrid_row(&row))
        .collect();

    Ok(versions)
}

async fn extract_datagrid_content(page: &Page, config: &ScrapingConfig) -> Result<String, String> {
    let selector = "div.widget-datagrid-content";
    let elements =
        wait_for_element_with_timeout(page, selector, config.wait_for_element_seconds).await?;

    if let Some(element) = elements.into_iter().next() {
        extract_element_html(&element).await
    } else {
        Err("No datagrid content found".to_string())
    }
}

async fn click_next_page_button(page: &Page) -> Result<(), String> {
    let selectors = [
        "button[aria-label='Go to next page']",
        ".pagination-button[aria-label='Go to next page']",
        "button.pagination-button:nth-child(3)",
    ];

    for selector in &selectors {
        match wait_for_element_with_timeout(page, selector, 10).await {
            Ok(elements) => {
                if let Some(button) = elements.into_iter().next() {
                    if let Ok(disabled) = button.attribute("disabled").await {
                        if disabled.is_some() {
                            return Err("Next page button is disabled".to_string());
                        }
                    }

                    button
                        .click()
                        .await
                        .map_err(|e| format!("Failed to click next page button: {}", e))?;

                    tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;

                    return Ok(());
                }
            }
            Err(_) => continue,
        }
    }

    Err("Next page button not found with any selector".to_string())
}

async fn navigate_to_page(page: &Page, target_page: u32) -> Result<(), String> {
    if target_page <= 1 {
        return Ok(());
    }

    for current_page in 1..target_page {
        println!(
            "Navigating to page {} (clicking next button)",
            current_page + 1
        );

        click_next_page_button(page).await?;

        tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;

        if let Ok(elements) = page.find_elements("div.paging-status").await {
            if let Some(status_element) = elements.into_iter().next() {
                if let Ok(Some(status_text)) = status_element.inner_text().await {
                    println!("Current page status: {}", status_text);

                    if let Ok(re) = Regex::new(r"(\d+) to (\d+) of (\d+)") {
                        if let Some(captures) = re.captures(&status_text) {
                            let start_item: u32 = captures[1].parse().unwrap_or(0);
                            let expected_start = (current_page) * 10 + 1;

                            if start_item != expected_start {
                                return Err(format!("Page navigation failed. Expected to start at item {}, but got {}", expected_start, start_item));
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn get_downloadable_versions_from_datagrid(
    page: Option<u32>,
) -> Result<Vec<DownloadableVersion>, String> {
    let config = create_default_scraping_config();
    let url = "https://marketplace.mendix.com/link/studiopro";

    let (browser, mut handler) = create_browser_instance().await?;

    let handler_running = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(true));
    let handler_flag = handler_running.clone();

    let handler_task = tokio::spawn(async move {
        while handler_flag.load(std::sync::atomic::Ordering::Relaxed) {
            match tokio::time::timeout(Duration::from_millis(100), handler.next()).await {
                Ok(Some(Ok(_))) => continue,
                Ok(Some(Err(_))) => continue,
                Ok(None) => break,
                Err(_) => continue,
            }
        }
    });

    let result = async {
        let page_instance = navigate_to_url(&browser, url).await?;

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

    handler_running.store(false, std::sync::atomic::Ordering::Relaxed);
    let _ = cleanup_browser_resources(browser, handler_task).await;
    result
}

async fn extract_build_number_from_marketplace(
    page: &Page,
    version: &str,
) -> Result<String, String> {
    tokio::time::sleep(Duration::from_millis(3000)).await;

    let selector = "span.mx-text.pds-heading--sm.pds-mb-0";

    let elements = page
        .find_elements(selector)
        .await
        .map_err(|e| format!("Failed to find elements: {}", e))?;

    for element in elements {
        if let Ok(Some(text)) = element.inner_text().await {
            if text.contains("Build") {
                if let Some(build_number) = extract_build_number_from_text(&text) {
                    println!("✅ Build number extracted: {}", build_number);
                    return Ok(build_number);
                }
            }
        }
    }

    Err(format!("Build number not found for version {}", version))
}

async fn download_file_to_path(url: &str, file_path: &str) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(url)
        .header("Referer", "https://marketplace.mendix.com/")
        .header("Accept", "application/octet-stream,*/*")
        .send()
        .await
        .map_err(|e| format!("Failed to start download: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Download failed with status: {}",
            response.status()
        ));
    }

    let mut file = tokio::fs::File::create(file_path)
        .await
        .map_err(|e| format!("Failed to create file: {}", e))?;

    let mut stream = response.bytes_stream();
    let mut total_bytes = 0;

    while let Some(chunk) = stream
        .try_next()
        .await
        .map_err(|e| format!("Failed to read chunk: {}", e))?
    {
        total_bytes += chunk.len();

        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Failed to write chunk: {}", e))?;
    }

    println!("✅ Download completed: {} MB", total_bytes / (1024 * 1024));

    file.flush()
        .await
        .map_err(|e| format!("Failed to flush file: {}", e))?;

    Ok(())
}

fn execute_installer(installer_path: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        Command::new(installer_path)
            .arg("/SILENT")
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Failed to execute installer: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new(installer_path)
            .spawn()
            .map_err(|e| format!("Failed to execute installer: {}", e))?;
    }

    Ok(())
}

// Used internally by download_and_install_mendix_version
async fn extract_build_number(version: &str) -> Result<BuildInfo, String> {
    let url = construct_marketplace_url(version);
    let (browser, mut handler) = create_browser_instance().await?;

    let handler_running = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(true));
    let handler_flag = handler_running.clone();

    let handler_task = tokio::spawn(async move {
        while handler_flag.load(std::sync::atomic::Ordering::Relaxed) {
            match tokio::time::timeout(Duration::from_millis(100), handler.next()).await {
                Ok(Some(Ok(_))) => continue,
                Ok(Some(Err(_))) => continue,
                Ok(None) => break,
                Err(_) => continue,
            }
        }
    });

    tokio::time::sleep(Duration::from_millis(2000)).await;

    let result = async {
        let page = navigate_to_url(&browser, &url).await?;
        handle_privacy_modal_if_present(&page).await?;
        let build_number = extract_build_number_from_marketplace(&page, version).await?;
        let build_info = create_build_info(build_number, version);
        Ok(build_info)
    }
    .await;

    handler_running.store(false, std::sync::atomic::Ordering::Relaxed);
    let _ = cleanup_browser_resources(browser, handler_task).await;

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
