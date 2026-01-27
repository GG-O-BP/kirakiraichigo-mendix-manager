use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PropertyGroup {
    #[serde(default)]
    pub key: Option<String>,
    #[serde(default)]
    pub caption: Option<String>,
    #[serde(default)]
    pub properties: Option<Vec<serde_json::Value>>,
    #[serde(default, rename = "propertyGroups")]
    pub property_groups: Option<Vec<PropertyGroup>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub property: Option<String>,
    pub message: String,
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditorConfigEvaluationResult {
    pub filtered_groups: Vec<PropertyGroup>,
    pub visible_keys: Vec<String>,
    pub validation_errors: Vec<ValidationError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetDefinitionSpec {
    #[serde(rename = "propertyGroups")]
    pub property_groups: Vec<PropertyGroup>,
}
