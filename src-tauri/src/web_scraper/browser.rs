use chromiumoxide::browser::{Browser, BrowserConfig};
use chromiumoxide::page::Page;
use chromiumoxide::Element;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::time::timeout;

use super::config::{
    CHROME_EXECUTABLE_PATH, CLICK_DEBOUNCE_MS, CLICK_NAVIGATION_DELAY_MS, NAVIGATION_TIMEOUT_SECS,
    PAGE_CHANGE_POLL_MS,
};

/// Browser session wrapper that manages browser lifecycle
pub struct BrowserSession {
    pub browser: Browser,
    pub handler_running: Arc<AtomicBool>,
    pub handler_task: tokio::task::JoinHandle<()>,
}

impl BrowserSession {
    /// Create a new browser session
    pub async fn new() -> Result<Self, String> {
        let (browser, handler) = create_browser_instance().await?;
        let handler_running = Arc::new(AtomicBool::new(true));
        let handler_flag = handler_running.clone();

        let handler_task = spawn_handler_task(handler, handler_flag);

        Ok(Self {
            browser,
            handler_running,
            handler_task,
        })
    }

    /// Navigate to a URL
    pub async fn navigate(&self, url: &str) -> Result<Page, String> {
        navigate_to_url(&self.browser, url).await
    }

    /// Cleanup browser resources
    pub async fn cleanup(mut self) -> Result<(), String> {
        self.handler_running.store(false, Ordering::Relaxed);
        let _ = self.browser.close().await;
        self.handler_task.abort();
        Ok(())
    }
}

/// Create a new browser instance with appropriate configuration
async fn create_browser_instance() -> Result<(Browser, chromiumoxide::handler::Handler), String> {
    let temp_dir = std::env::temp_dir().join(format!("kiraichi-chrome-{}", std::process::id()));
    let user_data_dir = temp_dir.to_string_lossy().to_string();

    let config = BrowserConfig::builder()
        .chrome_executable(CHROME_EXECUTABLE_PATH)
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

/// Spawn handler task for processing browser events
fn spawn_handler_task(
    mut handler: chromiumoxide::handler::Handler,
    handler_flag: Arc<AtomicBool>,
) -> tokio::task::JoinHandle<()> {
    use futures::StreamExt;

    tokio::spawn(async move {
        while handler_flag.load(Ordering::Relaxed) {
            match tokio::time::timeout(Duration::from_millis(PAGE_CHANGE_POLL_MS), handler.next())
                .await
            {
                Ok(Some(Ok(_))) => continue,
                Ok(Some(Err(_))) => continue,
                Ok(None) => break,
                Err(_) => continue,
            }
        }
    })
}

/// Navigate to a URL with timeout
async fn navigate_to_url(browser: &Browser, url: &str) -> Result<Page, String> {
    let page = browser
        .new_page("about:blank")
        .await
        .map_err(|e| format!("Failed to create new page: {}", e))?;

    let navigation_timeout = Duration::from_secs(NAVIGATION_TIMEOUT_SECS);
    timeout(navigation_timeout, page.goto(url))
        .await
        .map_err(|_| format!("Navigation to {} timed out", url))?
        .map_err(|e| format!("Failed to navigate to {}: {}", url, e))?;

    Ok(page)
}

/// Wait for element to appear with timeout
pub async fn wait_for_element_with_timeout(
    page: &Page,
    selector: &str,
    timeout_secs: u64,
) -> Result<Vec<Element>, String> {
    let timeout_duration = Duration::from_secs(timeout_secs);
    let start_time = std::time::Instant::now();

    loop {
        if let Ok(elements) = page.find_elements(selector).await {
            if !elements.is_empty() {
                tokio::time::sleep(Duration::from_millis(CLICK_DEBOUNCE_MS)).await;
                return Ok(elements);
            }
        }

        if start_time.elapsed() > timeout_duration {
            return Err(format!("Timeout waiting for element '{}'", selector));
        }
    }
}

/// Handle privacy/cookie modal if present
pub async fn handle_privacy_modal_if_present(page: &Page) -> Result<(), String> {
    let modal_selectors = [
        "[data-testid='uc-default-wall']",
        ".cookie-banner",
        "#cookie-banner",
        "[class*='cookie']",
        "[class*='privacy']",
    ];

    for modal_selector in &modal_selectors {
        if page.find_element(*modal_selector).await.is_ok() {
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

/// Extract inner HTML from an element
pub async fn extract_element_html(element: &Element) -> Result<String, String> {
    element
        .inner_html()
        .await
        .map_err(|e| format!("Failed to extract HTML: {}", e))?
        .ok_or_else(|| "Element has no HTML content".to_string())
}

/// Click next page button for pagination
pub async fn click_next_page_button(page: &Page) -> Result<(), String> {
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

                    tokio::time::sleep(Duration::from_millis(CLICK_NAVIGATION_DELAY_MS)).await;

                    return Ok(());
                }
            }
            Err(_) => continue,
        }
    }

    Err("Next page button not found with any selector".to_string())
}

/// Navigate to a specific page number in paginated content
pub async fn navigate_to_page(page: &Page, target_page: u32) -> Result<(), String> {
    use regex::Regex;

    if target_page <= 1 {
        return Ok(());
    }

    let page_status_regex =
        Regex::new(r"(\d+) to (\d+) of (\d+)").map_err(|e| format!("Invalid regex: {}", e))?;

    for current_page in 1..target_page {
        println!(
            "Navigating to page {} (clicking next button)",
            current_page + 1
        );

        click_next_page_button(page).await?;

        tokio::time::sleep(Duration::from_millis(
            super::config::PAGINATION_DELAY_MS,
        ))
        .await;

        if let Ok(elements) = page.find_elements("div.paging-status").await {
            if let Some(status_element) = elements.into_iter().next() {
                if let Ok(Some(status_text)) = status_element.inner_text().await {
                    println!("Current page status: {}", status_text);

                    if let Some(captures) = page_status_regex.captures(&status_text) {
                        let start_item: u32 = captures[1].parse().unwrap_or(0);
                        let expected_start = (current_page) * 10 + 1;

                        if start_item != expected_start {
                            return Err(format!(
                                "Page navigation failed. Expected to start at item {}, but got {}",
                                expected_start, start_item
                            ));
                        }
                    }
                }
            }
        }
    }

    Ok(())
}
