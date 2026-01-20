use crate::package_manager::run_package_manager_command;
use serde::Serialize;
use std::path::Path;

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
pub async fn build_widget_for_preview(
    widget_path: String,
    package_manager: String,
) -> Result<BuildWidgetResponse, String> {
    let path = Path::new(&widget_path);
    let node_modules = path.join("node_modules");
    if !node_modules.exists() {
        match run_package_manager_command(
            package_manager.clone(),
            "install".to_string(),
            widget_path.clone(),
        ) {
            Ok(_) => {}
            Err(e) => {
                return Ok(BuildWidgetResponse {
                    success: false,
                    bundle_content: None,
                    css_content: None,
                    widget_name: None,
                    widget_id: None,
                    error: Some(format!("Failed to install dependencies: {}", e)),
                });
            }
        }
    }

    match run_package_manager_command(
        package_manager,
        "run build".to_string(),
        widget_path.clone(),
    ) {
        Ok(_) => {
            match read_widget_bundle(path).await {
                Ok((bundle, css)) => {
                    match parse_widget_metadata(path) {
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
                    }
                }
                Err(e) => Ok(BuildWidgetResponse {
                    success: false,
                    bundle_content: None,
                    css_content: None,
                    widget_name: None,
                    widget_id: None,
                    error: Some(format!("Build succeeded but failed to read bundle: {}", e)),
                }),
            }
        }
        Err(e) => Ok(BuildWidgetResponse {
            success: false,
            bundle_content: None,
            css_content: None,
            widget_name: None,
            widget_id: None,
            error: Some(format!("Build failed: {}", e)),
        }),
    }
}

async fn read_widget_bundle(widget_path: &Path) -> Result<(String, Option<String>), String> {
    let dist_dir = widget_path.join("dist");

    if !dist_dir.exists() {
        return Err("dist directory not found".to_string());
    }

    // Recursively search for the main widget JS file
    match find_widget_bundle_recursive(&dist_dir).await {
        Some(bundle_path) => {
            // Read JS bundle
            let bundle_content = tokio::fs::read_to_string(&bundle_path)
                .await
                .map_err(|e| format!("Failed to read bundle file: {}", e))?;

            // Try to find and read CSS file in the same directory
            let css_content = if let Some(parent) = bundle_path.parent() {
                let css_path = parent.join(
                    bundle_path
                        .file_stem()
                        .and_then(|s| s.to_str())
                        .map(|name| format!("{}.css", name))
                        .unwrap_or_default()
                );

                if css_path.exists() {
                    tokio::fs::read_to_string(&css_path).await.ok()
                } else {
                    None
                }
            } else {
                None
            };

            Ok((bundle_content, css_content))
        }
        None => Err(format!(
            "No widget bundle (.js) file found in dist directory. Searched in: {:?}",
            dist_dir
        )),
    }
}

async fn find_widget_bundle_recursive(dir: &Path) -> Option<std::path::PathBuf> {
    let mut queue = vec![dir.to_path_buf()];

    while let Some(current_dir) = queue.pop() {
        let mut entries = match tokio::fs::read_dir(&current_dir).await {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        while let Ok(Some(entry)) = entries.next_entry().await {
            let path = entry.path();

            if path.is_dir() {
                queue.push(path);
            } else if path.extension().and_then(|s| s.to_str()) == Some("js") {
                let file_name = path.file_name()?.to_str()?;

                // Look for main widget file (not editor files)
                // Pattern: <WidgetName>.js in sbtglobal/sbtdatepicker/ or similar
                if !file_name.contains("editorPreview")
                    && !file_name.contains("editorConfig")
                    && !file_name.starts_with(".")
                {
                    // Prefer files in deeper nested directories (actual widget bundle)
                    if path.parent()?.file_name()?.to_str()?.len() > 0 {
                        return Some(path);
                    }
                }
            }
        }
    }

    None
}

#[derive(Debug)]
struct WidgetMetadata {
    name: String,
    id: String,
}

fn parse_widget_metadata(widget_path: &Path) -> Result<WidgetMetadata, String> {
    let package_json_path = widget_path.join("package.json");
    if !package_json_path.exists() {
        return Err("package.json not found".to_string());
    }

    let content = std::fs::read_to_string(&package_json_path)
        .map_err(|e| format!("Failed to read package.json: {}", e))?;

    let json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse package.json: {}", e))?;

    let widget_name = json["widgetName"]
        .as_str()
        .ok_or("widgetName not found in package.json")?
        .to_string();

    let src_dir = widget_path.join("src");
    let mut widget_id = String::new();

    if let Ok(entries) = std::fs::read_dir(&src_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("xml") {
                if let Ok(xml_content) = std::fs::read_to_string(&path) {
                    if let Some(id_start) = xml_content.find(r#"id=""#) {
                        let id_content = &xml_content[id_start + 4..];
                        if let Some(id_end) = id_content.find('"') {
                            widget_id = id_content[..id_end].to_string();
                            break;
                        }
                    }
                }
            }
        }
    }

    if widget_id.is_empty() {
        widget_id = widget_name.clone();
    }

    Ok(WidgetMetadata {
        name: widget_name,
        id: widget_id,
    })
}
