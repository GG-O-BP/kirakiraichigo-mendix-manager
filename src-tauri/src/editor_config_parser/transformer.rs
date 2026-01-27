use once_cell::sync::Lazy;
use regex::Regex;

static IMPORT_NAMED: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"import\s+\{[^}]*\}\s+from\s+['"][^'"]*['"]\s*;?"#).unwrap());

static IMPORT_WILDCARD: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]*['"]\s*;?"#).unwrap());

static IMPORT_DEFAULT: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"import\s+\w+\s+from\s+['"][^'"]*['"]\s*;?"#).unwrap());

static EXPORT_CONST: Lazy<Regex> = Lazy::new(|| Regex::new(r"export\s+const\s+").unwrap());

static EXPORT_FUNCTION: Lazy<Regex> = Lazy::new(|| Regex::new(r"export\s+function\s+").unwrap());

static EXPORT_DEFAULT: Lazy<Regex> = Lazy::new(|| Regex::new(r"export\s+default\s+").unwrap());

static EXPORT_BRACES: Lazy<Regex> = Lazy::new(|| Regex::new(r"export\s*\{[^}]*\}").unwrap());

pub fn transform_es6_to_commonjs(content: &str) -> String {
    let result = IMPORT_NAMED.replace_all(content, "");
    let result = IMPORT_WILDCARD.replace_all(&result, "");
    let result = IMPORT_DEFAULT.replace_all(&result, "");
    let result = EXPORT_CONST.replace_all(&result, "const ");
    let result = EXPORT_FUNCTION.replace_all(&result, "function ");
    let result = EXPORT_DEFAULT.replace_all(&result, "module.exports.default = ");
    let result = EXPORT_BRACES.replace_all(&result, "");

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
