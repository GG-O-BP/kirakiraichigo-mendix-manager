use regex::Regex;
use std::sync::OnceLock;

static IMPORT_NAMED: OnceLock<Regex> = OnceLock::new();
static IMPORT_WILDCARD: OnceLock<Regex> = OnceLock::new();
static IMPORT_DEFAULT: OnceLock<Regex> = OnceLock::new();
static EXPORT_CONST: OnceLock<Regex> = OnceLock::new();
static EXPORT_FUNCTION: OnceLock<Regex> = OnceLock::new();
static EXPORT_DEFAULT: OnceLock<Regex> = OnceLock::new();
static EXPORT_BRACES: OnceLock<Regex> = OnceLock::new();

fn import_named() -> &'static Regex {
    IMPORT_NAMED.get_or_init(|| {
        Regex::new(r#"import\s+\{[^}]*\}\s+from\s+['"][^'"]*['"]\s*;?"#).unwrap()
    })
}

fn import_wildcard() -> &'static Regex {
    IMPORT_WILDCARD.get_or_init(|| {
        Regex::new(r#"import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]*['"]\s*;?"#).unwrap()
    })
}

fn import_default() -> &'static Regex {
    IMPORT_DEFAULT.get_or_init(|| {
        Regex::new(r#"import\s+\w+\s+from\s+['"][^'"]*['"]\s*;?"#).unwrap()
    })
}

fn export_const() -> &'static Regex {
    EXPORT_CONST.get_or_init(|| Regex::new(r"export\s+const\s+").unwrap())
}

fn export_function() -> &'static Regex {
    EXPORT_FUNCTION.get_or_init(|| Regex::new(r"export\s+function\s+").unwrap())
}

fn export_default() -> &'static Regex {
    EXPORT_DEFAULT.get_or_init(|| Regex::new(r"export\s+default\s+").unwrap())
}

fn export_braces() -> &'static Regex {
    EXPORT_BRACES.get_or_init(|| Regex::new(r"export\s*\{[^}]*\}").unwrap())
}

pub fn transform_es6_to_commonjs(content: &str) -> String {
    let result = import_named().replace_all(content, "");
    let result = import_wildcard().replace_all(&result, "");
    let result = import_default().replace_all(&result, "");
    let result = export_const().replace_all(&result, "const ");
    let result = export_function().replace_all(&result, "function ");
    let result = export_default().replace_all(&result, "module.exports.default = ");
    let result = export_braces().replace_all(&result, "");

    result.into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_remove_named_imports() {
        let input = r#"import { hidePropertyIn } from "@mendix/pluggable-widgets-tools";"#;
        let result = transform_es6_to_commonjs(input);
        assert_eq!(result.trim(), "");
    }

    #[test]
    fn test_remove_wildcard_imports() {
        let input = r#"import * as utils from "./utils";"#;
        let result = transform_es6_to_commonjs(input);
        assert_eq!(result.trim(), "");
    }

    #[test]
    fn test_remove_default_imports() {
        let input = r#"import React from "react";"#;
        let result = transform_es6_to_commonjs(input);
        assert_eq!(result.trim(), "");
    }

    #[test]
    fn test_transform_export_const() {
        let input = "export const getProperties = (values, props) => props;";
        let result = transform_es6_to_commonjs(input);
        assert_eq!(result, "const getProperties = (values, props) => props;");
    }

    #[test]
    fn test_transform_export_function() {
        let input = "export function getProperties(values, props) { return props; }";
        let result = transform_es6_to_commonjs(input);
        assert_eq!(result, "function getProperties(values, props) { return props; }");
    }

    #[test]
    fn test_transform_export_default() {
        let input = "export default { getProperties };";
        let result = transform_es6_to_commonjs(input);
        assert_eq!(result, "module.exports.default = { getProperties };");
    }

    #[test]
    fn test_remove_export_braces() {
        let input = "export { getProperties, check };";
        let result = transform_es6_to_commonjs(input);
        assert_eq!(result.trim(), ";");
    }

    #[test]
    fn test_full_transformation() {
        let input = r#"
import { hidePropertyIn } from "@mendix/pluggable-widgets-tools";

export function getProperties(values, defaultProperties) {
    if (values.showAdvanced === false) {
        hidePropertyIn(defaultProperties, values, "advancedOption");
    }
    return defaultProperties;
}

export { getProperties };
"#;
        let result = transform_es6_to_commonjs(input);
        assert!(result.contains("function getProperties(values, defaultProperties)"));
        assert!(!result.contains("import"));
        assert!(!result.contains("export"));
    }
}
