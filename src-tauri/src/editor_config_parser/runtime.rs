use boa_engine::{Context, JsValue, Source};

use crate::editor_config_parser::transformer::transform_es6_to_commonjs;
use crate::editor_config_parser::types::{PropertyGroup, ValidationError};
use crate::editor_config_parser::utils::create_mendix_utils_injection;

pub struct EditorConfigRuntime {
    context: Context,
}

impl EditorConfigRuntime {
    pub fn new(config_content: &str) -> Result<Self, String> {
        let mut context = Context::default();

        let transformed = transform_es6_to_commonjs(config_content);
        let utils_injection = create_mendix_utils_injection(&transformed);

        let wrapper_script = format!(
            r#"
var exports = {{}};
var module = {{ exports: exports }};

{utils_injection}

{transformed}

if (typeof getProperties === 'function') exports.getProperties = getProperties;
if (typeof check === 'function') exports.check = check;
if (typeof getPreview === 'function') exports.getPreview = getPreview;
if (typeof getCustomCaption === 'function') exports.getCustomCaption = getCustomCaption;
"#
        );

        context
            .eval(Source::from_bytes(&wrapper_script))
            .map_err(|e| format!("Failed to evaluate editor config: {}", e))?;

        Ok(Self { context })
    }

    pub fn is_get_properties_available(&mut self) -> bool {
        self.check_function_exists("getProperties")
    }

    pub fn is_check_available(&mut self) -> bool {
        self.check_function_exists("check")
    }

    fn check_function_exists(&mut self, fn_name: &str) -> bool {
        let check_script = format!("typeof exports.{} === 'function'", fn_name);
        match self.context.eval(Source::from_bytes(&check_script)) {
            Ok(result) => result.to_boolean(),
            Err(_) => false,
        }
    }

    pub fn get_properties(
        &mut self,
        values: &serde_json::Value,
        default_properties: &[PropertyGroup],
    ) -> Result<Vec<PropertyGroup>, String> {
        let values_json = serde_json::to_string(values)
            .map_err(|e| format!("Failed to serialize values: {}", e))?;

        let props_json = serde_json::to_string(default_properties)
            .map_err(|e| format!("Failed to serialize properties: {}", e))?;

        let call_script = format!(
            r#"
(function() {{
    var values = {values_json};
    var defaultProps = {props_json};
    if (typeof exports.getProperties === 'function') {{
        return JSON.stringify(exports.getProperties(values, defaultProps));
    }}
    return JSON.stringify(defaultProps);
}})()
"#
        );

        let result = self
            .context
            .eval(Source::from_bytes(&call_script))
            .map_err(|e| format!("Failed to execute getProperties: {}", e))?;

        self.js_value_to_property_groups(result)
    }

    pub fn check(&mut self, values: &serde_json::Value) -> Result<Vec<ValidationError>, String> {
        let values_json = serde_json::to_string(values)
            .map_err(|e| format!("Failed to serialize values: {}", e))?;

        let call_script = format!(
            r#"
(function() {{
    var values = {values_json};
    if (typeof exports.check === 'function') {{
        var result = exports.check(values);
        return JSON.stringify(result || []);
    }}
    return "[]";
}})()
"#
        );

        let result = self
            .context
            .eval(Source::from_bytes(&call_script))
            .map_err(|e| format!("Failed to execute check: {}", e))?;

        self.js_value_to_validation_errors(result)
    }

    fn js_value_to_property_groups(&self, value: JsValue) -> Result<Vec<PropertyGroup>, String> {
        let json_str = value
            .as_string()
            .map(|s| s.to_std_string_escaped())
            .ok_or_else(|| "getProperties did not return a string".to_string())?;

        serde_json::from_str(&json_str)
            .map_err(|e| format!("Failed to parse getProperties result: {}", e))
    }

    fn js_value_to_validation_errors(&self, value: JsValue) -> Result<Vec<ValidationError>, String> {
        let json_str = value
            .as_string()
            .map(|s| s.to_std_string_escaped())
            .ok_or_else(|| "check did not return a string".to_string())?;

        serde_json::from_str(&json_str)
            .map_err(|e| format!("Failed to parse check result: {}", e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_runtime_creation() {
        let config = r#"
function getProperties(values, defaultProperties) {
    return defaultProperties;
}
"#;
        let result = EditorConfigRuntime::new(config);
        assert!(result.is_ok());
    }

    #[test]
    fn test_get_properties_available() {
        let config = r#"
function getProperties(values, defaultProperties) {
    return defaultProperties;
}
"#;
        let mut runtime = EditorConfigRuntime::new(config).unwrap();
        assert!(runtime.is_get_properties_available());
        assert!(!runtime.is_check_available());
    }

    #[test]
    fn test_check_available() {
        let config = r#"
function check(values) {
    return [];
}
"#;
        let mut runtime = EditorConfigRuntime::new(config).unwrap();
        assert!(!runtime.is_get_properties_available());
        assert!(runtime.is_check_available());
    }

    #[test]
    fn test_get_properties_passthrough() {
        let config = r#"
function getProperties(values, defaultProperties) {
    return defaultProperties;
}
"#;
        let mut runtime = EditorConfigRuntime::new(config).unwrap();
        let values = serde_json::json!({});
        let props = vec![PropertyGroup {
            key: Some("general".to_string()),
            caption: Some("General".to_string()),
            properties: Some(vec![]),
            property_groups: None,
        }];

        let result = runtime.get_properties(&values, &props).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].key, Some("general".to_string()));
    }

    #[test]
    fn test_check_returns_empty() {
        let config = r#"
function check(values) {
    return [];
}
"#;
        let mut runtime = EditorConfigRuntime::new(config).unwrap();
        let values = serde_json::json!({});

        let result = runtime.check(&values).unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn test_check_returns_errors() {
        let config = r#"
function check(values) {
    return [{ property: "name", message: "Name is required" }];
}
"#;
        let mut runtime = EditorConfigRuntime::new(config).unwrap();
        let values = serde_json::json!({});

        let result = runtime.check(&values).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].property, Some("name".to_string()));
        assert_eq!(result[0].message, "Name is required");
    }

    #[test]
    fn test_hide_property_in_injection() {
        let config = r#"
function getProperties(values, defaultProperties) {
    if (values.hideAdvanced) {
        return hidePropertyIn(defaultProperties, "advanced");
    }
    return defaultProperties;
}
"#;
        let mut runtime = EditorConfigRuntime::new(config).unwrap();
        let values = serde_json::json!({ "hideAdvanced": true });
        let props = vec![PropertyGroup {
            key: Some("general".to_string()),
            caption: Some("General".to_string()),
            properties: Some(vec![
                serde_json::json!({"key": "name", "caption": "Name"}),
                serde_json::json!({"key": "advanced", "caption": "Advanced"}),
            ]),
            property_groups: None,
        }];

        let result = runtime.get_properties(&values, &props).unwrap();
        let filtered_props = result[0].properties.as_ref().unwrap();
        assert_eq!(filtered_props.len(), 1);
        assert_eq!(filtered_props[0].get("key").and_then(|v| v.as_str()), Some("name"));
    }
}
