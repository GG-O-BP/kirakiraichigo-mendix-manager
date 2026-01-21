use crate::package_manager::executor::execute_package_manager_command;
use std::path::Path;

/// Installs dependencies and builds a widget.
///
/// This function checks if node_modules exists before running install,
/// then executes the build command.
///
/// # Arguments
/// * `widget_path` - Path to the widget directory
/// * `package_manager` - Package manager to use (npm, yarn, pnpm, bun)
///
/// # Returns
/// * `Ok(String)` - Success message
/// * `Err(String)` - Error message describing what failed
pub fn install_and_build_widget(widget_path: &str, package_manager: &str) -> Result<String, String> {
    let path = Path::new(widget_path);
    let node_modules = path.join("node_modules");

    // Install dependencies if node_modules doesn't exist
    if !node_modules.exists() {
        println!(
            "[Widget Operations] node_modules not found, running install in {}",
            widget_path
        );

        execute_package_manager_command(package_manager, "install", widget_path).map_err(|e| {
            format!("Failed to install dependencies: {}", e)
        })?;

        println!("[Widget Operations] Install completed for {}", widget_path);
    }

    // Run build
    println!("[Widget Operations] Building widget in {}", widget_path);

    execute_package_manager_command(package_manager, "run build", widget_path)
        .map_err(|e| format!("Build failed: {}", e))?;

    println!("[Widget Operations] Build completed for {}", widget_path);

    Ok("Widget built successfully".to_string())
}

