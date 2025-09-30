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

// Pure data types - immutable by design
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
#[allow(dead_code)]
pub struct ScrapingConfig {
    pub timeout_seconds: u64,
    pub wait_for_element_seconds: u64,
    pub headless: bool,
}

#[derive(Debug, Clone)]
pub struct ElementData {
    pub text: String,
    pub html: String,
}

#[derive(Debug, Clone)]
pub struct VersionFlags {
    pub is_lts: bool,
    pub is_beta: bool,
    pub is_mts: bool,
    pub is_latest: bool,
}

// Pure constructor functions
const fn create_default_scraping_config() -> ScrapingConfig {
    ScrapingConfig {
        timeout_seconds: 300,
        wait_for_element_seconds: 30,
        headless: true,
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

// Pure validation functions
fn is_valid_version_string(version: &str) -> bool {
    regex::Regex::new(r"^\d+\.\d+\.\d+$")
        .map(|re| re.is_match(version))
        .unwrap_or(false)
}

fn is_valid_download_url(url: &str) -> bool {
    url.starts_with("https://") && url.contains("mendix.com")
}

// Pure build number extraction functions
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

fn is_valid_version(version: &DownloadableVersion) -> bool {
    is_valid_version_string(&version.version)
        && (!version.download_url.is_empty() && is_valid_download_url(&version.download_url)
            || version.download_url.is_empty())
}

// Pure filtering and transformation functions
fn filter_valid_versions(versions: Vec<DownloadableVersion>) -> Vec<DownloadableVersion> {
    versions.into_iter().filter(is_valid_version).collect()
}

fn sort_versions_by_version_desc(
    mut versions: Vec<DownloadableVersion>,
) -> Vec<DownloadableVersion> {
    versions.sort_by(|a, b| {
        let parse_version = |version: &str| -> Vec<u32> {
            version.split('.').filter_map(|s| s.parse().ok()).collect()
        };

        let a_parts = parse_version(&a.version);
        let b_parts = parse_version(&b.version);
        b_parts.cmp(&a_parts)
    });
    versions
}

fn partition_versions_by_type(
    versions: Vec<DownloadableVersion>,
) -> (Vec<DownloadableVersion>, Vec<DownloadableVersion>) {
    versions.into_iter().partition(|v| !v.is_beta)
}

// Pure data extraction functions
fn extract_version_from_text(text: &str) -> Option<String> {
    regex::Regex::new(r"(\d+\.\d+\.\d+)")
        .ok()?
        .captures(text)?
        .get(1)
        .map(|m| m.as_str().to_string())
}

fn extract_download_url_from_html(html: &str) -> Option<String> {
    regex::Regex::new(r#"href="(https://[^"]*mendix[^"]*\.msi[^"]*)""#)
        .ok()?
        .captures(html)?
        .get(1)
        .map(|m| m.as_str().to_string())
}

fn extract_release_date_from_text(text: &str) -> Option<String> {
    regex::Regex::new(r"(\w+ \d{1,2}, \d{4})")
        .ok()?
        .captures(text)?
        .get(1)
        .map(|m| m.as_str().to_string())
}

fn detect_version_flags(text: &str) -> VersionFlags {
    let lower_text = text.to_lowercase();
    create_version_flags(
        lower_text.contains("lts") || lower_text.contains("long term"),
        lower_text.contains("beta") || lower_text.contains("preview"),
        false,
        false,
    )
}

fn extract_file_size_from_text(text: &str) -> Option<String> {
    regex::Regex::new(r"(\d+(?:\.\d+)?\s*(?:MB|GB|KB))")
        .ok()?
        .captures(text)?
        .get(1)
        .map(|m| m.as_str().to_string())
}

fn extract_release_notes_url_from_html(html: &str) -> Option<String> {
    regex::Regex::new(r#"href="([^"]*(?:release-notes|changelog)[^"]*)""#)
        .ok()?
        .captures(html)?
        .get(1)
        .map(|m| m.as_str().to_string())
}

// Pure composition function for version creation
fn create_version_from_element_data(data: &ElementData) -> Option<DownloadableVersion> {
    let version = extract_version_from_text(&data.text)?;
    let download_url = extract_download_url_from_html(&data.html).unwrap_or_default();
    let release_date = extract_release_date_from_text(&data.text);
    let release_notes_url = extract_release_notes_url_from_html(&data.html);
    let file_size = extract_file_size_from_text(&data.text);
    let flags = detect_version_flags(&data.text);

    Some(create_downloadable_version(
        version,
        download_url,
        release_date,
        release_notes_url,
        file_size,
        flags,
    ))
}

// Pure version processing pipeline
fn process_element_data_list(data_list: Vec<ElementData>) -> Vec<DownloadableVersion> {
    data_list
        .iter()
        .filter_map(create_version_from_element_data)
        .collect()
}

fn apply_version_processing_pipeline(
    versions: Vec<DownloadableVersion>,
) -> Vec<DownloadableVersion> {
    let filtered = filter_valid_versions(versions);
    sort_versions_by_version_desc(filtered)
}

// IO wrapper functions - only these perform side effects
async fn create_browser_instance() -> Result<(Browser, chromiumoxide::handler::Handler), String> {
    let config = BrowserConfig::builder()
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
        ])
        .incognito()
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

    // Navigate with timeout
    let navigation_timeout = Duration::from_secs(60);
    timeout(navigation_timeout, page.goto(url))
        .await
        .map_err(|_| format!("Navigation to {} timed out", url))?
        .map_err(|e| format!("Failed to navigate to {}: {}", url, e))?;

    Ok(page)
}

async fn extract_element_text(element: &Element) -> Result<String, String> {
    element
        .inner_text()
        .await
        .map_err(|e| format!("Failed to extract text: {}", e))?
        .ok_or_else(|| "Element has no text content".to_string())
}

async fn extract_element_html(element: &Element) -> Result<String, String> {
    element
        .inner_html()
        .await
        .map_err(|e| format!("Failed to extract HTML: {}", e))?
        .ok_or_else(|| "Element has no HTML content".to_string())
}

async fn extract_element_data(element: &Element) -> Result<ElementData, String> {
    let text = extract_element_text(element).await.unwrap_or_default();
    let html = extract_element_html(element).await.unwrap_or_default();

    Ok(ElementData { text, html })
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
    // Try multiple selectors for privacy modal
    let modal_selectors = [
        "[data-testid='uc-default-wall']",
        ".cookie-banner",
        "#cookie-banner",
        "[class*='cookie']",
        "[class*='privacy']",
    ];

    for modal_selector in &modal_selectors {
        if let Ok(_) = page.find_element(*modal_selector).await {
            // Try multiple button selectors
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

async fn extract_version_elements_from_page(
    page: &Page,
    config: &ScrapingConfig,
) -> Result<Vec<Element>, String> {
    let selectors = [
        "a[href*='.msi']",
        ".version-item",
        ".download-item",
        "[data-download]",
    ];

    for selector in &selectors {
        if let Ok(elements) =
            wait_for_element_with_timeout(page, *selector, config.wait_for_element_seconds).await
        {
            if !elements.is_empty() {
                return Ok(elements);
            }
        }
    }

    Err("No version elements found with any known selectors".to_string())
}

async fn extract_all_element_data(elements: Vec<Element>) -> Vec<ElementData> {
    let mut data_list = Vec::new();

    for element in elements {
        if let Ok(data) = extract_element_data(&element).await {
            data_list.push(data);
        }
    }

    data_list
}

async fn cleanup_browser_resources(
    mut browser: Browser,
    handler_task: tokio::task::JoinHandle<()>,
) -> Result<(), String> {
    let _ = browser.close().await;
    handler_task.abort();
    Ok(())
}

// Main orchestration functions
async fn scrape_versions_from_url(
    url: &str,
    config: &ScrapingConfig,
) -> Result<Vec<DownloadableVersion>, String> {
    let (browser, mut handler) = create_browser_instance().await?;

    // Create a shared flag to control handler lifetime
    let handler_running = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(true));
    let handler_flag = handler_running.clone();

    let handler_task = tokio::spawn(async move {
        while handler_flag.load(std::sync::atomic::Ordering::Relaxed) {
            match tokio::time::timeout(Duration::from_millis(100), handler.next()).await {
                Ok(Some(Ok(_))) => continue,
                Ok(Some(Err(_))) => continue,
                Ok(None) => break,
                Err(_) => continue, // Timeout, continue checking
            }
        }
    });

    let result = async {
        let page = navigate_to_url(&browser, url).await?;

        handle_privacy_modal_if_present(&page).await?;

        let elements = extract_version_elements_from_page(&page, config).await?;
        let element_data_list = extract_all_element_data(elements).await;
        let versions = process_element_data_list(element_data_list);

        Ok(apply_version_processing_pipeline(versions))
    }
    .await;

    // Signal handler to stop and cleanup
    handler_running.store(false, std::sync::atomic::Ordering::Relaxed);
    let _ = cleanup_browser_resources(browser, handler_task).await;
    result
}

// Pure datagrid parsing functions
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
    let selector = "button[aria-label='Go to next page']";

    if let Ok(elements) = page.find_elements(selector).await {
        if let Some(button) = elements.into_iter().next() {
            // Check if button is enabled
            if let Ok(disabled) = button.attribute("disabled").await {
                if disabled.is_some() {
                    return Err("Next page button is disabled".to_string());
                }
            }

            button
                .click()
                .await
                .map_err(|e| format!("Failed to click next page button: {}", e))?;

            // Wait for page to load
            tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;

            Ok(())
        } else {
            Err("Next page button not found".to_string())
        }
    } else {
        Err("Failed to find next page button".to_string())
    }
}

async fn navigate_to_page(page: &Page, target_page: u32) -> Result<(), String> {
    if target_page <= 1 {
        return Ok(());
    }

    // Navigate to the target page by clicking next button (target_page - 1) times
    for current_page in 1..target_page {
        println!(
            "Navigating to page {} (clicking next button)",
            current_page + 1
        );

        // Click next page button
        click_next_page_button(page).await?;

        // Wait for content to load
        tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;

        // Verify we're on the correct page by checking paging status
        if let Ok(elements) = page.find_elements("div.paging-status").await {
            if let Some(status_element) = elements.into_iter().next() {
                if let Ok(Some(status_text)) = status_element.inner_text().await {
                    println!("Current page status: {}", status_text);

                    // Extract current page info from status text (e.g., "1 to 10 of 290")
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

// Public API functions - compose pure functions with minimal IO
#[tauri::command]
pub async fn get_downloadable_mendix_versions() -> Result<Vec<DownloadableVersion>, String> {
    let config = create_default_scraping_config();
    let url = "https://marketplace.mendix.com/link/studiopro";
    scrape_versions_from_url(url, &config).await
}

#[tauri::command]
pub async fn get_downloadable_versions_by_type(
) -> Result<(Vec<DownloadableVersion>, Vec<DownloadableVersion>), String> {
    get_downloadable_mendix_versions()
        .await
        .map(partition_versions_by_type)
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

        // Navigate to the specified page if provided
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

#[tauri::command]
pub async fn debug_page_structure() -> Result<String, String> {
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

    tokio::time::sleep(Duration::from_millis(3000)).await;

    let result = async {
        let page = navigate_to_url(&browser, url).await?;

        // Wait for content to load
        tokio::time::sleep(Duration::from_millis(5000)).await;

        page.content()
            .await
            .map_err(|e| format!("Failed to get page content: {}", e))
    }
    .await;

    handler_running.store(false, std::sync::atomic::Ordering::Relaxed);
    let _ = cleanup_browser_resources(browser, handler_task).await;
    result
}

#[tauri::command]
pub async fn wait_for_datagrid_content() -> Result<String, String> {
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

    tokio::time::sleep(Duration::from_millis(3000)).await;

    let result = async {
        let page = navigate_to_url(&browser, url).await?;

        handle_privacy_modal_if_present(&page).await?;

        extract_datagrid_content(&page, &config).await
    }
    .await;

    handler_running.store(false, std::sync::atomic::Ordering::Relaxed);

    let _ = cleanup_browser_resources(browser, handler_task).await;
    result
}

// Pure build number extraction from marketplace page
async fn extract_build_number_from_marketplace(
    page: &Page,
    version: &str,
) -> Result<String, String> {
    // Wait for page content to load
    tokio::time::sleep(Duration::from_millis(3000)).await;

    // Look for span elements with build information
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

// Pure file download function
async fn download_file_to_path(url: &str, file_path: &str) -> Result<(), String> {
    let client = reqwest::Client::new();

    let response = client
        .get(url)
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

// Pure installer execution function
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

// Main API functions
#[tauri::command]
pub async fn extract_build_number(version: String) -> Result<BuildInfo, String> {
    let url = construct_marketplace_url(&version);
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
        let build_number = extract_build_number_from_marketplace(&page, &version).await?;
        let build_info = create_build_info(build_number, &version);
        Ok(build_info)
    }
    .await;

    handler_running.store(false, std::sync::atomic::Ordering::Relaxed);
    let _ = cleanup_browser_resources(browser, handler_task).await;

    result
}

#[tauri::command]
pub async fn download_and_install_mendix_version(version: String) -> Result<String, String> {
    // Step 1: Extract build number
    println!("📋 Step 1: Extracting build number...");
    let build_info = extract_build_number(version.clone()).await?;

    // Step 2: Construct download path
    println!("📁 Step 2: Setting up download path...");
    let downloads_dir =
        dirs::download_dir().ok_or_else(|| "Failed to get downloads directory".to_string())?;

    let installer_filename = format!("Mendix-{}.{}-Setup.exe", version, build_info.build_number);
    let installer_path = downloads_dir.join(&installer_filename);
    let installer_path_str = installer_path
        .to_str()
        .ok_or_else(|| "Invalid installer path".to_string())?;

    // Step 3: Download the installer
    println!("⬇️ Step 3: Downloading installer...");
    download_file_to_path(&build_info.download_url, installer_path_str).await?;

    // Step 4: Execute the installer
    println!("🚀 Step 4: Launching installer...");
    execute_installer(installer_path_str)?;
    println!("✅ Installer launched successfully");

    Ok(format!(
        "Successfully started installation of Mendix Studio Pro {}",
        version
    ))
}

#[tauri::command]
pub async fn get_download_url_for_version(version: String) -> Result<String, String> {
    let build_info = extract_build_number(version).await?;
    Ok(build_info.download_url)
}
