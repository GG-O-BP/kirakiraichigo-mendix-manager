use crate::mendix::{MendixApp, MendixVersion};
use crate::web_scraper::DownloadableVersion;

// MendixVersion extractors

pub fn version_extractor_for_version(item: &MendixVersion) -> Option<String> {
    Some(item.version.clone())
}

pub fn date_extractor_for_version(item: &MendixVersion) -> Option<chrono::DateTime<chrono::Local>> {
    item.install_date
}

pub fn is_valid_version(item: &MendixVersion) -> bool {
    item.is_valid
}

pub fn searchable_fields_version(item: &MendixVersion) -> Option<String> {
    Some(format!("{} {}", item.version, item.path))
}

// MendixApp extractors

pub fn version_extractor_for_app(item: &MendixApp) -> Option<String> {
    item.version.clone()
}

pub fn date_extractor_for_app(item: &MendixApp) -> Option<chrono::DateTime<chrono::Local>> {
    item.last_modified
}

pub fn is_valid_app(item: &MendixApp) -> bool {
    item.is_valid
}

pub fn searchable_fields_app(item: &MendixApp) -> Option<String> {
    Some(format!(
        "{} {} {}",
        item.name,
        item.version.as_ref().unwrap_or(&String::new()),
        item.path
    ))
}

// DownloadableVersion extractors

pub fn searchable_fields_downloadable_version(item: &DownloadableVersion) -> Option<String> {
    Some(item.version.clone())
}
