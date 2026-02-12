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
pub struct WidgetDefinitionSpec {
    #[serde(rename = "propertyGroups")]
    pub property_groups: Vec<PropertyGroup>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PropertyVisibilityResult {
    pub visible_keys: Option<Vec<String>>,
    pub group_counts: std::collections::HashMap<String, usize>,
}
