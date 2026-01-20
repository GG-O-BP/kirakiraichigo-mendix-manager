pub mod mendix_filters;
pub mod version_utils;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchFilter {
    pub search_term: String,
    pub case_sensitive: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionFilter {
    pub target_version: Option<String>,
    pub only_valid: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterOptions {
    pub search: Option<SearchFilter>,
    pub version: Option<VersionFilter>,
}

fn normalize_text(text: &str, case_sensitive: bool) -> String {
    if case_sensitive {
        text.to_string()
    } else {
        text.to_lowercase()
    }
}

fn text_contains(haystack: &str, needle: &str, case_sensitive: bool) -> bool {
    let normalized_haystack = normalize_text(haystack, case_sensitive);
    let normalized_needle = normalize_text(needle, case_sensitive);
    normalized_haystack.contains(&normalized_needle)
}

fn extract_searchable_fields<F>(item: &F, extractors: &[fn(&F) -> Option<String>]) -> Vec<String>
where
    F: Clone,
{
    extractors
        .iter()
        .filter_map(|extractor| extractor(item))
        .collect()
}

fn matches_search_term<F>(
    item: &F,
    search_term: &str,
    case_sensitive: bool,
    extractors: &[fn(&F) -> Option<String>],
) -> bool
where
    F: Clone,
{
    if search_term.is_empty() {
        return true;
    }

    let searchable_fields = extract_searchable_fields(item, extractors);

    searchable_fields
        .iter()
        .any(|field| text_contains(field, search_term, case_sensitive))
}

pub fn filter_by_search<F>(
    items: Vec<F>,
    search_filter: &SearchFilter,
    extractors: &[fn(&F) -> Option<String>],
) -> Vec<F>
where
    F: Clone,
{
    items
        .into_iter()
        .filter(|item| {
            matches_search_term(
                item,
                &search_filter.search_term,
                search_filter.case_sensitive,
                extractors,
            )
        })
        .collect()
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct SemanticVersion {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
    pub extra: String,
}

fn parse_version(version_string: &str) -> Option<SemanticVersion> {
    let parts: Vec<&str> = version_string.split('.').collect();

    if parts.len() < 3 {
        return None;
    }

    let major = parts[0].parse::<u32>().ok()?;
    let minor = parts[1].parse::<u32>().ok()?;

    // Handle patch version with possible extra (e.g., "0-beta")
    let patch_parts: Vec<&str> = parts[2].split('-').collect();
    let patch = patch_parts[0].parse::<u32>().ok()?;
    let extra = if patch_parts.len() > 1 {
        patch_parts[1..].join("-")
    } else {
        String::new()
    };

    Some(SemanticVersion {
        major,
        minor,
        patch,
        extra,
    })
}

fn compare_versions(a: &str, b: &str) -> std::cmp::Ordering {
    match (parse_version(a), parse_version(b)) {
        (Some(va), Some(vb)) => vb.cmp(&va), // Descending order
        (Some(_), None) => std::cmp::Ordering::Less,
        (None, Some(_)) => std::cmp::Ordering::Greater,
        (None, None) => b.cmp(a),
    }
}

pub fn sort_by_version_with_date_fallback<F>(
    items: Vec<F>,
    version_extractor: fn(&F) -> Option<String>,
    date_extractor: fn(&F) -> Option<chrono::DateTime<chrono::Local>>,
) -> Vec<F>
where
    F: Clone,
{
    let mut sorted_items = items;
    sorted_items.sort_by(|a, b| {
        let version_a = version_extractor(a).unwrap_or_default();
        let version_b = version_extractor(b).unwrap_or_default();

        let version_cmp = compare_versions(&version_a, &version_b);

        if version_cmp == std::cmp::Ordering::Equal {
            // If versions are equal, sort by date
            match (date_extractor(a), date_extractor(b)) {
                (Some(date_a), Some(date_b)) => date_b.cmp(&date_a),
                (Some(_), None) => std::cmp::Ordering::Less,
                (None, Some(_)) => std::cmp::Ordering::Greater,
                (None, None) => std::cmp::Ordering::Equal,
            }
        } else {
            version_cmp
        }
    });
    sorted_items
}

pub fn filter_by_version<F>(
    items: Vec<F>,
    target_version: &str,
    version_extractor: fn(&F) -> Option<String>,
) -> Vec<F>
where
    F: Clone,
{
    items
        .into_iter()
        .filter(|item| {
            version_extractor(item)
                .map(|v| v == target_version)
                .unwrap_or(false)
        })
        .collect()
}

pub fn filter_valid_items<F>(items: Vec<F>, is_valid_extractor: fn(&F) -> bool) -> Vec<F>
where
    F: Clone,
{
    items
        .into_iter()
        .filter(|item| is_valid_extractor(item))
        .collect()
}

pub fn apply_filters_and_sort<F>(
    items: Vec<F>,
    filter_options: &FilterOptions,
    search_extractors: &[fn(&F) -> Option<String>],
    version_extractor: fn(&F) -> Option<String>,
    date_extractor: fn(&F) -> Option<chrono::DateTime<chrono::Local>>,
    is_valid_extractor: fn(&F) -> bool,
) -> Vec<F>
where
    F: Clone,
{
    let mut result = items;

    // Apply version filter first
    if let Some(version_filter) = &filter_options.version {
        if version_filter.only_valid {
            result = filter_valid_items(result, is_valid_extractor);
        }

        if let Some(target_version) = &version_filter.target_version {
            result = filter_by_version(result, target_version, version_extractor);
        }
    }

    // Apply search filter
    if let Some(search_filter) = &filter_options.search {
        result = filter_by_search(result, search_filter, search_extractors);
    }

    // Sort by version with date fallback
    sort_by_version_with_date_fallback(result, version_extractor, date_extractor)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_version() {
        let v = parse_version("10.4.0").unwrap();
        assert_eq!(v.major, 10);
        assert_eq!(v.minor, 4);
        assert_eq!(v.patch, 0);

        let v_beta = parse_version("10.4.0-beta").unwrap();
        assert_eq!(v_beta.extra, "beta");
    }

    #[test]
    fn test_compare_versions() {
        use std::cmp::Ordering;

        assert_eq!(
            compare_versions("10.4.0", "10.3.0"),
            Ordering::Less // 10.4.0 is greater, but descending
        );
        assert_eq!(compare_versions("10.3.0", "10.4.0"), Ordering::Greater);
        assert_eq!(compare_versions("10.4.0", "10.4.0"), Ordering::Equal);
    }

    #[test]
    fn test_text_contains() {
        assert!(text_contains("Hello World", "world", false));
        assert!(!text_contains("Hello World", "world", true));
        assert!(text_contains("Hello World", "World", true));
    }

    #[derive(Debug, Clone)]
    struct TestItem {
        name: String,
        version: String,
        is_valid: bool,
    }

    fn test_name_extractor(item: &TestItem) -> Option<String> {
        Some(item.name.clone())
    }

    fn test_version_extractor(item: &TestItem) -> Option<String> {
        Some(item.version.clone())
    }

    fn test_is_valid(item: &TestItem) -> bool {
        item.is_valid
    }

    #[test]
    fn test_filter_by_search() {
        let items = vec![
            TestItem {
                name: "Widget A".to_string(),
                version: "1.0.0".to_string(),
                is_valid: true,
            },
            TestItem {
                name: "Widget B".to_string(),
                version: "2.0.0".to_string(),
                is_valid: true,
            },
            TestItem {
                name: "Component C".to_string(),
                version: "1.5.0".to_string(),
                is_valid: true,
            },
        ];

        let search_filter = SearchFilter {
            search_term: "widget".to_string(),
            case_sensitive: false,
        };

        let result = filter_by_search(items, &search_filter, &[test_name_extractor]);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_filter_valid_items() {
        let items = vec![
            TestItem {
                name: "A".to_string(),
                version: "1.0.0".to_string(),
                is_valid: true,
            },
            TestItem {
                name: "B".to_string(),
                version: "2.0.0".to_string(),
                is_valid: false,
            },
            TestItem {
                name: "C".to_string(),
                version: "3.0.0".to_string(),
                is_valid: true,
            },
        ];

        let filtered = filter_valid_items(items, test_is_valid);
        assert_eq!(filtered.len(), 2);
    }
}
