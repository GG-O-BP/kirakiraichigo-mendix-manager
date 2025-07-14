use chromiumoxide::browser::{Browser, BrowserConfig};
use chromiumoxide::page::Page;
use chromiumoxide::Element;
use futures::StreamExt;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::time::timeout;

// Pure data types - immutable by design
#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone)]
pub struct ScrapingConfig {
    pub timeout_seconds: u64,
    pub wait_for_element_seconds: u64,
    pub headless: bool,
}

// Pure constructor functions
fn create_default_scraping_config() -> ScrapingConfig {
    ScrapingConfig {
        timeout_seconds: 30,
        wait_for_element_seconds: 10,
        headless: false, // Make browser visible for debugging
    }
}

fn create_downloadable_version(
    version: String,
    download_url: String,
    release_date: Option<String>,
    release_notes_url: Option<String>,
    file_size: Option<String>,
    is_lts: bool,
    is_beta: bool,
    is_mts: bool,
    is_latest: bool,
) -> DownloadableVersion {
    DownloadableVersion {
        version,
        download_url,
        release_date,
        release_notes_url,
        file_size,
        is_lts,
        is_beta,
        is_mts,
        is_latest,
    }
}

// Pure validation functions
fn is_valid_version_string(version: &str) -> bool {
    // Validate version format (e.g., "10.6.0", "9.24.2")
    regex::Regex::new(r"^\d+\.\d+\.\d+$")
        .map(|re| re.is_match(version))
        .unwrap_or(false)
}

fn is_valid_download_url(url: &str) -> bool {
    url.starts_with("https://") && url.contains("mendix.com")
}

// Pure filtering and sorting functions
fn filter_valid_versions(versions: Vec<DownloadableVersion>) -> Vec<DownloadableVersion> {
    versions
        .into_iter()
        .filter(|v| is_valid_version_string(&v.version) && is_valid_download_url(&v.download_url))
        .collect()
}

fn sort_versions_by_version_desc(versions: Vec<DownloadableVersion>) -> Vec<DownloadableVersion> {
    let mut sorted = versions;
    sorted.sort_by(|a, b| {
        let parse_version = |version: &str| -> Vec<u32> {
            version.split('.').map(|s| s.parse().unwrap_or(0)).collect()
        };

        let a_parts = parse_version(&a.version);
        let b_parts = parse_version(&b.version);
        b_parts.cmp(&a_parts)
    });
    sorted
}

fn partition_versions_by_type(
    versions: Vec<DownloadableVersion>,
) -> (Vec<DownloadableVersion>, Vec<DownloadableVersion>) {
    versions.into_iter().partition(|v| !v.is_beta)
}

// Pure data extraction functions (to be customized based on actual HTML structure)
fn extract_version_from_element_text(text: &str) -> Option<String> {
    // TODO: Customize this based on actual HTML structure
    // Example patterns to look for:
    // - "Studio Pro 10.6.0"
    // - "Version 9.24.2"
    // - "Mendix 10.6.0"

    regex::Regex::new(r"(\d+\.\d+\.\d+)")
        .ok()?
        .captures(text)?
        .get(1)
        .map(|m| m.as_str().to_string())
}

fn extract_download_url_from_element(element_html: &str) -> Option<String> {
    // TODO: Customize this based on actual HTML structure
    // Look for patterns like:
    // - href="https://download.mendix.com/..."
    // - data-download-url="..."
    // - onclick with download URL

    regex::Regex::new(r#"href="(https://[^"]*mendix[^"]*\.msi[^"]*)""#)
        .ok()?
        .captures(element_html)?
        .get(1)
        .map(|m| m.as_str().to_string())
}

fn extract_release_date_from_text(text: &str) -> Option<String> {
    // TODO: Customize based on actual date format on the page
    // Common patterns:
    // - "Released: January 15, 2024"
    // - "2024-01-15"
    // - "Jan 15, 2024"

    regex::Regex::new(r"(\w+ \d{1,2}, \d{4})")
        .ok()?
        .captures(text)?
        .get(1)
        .map(|m| m.as_str().to_string())
}

fn detect_version_flags(text: &str) -> (bool, bool) {
    let is_lts = text.to_lowercase().contains("lts") || text.to_lowercase().contains("long term");
    let is_beta = text.to_lowercase().contains("beta") || text.to_lowercase().contains("preview");
    (is_lts, is_beta)
}

// IO wrapper functions - only these perform side effects
async fn create_browser_instance(_config: &ScrapingConfig) -> Result<Browser, String> {
    let (browser, _handler) = Browser::launch(BrowserConfig::builder().with_head().build()?)
        .await
        .map_err(|e| format!("Failed to launch browser: {}", e))?;

    Ok(browser)
}

async fn navigate_to_page(browser: &Browser, url: &str) -> Result<Page, String> {
    println!("Creating new page...");
    let page = browser
        .new_page("about:blank")
        .await
        .map_err(|e| format!("Failed to create new page: {}", e))?;

    println!("Navigating to URL: {}", url);

    // Add timeout for navigation
    let navigation_timeout = Duration::from_secs(300);
    let navigation_result = timeout(navigation_timeout, page.goto(url)).await;

    match navigation_result {
        Ok(Ok(_)) => {
            println!("Navigation successful");
            // Wait for page to be ready
            tokio::time::sleep(Duration::from_secs(20)).await;
            Ok(page)
        }
        Ok(Err(e)) => Err(format!("Failed to navigate to {}: {}", url, e)),
        Err(_) => Err(format!("Navigation to {} timed out after 30 seconds", url)),
    }
}

async fn wait_for_page_load(page: &Page, config: &ScrapingConfig) -> Result<(), String> {
    println!("Waiting for page to load completely...");

    let wait_duration = Duration::from_secs(config.wait_for_element_seconds);
    let start_time = std::time::Instant::now();

    // First, wait for basic page load
    tokio::time::sleep(Duration::from_secs(30)).await;

    // Try to wait for common page elements that indicate the page is loaded
    let selectors_to_try = vec![
        "body",
        "div",
        "main",
        ".widget-datagrid-content",
        "[data-testid]",
        ".content",
    ];

    for selector in selectors_to_try {
        if start_time.elapsed() > wait_duration {
            break;
        }

        if let Ok(elements) = page.find_elements(selector).await {
            if !elements.is_empty() {
                println!("Found page element with selector: {}", selector);
                // Additional wait for dynamic content
                tokio::time::sleep(Duration::from_secs(20)).await;
                return Ok(());
            }
        }

        tokio::time::sleep(Duration::from_millis(500)).await;
    }

    println!("Page load wait completed (timeout or no specific elements found)");
    Ok(())
}

async fn wait_for_element_and_get_html(
    page: &Page,
    selector: &str,
    config: &ScrapingConfig,
) -> Result<String, String> {
    let wait_duration = Duration::from_secs(config.wait_for_element_seconds);
    let start_time = std::time::Instant::now();

    loop {
        // Check if element exists
        if let Ok(elements) = page.find_elements(selector).await {
            if !elements.is_empty() {
                // Element found, extract HTML
                match elements[0].inner_html().await {
                    Ok(Some(html)) => {
                        println!("Found element '{}' with HTML content:", selector);
                        println!("{}", html);
                        return Ok(html);
                    }
                    Ok(None) => {
                        println!("Element '{}' found but has no HTML content", selector);
                        return Ok(String::new());
                    }
                    Err(e) => {
                        return Err(format!(
                            "Failed to extract HTML from element '{}': {}",
                            selector, e
                        ))
                    }
                }
            }
        }

        // Check timeout
        if start_time.elapsed() > wait_duration {
            return Err(format!(
                "Timeout waiting for element '{}' to appear",
                selector
            ));
        }

        // Wait a bit before checking again
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
}

async fn extract_version_elements(page: &Page) -> Result<Vec<Element>, String> {
    // TODO: Customize these selectors based on actual HTML structure
    // Common patterns to look for:
    // - Download buttons: "a[href*='.msi'], button[data-download]"
    // - Version containers: ".version-item, .download-item, .release-item"
    // - Version links: "a[href*='studiopro'], a[href*='download']"

    let selectors = vec![
        "a[href*='.msi']", // Direct links to MSI files
        ".version-item",   // Version container divs
        ".download-item",  // Download container divs
        "[data-download]", // Elements with download data attributes
        "a",               // Fallback: all links
    ];

    for selector in selectors {
        if let Ok(elements) = page.find_elements(selector).await {
            if !elements.is_empty() {
                return Ok(elements);
            }
        }
    }

    Err("No version elements found with any known selectors".to_string())
}

async fn extract_text_from_element(element: &Element) -> Result<String, String> {
    // Get text content from element
    match element.inner_text().await {
        Ok(Some(text)) => Ok(text),
        Ok(None) => Ok(String::new()),
        Err(e) => Err(format!("Failed to extract text from element: {}", e)),
    }
}

async fn extract_html_from_element(element: &Element) -> Result<String, String> {
    // Get HTML content from element
    match element.inner_html().await {
        Ok(Some(html)) => Ok(html),
        Ok(None) => Ok(String::new()),
        Err(e) => Err(format!("Failed to extract HTML from element: {}", e)),
    }
}

// Pure composition functions
async fn process_version_element(element: &Element) -> Result<Option<DownloadableVersion>, String> {
    // Extract text and HTML content
    let text = extract_text_from_element(element).await?;
    let html = extract_html_from_element(element).await?;

    // Extract version information
    let version = match extract_version_from_element_text(&text) {
        Some(v) => v,
        None => return Ok(None), // Skip if no version found
    };

    let download_url = match extract_download_url_from_element(&html) {
        Some(url) => url,
        None => return Ok(None), // Skip if no download URL found
    };

    let release_date = extract_release_date_from_text(&text);
    let (is_lts, is_beta) = detect_version_flags(&text);

    // TODO: Extract additional information based on page structure:
    // - File size: look for patterns like "123 MB", "1.2 GB"
    // - Release notes URL: look for links containing "release-notes" or "changelog"

    let file_size = None; // TODO: Implement file size extraction
    let release_notes_url = None; // TODO: Implement release notes URL extraction

    Ok(Some(create_downloadable_version(
        version,
        download_url,
        release_date,
        release_notes_url,
        file_size,
        is_lts,
        is_beta,
        false, // is_mts
        false, // is_latest
    )))
}

async fn process_all_version_elements(
    elements: Vec<Element>,
) -> Result<Vec<DownloadableVersion>, String> {
    let mut versions = Vec::new();

    for element in elements {
        match process_version_element(&element).await {
            Ok(Some(version)) => versions.push(version),
            Ok(None) => continue, // Skip invalid elements
            Err(e) => eprintln!("Warning: Failed to process element: {}", e),
        }
    }

    Ok(versions)
}

// Privacy modal handler function
async fn handle_privacy_modal(page: &Page) -> Result<(), String> {
    println!("Checking for privacy modal...");

    // Wait a moment for modal to potentially appear
    tokio::time::sleep(Duration::from_millis(500)).await;

    match page.find_element("[data-testid='uc-default-wall']").await {
        Ok(_) => {
            println!("Privacy modal found, looking for reject button...");
            match page
                .find_element("[data-testid='uc-deny-all-button']")
                .await
            {
                Ok(reject_button) => {
                    println!("Clicking reject cookies button...");
                    match reject_button.click().await {
                        Ok(_) => {
                            println!("Successfully rejected cookies");
                            // Wait a moment for modal to disappear
                            tokio::time::sleep(Duration::from_secs(2)).await;
                        }
                        Err(e) => println!("Failed to click reject button: {}", e),
                    }
                }
                Err(_) => println!("Reject button not found in modal"),
            }
        }
        Err(_) => {
            println!("No privacy modal found, proceeding...");
        }
    }

    Ok(())
}

// Main API functions - compose pure functions with minimal IO
#[tauri::command]
pub async fn get_downloadable_mendix_versions() -> Result<Vec<DownloadableVersion>, String> {
    println!("Starting Mendix versions scraping...");

    let config = create_default_scraping_config();
    let url = "https://marketplace.mendix.com/link/studiopro";

    // Create browser and navigate to page
    let mut browser = create_browser_instance(&config).await?;
    println!("Navigating to page: {}", url);
    let page = navigate_to_page(&browser, url).await?;

    // Wait for page to load completely
    wait_for_page_load(&page, &config).await?;

    // Handle privacy modal if it appears
    let _ = handle_privacy_modal(&page).await;

    // Extract and print datagrid content for debugging
    let selector = "div.widget-datagrid-content";
    match wait_for_element_and_get_html(&page, selector, &config).await {
        Ok(_) => println!("Successfully extracted datagrid content"),
        Err(e) => println!("Warning: Could not extract datagrid content: {}", e),
    }

    // Extract version elements from the page
    let elements = extract_version_elements(&page).await?;

    // Process all elements to extract version information
    let versions = process_all_version_elements(elements).await?;

    // Filter and sort the results
    let processed_versions = filter_valid_versions(versions);
    let sorted_versions = sort_versions_by_version_desc(processed_versions);

    // Close browser
    let _ = browser.close().await;

    Ok(sorted_versions)
}

#[tauri::command]
pub async fn get_downloadable_versions_by_type(
) -> Result<(Vec<DownloadableVersion>, Vec<DownloadableVersion>), String> {
    let all_versions = get_downloadable_mendix_versions().await?;
    let (stable_versions, beta_versions) = partition_versions_by_type(all_versions);

    Ok((stable_versions, beta_versions))
}

// Simple browser test function to isolate issues
#[tauri::command]
pub async fn test_browser_only() -> Result<String, String> {
    println!("Starting browser test...");

    let (mut browser, mut handler) = Browser::launch(BrowserConfig::builder().with_head().build()?)
        .await
        .map_err(|e| format!("Failed to launch browser: {}", e))?;

    println!("Browser opened successfully");

    // Spawn handler in a separate task - this is crucial for chromiumoxide to work
    let handler_task = tokio::spawn(async move {
        while let Some(h) = handler.next().await {
            match h {
                Ok(_) => {
                    // Continue processing
                }
                Err(e) => {
                    println!("Handler error (continuing): {:?}", e);
                    // Don't break on errors, just log them
                }
            }
        }
        println!("Handler task ended");
    });

    // Wait for browser to be fully ready
    println!("Waiting for browser to be ready...");
    tokio::time::sleep(Duration::from_secs(2)).await;

    // Test navigation
    let page = browser
        .new_page("about:blank")
        .await
        .map_err(|e| format!("Failed to create new page: {}", e))?;

    println!("New page created");

    let url = "https://marketplace.mendix.com/link/studiopro";
    println!("Navigating to: {}", url);

    // Add timeout for navigation
    let navigation_result = timeout(Duration::from_secs(30), page.goto(url)).await;

    match navigation_result {
        Ok(Ok(_)) => {
            println!("Navigation successful");

            // Wait for page to fully load
            println!("Waiting for page to load...");
            tokio::time::sleep(Duration::from_secs(3)).await;

            // Try to wait for navigation to complete
            match timeout(Duration::from_secs(10), page.wait_for_navigation()).await {
                Ok(Ok(_)) => println!("Navigation completed"),
                Ok(Err(e)) => println!("Navigation completion error: {}", e),
                Err(_) => println!("Navigation completion timeout"),
            }

            // Handle privacy modal if it appears
            let _ = handle_privacy_modal(&page).await;

            // Wait longer to observe the page
            println!("Waiting 10 seconds to observe the page...");
            tokio::time::sleep(Duration::from_secs(10)).await;
            println!("Finished waiting on page");
        }
        Ok(Err(e)) => {
            println!("Navigation failed: {}", e);
            tokio::time::sleep(Duration::from_secs(50)).await;
        }
        Err(_) => {
            println!("Navigation timed out after 30 seconds");
            tokio::time::sleep(Duration::from_secs(20)).await;
        }
    }

    println!("Closing browser...");
    match browser.close().await {
        Ok(_) => println!("Browser closed successfully"),
        Err(e) => println!("Error closing browser: {}", e),
    }

    // Wait a bit before cleaning up the handler task
    tokio::time::sleep(Duration::from_secs(1)).await;

    // Clean up the handler task
    handler_task.abort();
    println!("Handler task cleaned up");

    Ok("Browser test with navigation completed".to_string())
}

// Utility function for testing different selectors
#[tauri::command]
pub async fn debug_page_structure() -> Result<String, String> {
    let config = create_default_scraping_config();
    let url = "https://marketplace.mendix.com/link/studiopro";

    let mut browser = create_browser_instance(&config).await?;
    let page = navigate_to_page(&browser, url).await?;

    // Wait a bit for page to load
    tokio::time::sleep(Duration::from_secs(50)).await;

    // Get page HTML for debugging
    let html = match page.content().await {
        Ok(content) => content,
        Err(e) => return Err(format!("Failed to get page content: {}", e)),
    };

    let _ = browser.close().await;

    Ok(html)
}

// Function to wait for div.widget-datagrid-content and print its HTML
#[tauri::command]
pub async fn wait_for_datagrid_content() -> Result<String, String> {
    println!("=== Starting wait_for_datagrid_content function ===");

    let mut config = create_default_scraping_config();
    config.headless = false; // Force non-headless mode for debugging
    config.wait_for_element_seconds = 30; // Increase wait time

    let url = "https://marketplace.mendix.com/link/studiopro";
    println!("Created config and URL: {}", url);

    println!("Creating browser instance...");
    let (mut browser, mut handler) = Browser::launch(BrowserConfig::builder().with_head().build()?)
        .await
        .map_err(|e| format!("Failed to launch browser: {}", e))?;

    println!("Browser created successfully");

    // Spawn handler in a separate task - this is crucial for chromiumoxide to work
    let handler_task = tokio::spawn(async move {
        while let Some(h) = handler.next().await {
            match h {
                Ok(_) => {
                    // Continue processing
                }
                Err(e) => {
                    println!("Handler error (continuing): {:?}", e);
                    // Don't break on errors, just log them
                }
            }
        }
        println!("Handler task ended");
    });

    // Wait for browser to be fully ready
    println!("Waiting for browser to be ready...");
    tokio::time::sleep(Duration::from_secs(2)).await;

    println!("Navigating to page...");
    let page = match navigate_to_page(&browser, url).await {
        Ok(p) => {
            println!("Navigation completed");
            p
        }
        Err(e) => {
            println!("Navigation failed: {}", e);
            let _ = browser.close().await;
            handler_task.abort();
            return Err(e);
        }
    };

    // Wait for page to load completely
    println!("Waiting for page to load completely...");
    if let Err(e) = wait_for_page_load(&page, &config).await {
        println!("Page load failed: {}", e);
        let _ = browser.close().await;
        handler_task.abort();
        return Err(e);
    }
    println!("Page load completed");

    // Handle privacy modal if it appears
    println!("Handling privacy modal...");
    let _ = handle_privacy_modal(&page).await;
    println!("Privacy modal handling completed");

    // Add extra wait time to ensure page is fully loaded
    println!("Adding extra wait time for page stabilization...");
    tokio::time::sleep(Duration::from_secs(5)).await;
    println!("Extra wait completed");

    // Wait for the specific element and get its HTML
    let selector = "div.widget-datagrid-content";
    println!("Looking for element with selector: {}", selector);

    match wait_for_element_and_get_html(&page, selector, &config).await {
        Ok(html) => {
            println!("Successfully found element and extracted HTML");
            println!("HTML length: {} characters", html.len());
            println!("=== Datagrid HTML content START ===");
            println!("{}", html);
            println!("=== Datagrid HTML content END ===");

            // Keep browser open for 10 seconds to observe
            println!("Keeping browser open for 10 seconds to observe...");
            tokio::time::sleep(Duration::from_secs(10)).await;

            let _ = browser.close().await;
            handler_task.abort();
            println!("Browser closed successfully");
            Ok(html)
        }
        Err(e) => {
            println!("Failed to find element or extract HTML: {}", e);

            // Try to get page source for debugging
            println!("Attempting to get page source for debugging...");
            match page.content().await {
                Ok(content) => {
                    println!("Page source length: {} characters", content.len());
                    println!("=== PAGE SOURCE START (first 2000 chars) ===");
                    println!("{}", &content[..std::cmp::min(2000, content.len())]);
                    println!("=== PAGE SOURCE END ===");
                }
                Err(source_err) => {
                    println!("Failed to get page source: {}", source_err);
                }
            }

            // Keep browser open for 10 seconds to observe
            println!("Keeping browser open for 10 seconds to observe error...");
            tokio::time::sleep(Duration::from_secs(10)).await;

            let _ = browser.close().await;
            handler_task.abort();
            println!("Browser closed after error");
            Err(e)
        }
    }
}

// Function to parse HTML and extract version information from datagrid content
fn parse_datagrid_versions(html_content: &str) -> Result<Vec<DownloadableVersion>, String> {
    let document = Html::parse_document(html_content);
    let row_selector = Selector::parse("div.tr[role=row]")
        .map_err(|e| format!("Failed to parse row selector: {}", e))?;

    let mut versions = Vec::new();

    for row in document.select(&row_selector) {
        // Extract version number from the first gridcell link
        let version_selector = Selector::parse("div[role=gridcell] > div > div > a")
            .map_err(|e| format!("Failed to parse version selector: {}", e))?;

        let version_text = if let Some(version_elem) = row.select(&version_selector).next() {
            version_elem
                .text()
                .collect::<Vec<_>>()
                .join("")
                .trim()
                .to_string()
        } else {
            continue; // Skip rows without version links
        };

        // Extract version flags from span elements
        let span_selector = Selector::parse("div[role=gridcell] > div > div > span")
            .map_err(|e| format!("Failed to parse span selector: {}", e))?;

        let mut is_lts = false;
        let mut is_mts = false;
        let mut is_latest = false;
        let mut is_beta = false;

        for span in row.select(&span_selector) {
            let span_text = span
                .text()
                .collect::<Vec<_>>()
                .join("")
                .trim()
                .to_uppercase();
            match span_text.as_str() {
                "LTS" => is_lts = true,
                "MTS" => is_mts = true,
                "LATEST" => is_latest = true,
                "BETA" => is_beta = true,
                _ => {}
            }
        }

        // Create downloadable version
        let version = DownloadableVersion {
            version: version_text,
            download_url: String::new(), // Will be filled later if needed
            release_date: None,
            release_notes_url: None,
            file_size: None,
            is_lts,
            is_beta,
            is_mts,
            is_latest,
        };

        versions.push(version);
    }

    Ok(versions)
}

// Function to fetch and parse downloadable versions from datagrid
#[tauri::command]
pub async fn get_downloadable_versions_from_datagrid(
    page: Option<u32>,
) -> Result<Vec<DownloadableVersion>, String> {
    println!("=== Starting get_downloadable_versions_from_datagrid function ===");

    let mut config = create_default_scraping_config();
    config.headless = false; // Force non-headless mode for debugging
    config.wait_for_element_seconds = 30; // Increase wait time

    let url = "https://marketplace.mendix.com/link/studiopro";
    println!("Created config and URL: {}", url);

    println!("Creating browser instance...");
    let (mut browser, mut handler) = Browser::launch(BrowserConfig::builder().with_head().build()?)
        .await
        .map_err(|e| format!("Failed to launch browser: {}", e))?;

    println!("Browser created successfully");

    // Spawn handler in a separate task - this is crucial for chromiumoxide to work
    let handler_task = tokio::spawn(async move {
        while let Some(h) = handler.next().await {
            match h {
                Ok(_) => {
                    // Continue processing
                }
                Err(e) => {
                    println!("Handler error (continuing): {:?}", e);
                    // Don't break on errors, just log them
                }
            }
        }
        println!("Handler task ended");
    });

    // Wait for browser to be fully ready
    println!("Waiting for browser to be ready...");
    tokio::time::sleep(Duration::from_secs(2)).await;

    println!("Navigating to page...");
    let page_obj = match navigate_to_page(&browser, url).await {
        Ok(p) => {
            println!("Navigation completed");
            p
        }
        Err(e) => {
            println!("Navigation failed: {}", e);
            let _ = browser.close().await;
            handler_task.abort();
            return Err(e);
        }
    };

    // Wait for page to load completely
    println!("Waiting for page to load completely...");
    if let Err(e) = wait_for_page_load(&page_obj, &config).await {
        println!("Page load failed: {}", e);
        let _ = browser.close().await;
        handler_task.abort();
        return Err(e);
    }
    println!("Page load completed");

    // Handle privacy modal if it appears
    println!("Handling privacy modal...");
    let _ = handle_privacy_modal(&page_obj).await;
    println!("Privacy modal handling completed");

    // Add extra wait time to ensure page is fully loaded
    println!("Adding extra wait time for page stabilization...");
    tokio::time::sleep(Duration::from_secs(5)).await;
    println!("Extra wait completed");

    // Handle pagination if page number is provided
    if let Some(page_num) = page {
        if page_num > 1 {
            println!("Navigating to page {}", page_num);
            // TODO: Implement pagination navigation
            // This would involve clicking on pagination buttons or links
        }
    }

    // Wait for the specific element and get its HTML
    let selector = "div.widget-datagrid-content";
    println!("Looking for element with selector: {}", selector);

    match wait_for_element_and_get_html(&page_obj, selector, &config).await {
        Ok(html) => {
            println!("Successfully found element and extracted HTML");
            println!("HTML length: {} characters", html.len());

            // Parse the HTML to extract version information
            let versions = parse_datagrid_versions(&html)?;
            println!(
                "Successfully parsed {} versions from datagrid",
                versions.len()
            );

            // Log the parsed versions
            for version in &versions {
                println!(
                    "Found version: {} (LTS: {}, MTS: {}, LATEST: {}, BETA: {})",
                    version.version,
                    version.is_lts,
                    version.is_mts,
                    version.is_latest,
                    version.is_beta
                );
            }

            let _ = browser.close().await;
            handler_task.abort();
            println!("Browser closed successfully");
            Ok(versions)
        }
        Err(e) => {
            println!("Failed to find element or extract HTML: {}", e);
            let _ = browser.close().await;
            handler_task.abort();
            println!("Browser closed after error");
            Err(e)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_version_from_text() {
        assert_eq!(
            extract_version_from_element_text("Studio Pro 10.6.0"),
            Some("10.6.0".to_string())
        );
        assert_eq!(
            extract_version_from_element_text("Version 9.24.2 LTS"),
            Some("9.24.2".to_string())
        );
        assert_eq!(extract_version_from_element_text("Invalid text"), None);
    }

    #[test]
    fn test_version_validation() {
        assert!(is_valid_version_string("10.6.0"));
        assert!(is_valid_version_string("9.24.2"));
        assert!(!is_valid_version_string("10.6"));
        assert!(!is_valid_version_string("invalid"));
    }

    #[test]
    fn test_detect_version_flags() {
        assert_eq!(detect_version_flags("Studio Pro 10.6.0 LTS"), (true, false));
        assert_eq!(
            detect_version_flags("Studio Pro 10.7.0 Beta"),
            (false, true)
        );
        assert_eq!(detect_version_flags("Studio Pro 10.6.0"), (false, false));
    }

    #[test]
    fn test_sort_versions() {
        let versions = vec![
            create_downloadable_version(
                "9.24.2".to_string(),
                "url1".to_string(),
                None,
                None,
                None,
                false,
                false,
                false,
                false,
            ),
            create_downloadable_version(
                "10.6.0".to_string(),
                "url2".to_string(),
                None,
                None,
                None,
                false,
                false,
                false,
                false,
            ),
            create_downloadable_version(
                "10.5.1".to_string(),
                "url3".to_string(),
                None,
                None,
                None,
                false,
                false,
                false,
                false,
            ),
        ];

        let sorted = sort_versions_by_version_desc(versions);
        assert_eq!(sorted[0].version, "10.6.0");
        assert_eq!(sorted[1].version, "10.5.1");
        assert_eq!(sorted[2].version, "9.24.2");
    }
}

/*
=== IMPLEMENTATION GUIDE ===

1. **Initial Setup & Testing:**
   - Use `debug_page_structure()` command first to get the actual HTML structure
   - Examine the returned HTML to identify the correct selectors for version elements

2. **Customize Selectors (in `extract_version_elements`):**
   - Look for download links, version containers, or buttons
   - Common patterns: `.download-btn`, `.version-card`, `[data-version]`, etc.
   - Update the `selectors` vector with actual selectors from the page

3. **Customize Data Extraction:**
   - Update `extract_version_from_element_text()` based on how versions are displayed
   - Update `extract_download_url_from_element()` to match actual download link patterns
   - Update `extract_release_date_from_text()` if dates are shown on the page

4. **Update Wait Conditions:**
   - In `wait_for_page_load()`, replace the selector with actual elements that indicate page is loaded
   - Consider waiting for specific content like `.loaded` class or `[data-ready]` attribute

5. **Handle Dynamic Content:**
   - If content is loaded via JavaScript, add appropriate delays
   - Consider waiting for specific elements to appear before scraping
   - May need to scroll or click buttons to load more versions

6. **Error Handling:**
   - Add retry logic for network failures
   - Handle cases where page structure changes
   - Add fallback selectors for different page layouts

7. **Testing:**
   - Test with different network conditions
   - Verify extracted data matches expected format
   - Test edge cases like beta versions, LTS versions, etc.

8. **Production Considerations:**
   - Set browser to headless mode in production
   - Add rate limiting to avoid overwhelming the server
   - Consider caching results to reduce requests
   - Add user-agent headers to appear more like a regular browser

=== EXAMPLE USAGE IN FRONTEND ===

```javascript
// Call from React component
const downloadableVersions = await invoke('get_downloadable_mendix_versions');
const [stableVersions, betaVersions] = await invoke('get_downloadable_versions_by_type');

// For debugging page structure
const pageHtml = await invoke('debug_page_structure');
console.log(pageHtml); // Examine this to understand the page structure
```
*/
