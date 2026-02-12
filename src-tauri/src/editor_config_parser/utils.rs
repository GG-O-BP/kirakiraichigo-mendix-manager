use regex::Regex;
use std::sync::OnceLock;

static HAS_HIDE_PROPERTY_IN: OnceLock<Regex> = OnceLock::new();
static HAS_HIDE_PROPERTIES_IN: OnceLock<Regex> = OnceLock::new();

fn has_hide_property_in() -> &'static Regex {
    HAS_HIDE_PROPERTY_IN.get_or_init(|| Regex::new(r"\bhidePropertyIn\s*=").unwrap())
}

fn has_hide_properties_in() -> &'static Regex {
    HAS_HIDE_PROPERTIES_IN.get_or_init(|| Regex::new(r"\bhidePropertiesIn\s*=").unwrap())
}

pub const HIDE_PROPERTY_IN_JS: &str = r#"
var hidePropertyIn = function(propertyGroups, propertyName) {
    var hideInGroup = function(group) {
        var properties = (group && group.properties) || [];
        var filteredProperties = properties.filter(function(p) {
            return p && p.key !== propertyName;
        });
        var nestedGroups = (group && group.propertyGroups) || [];
        var filteredNestedGroups = nestedGroups.map(hideInGroup);
        return Object.assign({}, group, {
            properties: filteredProperties,
            propertyGroups: filteredNestedGroups
        });
    };
    return propertyGroups.map(hideInGroup);
};
"#;

pub const HIDE_PROPERTIES_IN_JS: &str = r#"
var hidePropertiesIn = function(propertyGroups, propertyNames) {
    return propertyNames.reduce(function(groups, propName) {
        return hidePropertyIn(groups, propName);
    }, propertyGroups);
};
"#;

pub fn create_mendix_utils_injection(config_content: &str) -> String {
    let mut injection = String::new();

    if !has_hide_property_in().is_match(config_content) {
        injection.push_str(HIDE_PROPERTY_IN_JS);
    }

    if !has_hide_properties_in().is_match(config_content) {
        injection.push_str(HIDE_PROPERTIES_IN_JS);
    }

    injection
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_injection_when_no_utils_defined() {
        let content = "function getProperties(values, props) { return props; }";
        let injection = create_mendix_utils_injection(content);
        assert!(injection.contains("hidePropertyIn"));
        assert!(injection.contains("hidePropertiesIn"));
    }

    #[test]
    fn test_no_injection_when_utils_defined() {
        let content = r#"
var hidePropertyIn = function() {};
var hidePropertiesIn = function() {};
"#;
        let injection = create_mendix_utils_injection(content);
        assert!(!injection.contains("hidePropertyIn"));
        assert!(!injection.contains("hidePropertiesIn"));
    }

    #[test]
    fn test_partial_injection() {
        let content = "var hidePropertyIn = function() {};";
        let injection = create_mendix_utils_injection(content);
        assert!(!injection.contains("var hidePropertyIn"));
        assert!(injection.contains("hidePropertiesIn"));
    }
}
