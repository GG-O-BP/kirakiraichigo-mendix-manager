use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetInput {
    pub id: String,
    pub caption: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInput {
    pub name: String,
    pub path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WidgetBuildRequest {
    pub widget_path: String,
    pub caption: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildDeployResult {
    pub successful: Vec<SuccessfulDeployment>,
    pub failed: Vec<FailedDeployment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuccessfulDeployment {
    pub widget: String,
    pub apps: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FailedDeployment {
    pub widget: String,
    pub error: String,
}

pub struct AppDeployResult {
    pub app_name: String,
    pub result: Result<Vec<String>, String>,
}
