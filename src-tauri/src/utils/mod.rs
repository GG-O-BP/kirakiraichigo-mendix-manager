use std::fs;
use std::path::Path;
use walkdir::WalkDir;

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn copy_widget_to_apps(
    widget_path: String,
    app_paths: Vec<String>,
) -> Result<Vec<String>, String> {
    let source_dir = Path::new(&widget_path).join("dist").join("1.0.0");

    if !source_dir.exists() {
        return Err(format!("Widget dist folder not found: {:?}", source_dir));
    }

    let mut successful_apps = Vec::new();

    for app_path in app_paths {
        let target_dir = Path::new(&app_path).join("widgets");

        // Create widgets directory if it doesn't exist
        if !target_dir.exists() {
            fs::create_dir_all(&target_dir)
                .map_err(|e| format!("Failed to create widgets directory: {}", e))?;
        }

        // Copy all files from source to target
        for entry in WalkDir::new(&source_dir).min_depth(1) {
            let entry = entry.map_err(|e| format!("Failed to read source directory: {}", e))?;
            let source_path = entry.path();

            // Get relative path from source directory
            let relative_path = source_path
                .strip_prefix(&source_dir)
                .map_err(|e| format!("Failed to get relative path: {}", e))?;

            let target_path = target_dir.join(relative_path);

            if entry.file_type().is_dir() {
                fs::create_dir_all(&target_path)
                    .map_err(|e| format!("Failed to create directory: {}", e))?;
            } else {
                // Copy file
                fs::copy(source_path, &target_path)
                    .map_err(|e| format!("Failed to copy file: {}", e))?;
            }
        }

        successful_apps.push(app_path);
    }

    Ok(successful_apps)
}
