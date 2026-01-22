pub mod bundle;
pub mod metadata;

use crate::package_manager::widget_operations::install_and_build_widget;
use serde::Serialize;
use std::path::Path;

// Re-export for backward compatibility
pub use bundle::read_widget_bundle;
pub use metadata::parse_widget_metadata;

#[derive(Debug, Serialize)]
pub struct BuildWidgetResponse {
    pub success: bool,
    pub bundle_content: Option<String>,
    pub css_content: Option<String>,
    pub widget_name: Option<String>,
    pub widget_id: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn build_and_run_preview(
    widget_path: String,
    package_manager: String,
) -> Result<BuildWidgetResponse, String> {
    let path = Path::new(&widget_path);

    if let Err(e) = install_and_build_widget(&widget_path, &package_manager) {
        return Ok(BuildWidgetResponse {
            success: false,
            bundle_content: None,
            css_content: None,
            widget_name: None,
            widget_id: None,
            error: Some(e),
        });
    }

    read_bundle_and_metadata(path).await
}

#[tauri::command]
pub async fn run_widget_preview_only(widget_path: String) -> Result<BuildWidgetResponse, String> {
    let path = Path::new(&widget_path);
    read_bundle_and_metadata(path).await
}

#[tauri::command]
pub fn check_dist_exists(widget_path: String) -> bool {
    let path = Path::new(&widget_path);
    path.join("dist").exists()
}

async fn read_bundle_and_metadata(path: &Path) -> Result<BuildWidgetResponse, String> {
    match read_widget_bundle(path).await {
        Ok((bundle, css)) => match parse_widget_metadata(path) {
            Ok(metadata) => Ok(BuildWidgetResponse {
                success: true,
                bundle_content: Some(bundle),
                css_content: css,
                widget_name: Some(metadata.name),
                widget_id: Some(metadata.id),
                error: None,
            }),
            Err(e) => Ok(BuildWidgetResponse {
                success: true,
                bundle_content: Some(bundle),
                css_content: css,
                widget_name: None,
                widget_id: None,
                error: Some(format!("Warning: Failed to parse metadata: {}", e)),
            }),
        },
        Err(e) => Ok(BuildWidgetResponse {
            success: false,
            bundle_content: None,
            css_content: None,
            widget_name: None,
            widget_id: None,
            error: Some(e),
        }),
    }
}
