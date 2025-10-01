use crate::package_manager::run_package_manager_command;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize)]
pub struct BuildWidgetRequest {
    pub widget_path: String,
    pub package_manager: String,
}

#[derive(Debug, Serialize)]
pub struct BuildWidgetResponse {
    pub success: bool,
    pub bundle_content: Option<String>,
    pub widget_name: Option<String>,
    pub widget_id: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn build_widget_for_preview(
    widget_path: String,
    package_manager: String,
) -> Result<BuildWidgetResponse, String> {
    println!("[Widget Preview] Building widget at: {}", widget_path);
    println!(
        "[Widget Preview] Using package manager: {}",
        package_manager
    );

    let path = Path::new(&widget_path);

    // 1. node_modules가 없으면 install 먼저 실행
    let node_modules = path.join("node_modules");
    if !node_modules.exists() {
        println!("[Widget Preview] node_modules not found, running install first");

        match run_package_manager_command(
            package_manager.clone(),
            "install".to_string(),
            widget_path.clone(),
        ) {
            Ok(output) => {
                println!("[Widget Preview] Install output: {}", output);
            }
            Err(e) => {
                return Ok(BuildWidgetResponse {
                    success: false,
                    bundle_content: None,
                    widget_name: None,
                    widget_id: None,
                    error: Some(format!("Failed to install dependencies: {}", e)),
                });
            }
        }
    }

    // 2. build 실행
    println!("[Widget Preview] Running build command");
    match run_package_manager_command(
        package_manager,
        "run build".to_string(),
        widget_path.clone(),
    ) {
        Ok(output) => {
            println!("[Widget Preview] Build output: {}", output);

            // 3. dist 폴더에서 번들 읽기
            match read_widget_bundle(path).await {
                Ok(bundle) => {
                    // 4. 위젯 메타데이터 파싱
                    match parse_widget_metadata(path) {
                        Ok(metadata) => Ok(BuildWidgetResponse {
                            success: true,
                            bundle_content: Some(bundle),
                            widget_name: Some(metadata.name),
                            widget_id: Some(metadata.id),
                            error: None,
                        }),
                        Err(e) => Ok(BuildWidgetResponse {
                            success: true,
                            bundle_content: Some(bundle),
                            widget_name: None,
                            widget_id: None,
                            error: Some(format!("Warning: Failed to parse metadata: {}", e)),
                        }),
                    }
                }
                Err(e) => Ok(BuildWidgetResponse {
                    success: false,
                    bundle_content: None,
                    widget_name: None,
                    widget_id: None,
                    error: Some(format!("Build succeeded but failed to read bundle: {}", e)),
                }),
            }
        }
        Err(e) => Ok(BuildWidgetResponse {
            success: false,
            bundle_content: None,
            widget_name: None,
            widget_id: None,
            error: Some(format!("Build failed: {}", e)),
        }),
    }
}

async fn read_widget_bundle(widget_path: &Path) -> Result<String, String> {
    let dist_dir = widget_path.join("dist");

    if !dist_dir.exists() {
        return Err("dist directory not found".to_string());
    }

    // Recursively search for the main widget JS file
    match find_widget_bundle_recursive(&dist_dir).await {
        Some(bundle_path) => {
            println!("[Widget Preview] Found bundle at: {:?}", bundle_path);
            tokio::fs::read_to_string(&bundle_path)
                .await
                .map_err(|e| format!("Failed to read bundle file: {}", e))
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
    // package.json에서 widgetName 추출
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

    let _name = json["name"].as_str().unwrap_or(&widget_name).to_string();

    // widget.xml에서 id 추출
    let src_dir = widget_path.join("src");
    let mut widget_id = String::new();

    if let Ok(entries) = std::fs::read_dir(&src_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("xml") {
                if let Ok(xml_content) = std::fs::read_to_string(&path) {
                    // Simple regex to extract widget id
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
