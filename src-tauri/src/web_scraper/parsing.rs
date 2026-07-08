use chromiumoxide::page::Page;
use regex::Regex;
use scraper::{Html, Selector};

use super::browser::{extract_element_html, wait_for_element_with_timeout};
use super::config::{DownloadableVersion, ScrapingConfig, VersionFlags};

// CSS selectors for the Mendix marketplace datagrid. Centralized here so a
// marketplace HTML change only needs edits in one place.
const ROW_SELECTOR: &str = "div.tr[role=row]";
const VERSION_LINK_SELECTOR: &str = "div[role=gridcell] > div > div > a";
const FLAG_SPAN_SELECTOR: &str = "div[role=gridcell] > div > div > span";
const DATAGRID_CONTENT_SELECTOR: &str = "div.widget-datagrid-content";
const BUILD_NUMBER_SELECTOR: &str = "span.mx-text.pds-heading--sm.pds-mb-0";

/// Extract build number from text like "Build 12345"
pub fn extract_build_number_from_text(text: &str) -> Option<String> {
    Regex::new(r"Build\s+(\d{5})")
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

/// Extract datagrid content from page
pub async fn extract_datagrid_content(
    page: &Page,
    config: &ScrapingConfig,
) -> Result<String, String> {
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

/// Extract build number from marketplace page
pub async fn extract_build_number_from_marketplace(
    page: &Page,
    version: &str,
) -> Result<String, String> {
    use std::time::Duration;

    tokio::time::sleep(Duration::from_millis(
        super::config::BUILD_NUMBER_EXTRACT_DELAY_MS,
    ))
    .await;

    let elements = page
        .find_elements(BUILD_NUMBER_SELECTOR)
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
