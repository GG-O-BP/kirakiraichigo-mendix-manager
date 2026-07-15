use chromiumoxide::page::Page;
use regex::Regex;
use scraper::{Html, Selector};

use super::browser::{extract_element_html, wait_for_element_with_timeout};
use super::config::{DownloadableVersion, ScrapingConfig, VersionFlags, PAGE_CHANGE_POLL_MS};

const BUILD_NUMBER_WAIT_TIMEOUT_SECS: u64 = 30;

// CSS selectors for the Mendix marketplace datagrid. Centralized here so a
// marketplace HTML change only needs edits in one place.
const ROW_SELECTOR: &str = "div.tr[role=row]";
const VERSION_LINK_SELECTOR: &str = "div[role=gridcell] > div > div > a";
const FLAG_SPAN_SELECTOR: &str = "div[role=gridcell] > div > div > span";
const DATAGRID_CONTENT_SELECTOR: &str = "div.widget-datagrid-content";
const DATAGRID_LOADED_ROW_SELECTOR: &str =
    "div.widget-datagrid-content div.tr[role=row] div[role=gridcell]";
const BUILD_NUMBER_SELECTOR: &str = "span.mx-text.pds-heading--sm.pds-mb-0";

/// Extract build number from text like "Server Distribution 10.24.22 (Build 113362)".
/// Build numbers grew from 5 to 6 digits over time, so match any digit run.
pub fn extract_build_number_from_text(text: &str) -> Option<String> {
    Regex::new(r"Build\s+(\d+)")
        .ok()?
        .captures(text)?
        .get(1)
        .map(|m| m.as_str().to_string())
}

/// Parse a single row from the datagrid
fn parse_datagrid_row(row: &scraper::ElementRef) -> Option<DownloadableVersion> {
    let version_selector = Selector::parse(VERSION_LINK_SELECTOR).ok()?;
    let span_selector = Selector::parse(FLAG_SPAN_SELECTOR).ok()?;

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
        .fold(VersionFlags::default(), |mut flags, text| {
            match text.as_str() {
                "LTS" => flags.is_lts = true,
                "MTS" => flags.is_mts = true,
                "LATEST" => flags.is_latest = true,
                "BETA" => flags.is_beta = true,
                _ => {}
            }
            flags
        });

    Some(DownloadableVersion::new(
        version_text,
        String::new(),
        None,
        None,
        None,
        flags,
    ))
}

/// Parse datagrid HTML content into downloadable versions
pub fn parse_datagrid_html(html_content: &str) -> Result<Vec<DownloadableVersion>, String> {
    let document = Html::parse_document(html_content);
    let row_selector = Selector::parse(ROW_SELECTOR)
        .map_err(|e| format!("Failed to parse row selector: {}", e))?;

    let versions = document
        .select(&row_selector)
        .filter_map(|row| parse_datagrid_row(&row))
        .collect();

    Ok(versions)
}

/// Wait until the datagrid has rendered at least one data row. The grid
/// container and header render before rows arrive, so waiting on the container
/// alone yields an empty scrape and a disabled pagination bar.
pub async fn wait_for_datagrid_rows(page: &Page, config: &ScrapingConfig) -> Result<(), String> {
    wait_for_element_with_timeout(
        page,
        DATAGRID_LOADED_ROW_SELECTOR,
        config.wait_for_element_seconds,
    )
    .await?;
    Ok(())
}

/// Extract datagrid content from page
pub async fn extract_datagrid_content(
    page: &Page,
    config: &ScrapingConfig,
) -> Result<String, String> {
    wait_for_datagrid_rows(page, config).await?;

    let elements = wait_for_element_with_timeout(
        page,
        DATAGRID_CONTENT_SELECTOR,
        config.wait_for_element_seconds,
    )
    .await?;

    if let Some(element) = elements.into_iter().next() {
        extract_element_html(&element).await
    } else {
        Err("No datagrid content found".to_string())
    }
}

/// Extract build number from marketplace page, polling until the heading
/// containing "Build NNNNNN" finishes rendering
pub async fn extract_build_number_from_marketplace(
    page: &Page,
    version: &str,
) -> Result<String, String> {
    use std::time::Duration;

    let timeout_duration = Duration::from_secs(BUILD_NUMBER_WAIT_TIMEOUT_SECS);
    let start_time = std::time::Instant::now();

    loop {
        if let Ok(elements) = page.find_elements(BUILD_NUMBER_SELECTOR).await {
            for element in elements {
                if let Ok(Some(text)) = element.inner_text().await {
                    if let Some(build_number) = extract_build_number_from_text(&text) {
                        println!("✅ Build number extracted: {}", build_number);
                        return Ok(build_number);
                    }
                }
            }
        }

        if start_time.elapsed() > timeout_duration {
            return Err(format!("Build number not found for version {}", version));
        }

        tokio::time::sleep(Duration::from_millis(PAGE_CHANGE_POLL_MS)).await;
    }
}

#[cfg(test)]
mod tests {
    use super::extract_build_number_from_text;

    #[test]
    fn extracts_five_digit_build_number() {
        assert_eq!(
            extract_build_number_from_text("Server Distribution 9.24.35 (Build 64362)"),
            Some("64362".to_string())
        );
    }

    #[test]
    fn extracts_six_digit_build_number_without_truncation() {
        assert_eq!(
            extract_build_number_from_text("Server Distribution 10.24.22 (Build 113362)"),
            Some("113362".to_string())
        );
    }

    #[test]
    fn returns_none_without_build_marker() {
        assert_eq!(
            extract_build_number_from_text("Studio Pro 10.24.22 for Windows"),
            None
        );
    }
}
