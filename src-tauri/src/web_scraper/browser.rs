use chromiumoxide::browser::{Browser, BrowserConfig};
use chromiumoxide::page::Page;
use chromiumoxide::Element;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::time::timeout;

use super::config::{
    chrome_executable_path, CLICK_DEBOUNCE_MS, CLICK_NAVIGATION_DELAY_MS, NAVIGATION_TIMEOUT_SECS,
    PAGE_CHANGE_POLL_MS,
};

const PROFILE_DIR_PREFIX: &str = "kiraichi-chrome-";
const BROWSER_SHUTDOWN_TIMEOUT_SECS: u64 = 5;
const PROFILE_DIR_REMOVE_ATTEMPTS: u32 = 5;
const PROFILE_DIR_REMOVE_RETRY_DELAY_MS: u64 = 300;
const NEXT_BUTTON_ENABLED_TIMEOUT_SECS: u64 = 20;
const PAGING_STATUS_TIMEOUT_SECS: u64 = 20;
const DATAGRID_PAGE_SIZE: u32 = 10;

static PROFILE_DIR_COUNTER: AtomicU64 = AtomicU64::new(0);

/// Build a profile directory path unique across concurrent sessions.
/// Chrome refuses to start (exit code 21, PROFILE_IN_USE) when two instances
/// share a user data directory, so every session gets its own directory.
fn next_profile_dir() -> PathBuf {
    let sequence = PROFILE_DIR_COUNTER.fetch_add(1, Ordering::Relaxed);
    std::env::temp_dir().join(format!(
        "{}{}-{}",
        PROFILE_DIR_PREFIX,
        std::process::id(),
        sequence
    ))
}

/// Browser session wrapper that manages browser lifecycle
pub struct BrowserSession {
    pub browser: Browser,
    pub handler_running: Arc<AtomicBool>,
    pub handler_task: tokio::task::JoinHandle<()>,
    user_data_dir: PathBuf,
}

impl BrowserSession {
    /// Create a new browser session
    pub async fn new() -> Result<Self, String> {
        let user_data_dir = next_profile_dir();
        let (browser, handler) = create_browser_instance(&user_data_dir).await?;
        let handler_running = Arc::new(AtomicBool::new(true));
        let handler_flag = handler_running.clone();

        let handler_task = spawn_handler_task(handler, handler_flag);

        Ok(Self {
            browser,
            handler_running,
            handler_task,
            user_data_dir,
        })
    }

    /// Navigate to a URL
    pub async fn navigate(&self, url: &str) -> Result<Page, String> {
        navigate_to_url(&self.browser, url).await
    }

    /// Cleanup browser resources: close the browser while the handler is still
    /// pumping events, reap the child process, then delete the profile directory
    pub async fn cleanup(mut self) -> Result<(), String> {
        let shutdown_timeout = Duration::from_secs(BROWSER_SHUTDOWN_TIMEOUT_SECS);

        match timeout(shutdown_timeout, self.browser.close()).await {
            Ok(Ok(_)) => {}
            _ => {
                let _ = self.browser.kill().await;
            }
        }
        let _ = timeout(shutdown_timeout, self.browser.wait()).await;

        self.handler_running.store(false, Ordering::Relaxed);
        self.handler_task.abort();

        remove_profile_dir_with_retry(&self.user_data_dir).await;
        Ok(())
    }
}

async fn remove_profile_dir_with_retry(user_data_dir: &Path) {
    for _ in 0..PROFILE_DIR_REMOVE_ATTEMPTS {
        match tokio::fs::remove_dir_all(user_data_dir).await {
            Ok(_) => return,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return,
            Err(_) => {
                tokio::time::sleep(Duration::from_millis(PROFILE_DIR_REMOVE_RETRY_DELAY_MS)).await;
            }
        }
    }
}

/// Kill leftover scraper Chrome processes from previous app runs that died
/// without running cleanup (e.g. the app was closed mid-scrape)
pub(super) async fn kill_stale_scraper_browsers() {
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let script = format!(
        "Get-CimInstance Win32_Process -Filter 'Name=''chrome.exe''' | Where-Object {{ $_.CommandLine -match '{}' }} | ForEach-Object {{ Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }}",
        PROFILE_DIR_PREFIX
    );

    let mut command = tokio::process::Command::new("powershell");
    command.args(["-NoProfile", "-NonInteractive", "-Command", &script]);

    #[cfg(target_os = "windows")]
    command.creation_flags(CREATE_NO_WINDOW);

    let _ = command.output().await;
}

/// Delete leftover scraper profile directories; directories still locked by a
/// running Chrome are skipped and retried on the next app start
pub(super) async fn remove_stale_profile_dirs() {
    let Ok(mut entries) = tokio::fs::read_dir(std::env::temp_dir()).await else {
        return;
    };

    while let Ok(Some(entry)) = entries.next_entry().await {
        let file_name = entry.file_name();
        if file_name.to_string_lossy().starts_with(PROFILE_DIR_PREFIX) {
            let _ = tokio::fs::remove_dir_all(entry.path()).await;
        }
    }
}

/// Create a new browser instance with appropriate configuration
async fn create_browser_instance(
    user_data_dir: &Path,
) -> Result<(Browser, chromiumoxide::handler::Handler), String> {
    let chrome_path = chrome_executable_path().ok_or_else(|| {
        "Chrome executable not found. Install Google Chrome or set KIRAICHI_CHROME_PATH.".to_string()
    })?;

    println!("🌐 Launching scraper browser with profile {:?}", user_data_dir);

    let config = BrowserConfig::builder()
        .chrome_executable(&chrome_path)
        .user_data_dir(user_data_dir)
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

/// Click next page button for pagination. The button exists but stays disabled
/// while the datagrid loads its rows, so poll until it becomes clickable.
pub async fn click_next_page_button(page: &Page) -> Result<(), String> {
    let selectors = [
        "button[aria-label='Go to next page']",
        ".pagination-button[aria-label='Go to next page']",
        "button.pagination-button:nth-child(3)",
    ];

    for selector in &selectors {
        match wait_for_element_with_timeout(page, selector, 10).await {
            Ok(_) => {
                let button =
                    wait_for_enabled_button(page, selector, NEXT_BUTTON_ENABLED_TIMEOUT_SECS)
                        .await?;

                button
                    .click()
                    .await
                    .map_err(|e| format!("Failed to click next page button: {}", e))?;

                tokio::time::sleep(Duration::from_millis(CLICK_NAVIGATION_DELAY_MS)).await;

                return Ok(());
            }
            Err(_) => continue,
        }
    }

    Err("Next page button not found with any selector".to_string())
}

/// Re-query the button on every poll so a React re-render cannot leave us
/// holding a stale element handle
async fn wait_for_enabled_button(
    page: &Page,
    selector: &str,
    timeout_secs: u64,
) -> Result<Element, String> {
    let timeout_duration = Duration::from_secs(timeout_secs);
    let start_time = std::time::Instant::now();

    loop {
        if let Ok(button) = page.find_element(selector).await {
            if let Ok(None) = button.attribute("disabled").await {
                return Ok(button);
            }
        }

        if start_time.elapsed() > timeout_duration {
            return Err(format!(
                "Button '{}' stayed disabled for {}s (no more pages or the datagrid failed to load)",
                selector, timeout_secs
            ));
        }

        tokio::time::sleep(Duration::from_millis(PAGE_CHANGE_POLL_MS)).await;
    }
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

        let expected_start = current_page * DATAGRID_PAGE_SIZE + 1;
        wait_for_paging_status_start(page, &page_status_regex, expected_start).await?;
    }

    Ok(())
}

/// Poll the paging status ("11 to 20 of 256") until it reports the expected
/// slice, confirming the grid finished swapping to the requested page
async fn wait_for_paging_status_start(
    page: &Page,
    page_status_regex: &regex::Regex,
    expected_start: u32,
) -> Result<(), String> {
    let timeout_duration = Duration::from_secs(PAGING_STATUS_TIMEOUT_SECS);
    let start_time = std::time::Instant::now();
    let mut last_status = String::new();

    loop {
        if let Ok(elements) = page.find_elements("div.paging-status").await {
            if let Some(status_element) = elements.into_iter().next() {
                if let Ok(Some(status_text)) = status_element.inner_text().await {
                    last_status = status_text.trim().to_string();

                    if let Some(captures) = page_status_regex.captures(&last_status) {
                        let start_item: u32 = captures[1].parse().unwrap_or(0);

                        if start_item == expected_start {
                            println!("Current page status: {}", last_status);
                            tokio::time::sleep(Duration::from_millis(CLICK_DEBOUNCE_MS)).await;
                            return Ok(());
                        }
                    }
                }
            }
        }

        if start_time.elapsed() > timeout_duration {
            return Err(format!(
                "Page navigation failed. Expected slice starting at item {}, last status was '{}'",
                expected_start, last_status
            ));
        }

        tokio::time::sleep(Duration::from_millis(PAGE_CHANGE_POLL_MS)).await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn next_profile_dir_generates_unique_paths() {
        let first = next_profile_dir();
        let second = next_profile_dir();
        assert_ne!(first, second);
    }

    #[test]
    fn next_profile_dir_scopes_directory_to_current_process() {
        let dir = next_profile_dir();
        let name = dir
            .file_name()
            .expect("profile dir should have a name")
            .to_string_lossy()
            .to_string();
        let expected_prefix = format!("{}{}-", PROFILE_DIR_PREFIX, std::process::id());
        assert!(name.starts_with(&expected_prefix));
    }

    #[test]
    fn next_profile_dir_lives_under_temp_dir() {
        assert!(next_profile_dir().starts_with(std::env::temp_dir()));
    }
}
