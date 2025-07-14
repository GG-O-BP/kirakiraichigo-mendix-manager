use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

// Pure data types - immutable by design
#[derive(Debug, Clone)]
pub struct CopyOperation {
    pub source_path: PathBuf,
    pub target_path: PathBuf,
    pub is_directory: bool,
}

#[derive(Debug, Clone)]
pub struct CopyResult {
    pub app_path: String,
    pub success: bool,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone)]
pub struct FileTreeNode {
    pub relative_path: PathBuf,
    pub is_directory: bool,
    pub source_path: PathBuf,
}

// Pure validation functions
fn is_valid_widget_path(widget_path: &str) -> bool {
    let dist_path = Path::new(widget_path).join("dist").join("1.0.0");
    dist_path.exists()
}

fn is_valid_app_path(app_path: &str) -> bool {
    Path::new(app_path).exists()
}

// Pure path construction functions
fn construct_widget_source_path(widget_path: &str) -> PathBuf {
    Path::new(widget_path).join("dist").join("1.0.0")
}

fn construct_app_target_path(app_path: &str) -> PathBuf {
    Path::new(app_path).join("widgets")
}

fn construct_target_file_path(target_dir: &Path, relative_path: &Path) -> PathBuf {
    target_dir.join(relative_path)
}

// Pure file tree analysis functions
fn extract_relative_path(source_path: &Path, base_path: &Path) -> Option<PathBuf> {
    source_path
        .strip_prefix(base_path)
        .ok()
        .map(|p| p.to_path_buf())
}

fn create_file_tree_node(entry_path: &Path, base_path: &Path) -> Option<FileTreeNode> {
    extract_relative_path(entry_path, base_path).map(|relative_path| FileTreeNode {
        relative_path,
        is_directory: entry_path.is_dir(),
        source_path: entry_path.to_path_buf(),
    })
}

fn scan_directory_tree(source_dir: &Path) -> Result<Vec<FileTreeNode>, String> {
    if !source_dir.exists() {
        return Err(format!("Source directory not found: {:?}", source_dir));
    }

    WalkDir::new(source_dir)
        .min_depth(1)
        .into_iter()
        .map(|entry| {
            entry
                .map_err(|e| format!("Failed to read directory entry: {}", e))
                .and_then(|e| {
                    create_file_tree_node(e.path(), source_dir)
                        .ok_or_else(|| "Failed to create relative path".to_string())
                })
        })
        .collect()
}

// Pure copy operation planning functions
fn create_copy_operations(file_nodes: &[FileTreeNode], target_dir: &Path) -> Vec<CopyOperation> {
    file_nodes
        .iter()
        .map(|node| CopyOperation {
            source_path: node.source_path.clone(),
            target_path: construct_target_file_path(target_dir, &node.relative_path),
            is_directory: node.is_directory,
        })
        .collect()
}

fn plan_copy_operations_for_app(file_nodes: &[FileTreeNode], app_path: &str) -> Vec<CopyOperation> {
    let target_dir = construct_app_target_path(app_path);
    create_copy_operations(file_nodes, &target_dir)
}

// Pure result aggregation functions
fn create_success_result(app_path: String) -> CopyResult {
    CopyResult {
        app_path,
        success: true,
        error_message: None,
    }
}

fn create_error_result(app_path: String, error: String) -> CopyResult {
    CopyResult {
        app_path,
        success: false,
        error_message: Some(error),
    }
}

fn extract_successful_app_paths(results: Vec<CopyResult>) -> Vec<String> {
    results
        .into_iter()
        .filter(|result| result.success)
        .map(|result| result.app_path)
        .collect()
}

fn has_any_failures(results: &[CopyResult]) -> bool {
    results.iter().any(|result| !result.success)
}

fn collect_error_messages(results: &[CopyResult]) -> Vec<String> {
    results
        .iter()
        .filter_map(|result| result.error_message.as_ref())
        .cloned()
        .collect()
}

// Pure filtering functions
fn filter_valid_app_paths(app_paths: Vec<String>) -> Vec<String> {
    app_paths
        .into_iter()
        .filter(|path| is_valid_app_path(path))
        .collect()
}

// IO wrapper functions - only these perform side effects
fn create_directory_if_not_exists(dir_path: &Path) -> Result<(), String> {
    if !dir_path.exists() {
        fs::create_dir_all(dir_path).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    Ok(())
}

fn copy_file_to_target(source_path: &Path, target_path: &Path) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = target_path.parent() {
        create_directory_if_not_exists(parent)?;
    }

    fs::copy(source_path, target_path)
        .map_err(|e| format!("Failed to copy file: {}", e))
        .map(|_| ())
}

fn execute_copy_operation(operation: &CopyOperation) -> Result<(), String> {
    if operation.is_directory {
        create_directory_if_not_exists(&operation.target_path)
    } else {
        copy_file_to_target(&operation.source_path, &operation.target_path)
    }
}

fn execute_copy_operations(operations: Vec<CopyOperation>) -> Result<(), String> {
    for operation in operations {
        execute_copy_operation(&operation)?;
    }
    Ok(())
}

// Main processing functions - compose pure functions with minimal IO
fn process_single_app_copy(file_nodes: &[FileTreeNode], app_path: String) -> CopyResult {
    let copy_operations = plan_copy_operations_for_app(file_nodes, &app_path);

    match execute_copy_operations(copy_operations) {
        Ok(()) => create_success_result(app_path),
        Err(error) => create_error_result(app_path, error),
    }
}

fn process_all_app_copies(file_nodes: &[FileTreeNode], app_paths: Vec<String>) -> Vec<CopyResult> {
    app_paths
        .into_iter()
        .map(|app_path| process_single_app_copy(file_nodes, app_path))
        .collect()
}

// Pure validation composition
fn validate_widget_copy_inputs(widget_path: &str, app_paths: &[String]) -> Result<(), String> {
    if !is_valid_widget_path(widget_path) {
        return Err(format!(
            "Widget dist folder not found: {:?}",
            construct_widget_source_path(widget_path)
        ));
    }

    let valid_app_paths = filter_valid_app_paths(app_paths.to_vec());
    if valid_app_paths.is_empty() {
        return Err("No valid app paths provided".to_string());
    }

    Ok(())
}

// Main API functions
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn copy_widget_to_apps(
    widget_path: String,
    app_paths: Vec<String>,
) -> Result<Vec<String>, String> {
    // Validate inputs using pure functions
    validate_widget_copy_inputs(&widget_path, &app_paths)?;

    // Get valid app paths only
    let valid_app_paths = filter_valid_app_paths(app_paths);

    // Scan source directory structure
    let source_dir = construct_widget_source_path(&widget_path);
    let file_nodes = scan_directory_tree(&source_dir)?;

    // Process all copy operations
    let results = process_all_app_copies(&file_nodes, valid_app_paths);

    // Check for any failures and return appropriate result
    if has_any_failures(&results) {
        let error_messages = collect_error_messages(&results);
        Err(format!(
            "Copy operations failed: {}",
            error_messages.join("; ")
        ))
    } else {
        Ok(extract_successful_app_paths(results))
    }
}

// Additional utility functions for future extensibility
pub fn get_widget_dist_path(widget_path: &str) -> PathBuf {
    construct_widget_source_path(widget_path)
}

pub fn validate_widget_structure(widget_path: &str) -> bool {
    is_valid_widget_path(widget_path)
}

pub fn get_app_widgets_path(app_path: &str) -> PathBuf {
    construct_app_target_path(app_path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn test_greet_function() {
        let result = greet("World");
        assert_eq!(result, "Hello, World! You've been greeted from Rust!");
    }

    #[test]
    fn test_construct_widget_source_path() {
        let widget_path = "my_widget";
        let expected = Path::new("my_widget").join("dist").join("1.0.0");
        let result = construct_widget_source_path(widget_path);
        assert_eq!(result, expected);
    }

    #[test]
    fn test_construct_app_target_path() {
        let app_path = "my_app";
        let expected = Path::new("my_app").join("widgets");
        let result = construct_app_target_path(app_path);
        assert_eq!(result, expected);
    }

    #[test]
    fn test_create_success_result() {
        let app_path = "test_app".to_string();
        let result = create_success_result(app_path.clone());
        assert!(result.success);
        assert_eq!(result.app_path, app_path);
        assert!(result.error_message.is_none());
    }

    #[test]
    fn test_create_error_result() {
        let app_path = "test_app".to_string();
        let error = "Test error".to_string();
        let result = create_error_result(app_path.clone(), error.clone());
        assert!(!result.success);
        assert_eq!(result.app_path, app_path);
        assert_eq!(result.error_message, Some(error));
    }

    #[test]
    fn test_extract_successful_app_paths() {
        let results = vec![
            create_success_result("app1".to_string()),
            create_error_result("app2".to_string(), "error".to_string()),
            create_success_result("app3".to_string()),
        ];

        let successful_paths = extract_successful_app_paths(results);
        assert_eq!(successful_paths, vec!["app1", "app3"]);
    }

    #[test]
    fn test_has_any_failures() {
        let success_results = vec![
            create_success_result("app1".to_string()),
            create_success_result("app2".to_string()),
        ];

        let mixed_results = vec![
            create_success_result("app1".to_string()),
            create_error_result("app2".to_string(), "error".to_string()),
        ];

        assert!(!has_any_failures(&success_results));
        assert!(has_any_failures(&mixed_results));
    }

    #[test]
    fn test_extract_relative_path() {
        let source = Path::new("/base/dir/file.txt");
        let base = Path::new("/base/dir");
        let expected = Path::new("file.txt");

        let result = extract_relative_path(source, base);
        assert_eq!(result, Some(expected.to_path_buf()));
    }

    #[test]
    fn test_construct_target_file_path() {
        let target_dir = Path::new("/target");
        let relative_path = Path::new("subdir/file.txt");
        let expected = Path::new("/target/subdir/file.txt");

        let result = construct_target_file_path(target_dir, relative_path);
        assert_eq!(result, expected);
    }
}
