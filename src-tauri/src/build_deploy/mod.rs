use crate::package_manager::run_package_manager_command;
use crate::utils::copy_widget_to_apps as copy_widget_to_apps_util;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::path::Path;

// Input types for frontend selections
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

// Pure transformation functions
fn transform_widget_to_build_request(widget: &WidgetInput) -> WidgetBuildRequest {
    WidgetBuildRequest {
        widget_path: widget.path.clone(),
        caption: widget.caption.clone(),
    }
}

fn transform_widgets_to_build_requests(widgets: &[WidgetInput]) -> Vec<WidgetBuildRequest> {
    widgets.iter().map(transform_widget_to_build_request).collect()
}

fn extract_app_paths(apps: &[AppInput]) -> Vec<String> {
    apps.iter().map(|app| app.path.clone()).collect()
}

fn extract_app_names(apps: &[AppInput]) -> Vec<String> {
    apps.iter().map(|app| app.name.clone()).collect()
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BuildDeployResult {
    pub successful: Vec<SuccessfulDeployment>,
    pub failed: Vec<FailedDeployment>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SuccessfulDeployment {
    pub widget: String,
    pub apps: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FailedDeployment {
    pub widget: String,
    pub error: String,
}

#[tauri::command]
pub async fn build_and_deploy_widgets(
    widgets: Vec<WidgetBuildRequest>,
    app_paths: Vec<String>,
    app_names: Vec<String>,
    package_manager: String,
) -> Result<BuildDeployResult, String> {
    println!(
        "[Build & Deploy] Starting build and deploy for {} widgets to {} apps",
        widgets.len(),
        app_paths.len()
    );

    // Process each widget sequentially (build is I/O bound)
    // but deploy to multiple apps in parallel
    let results: Vec<Result<SuccessfulDeployment, FailedDeployment>> = widgets
        .into_iter()
        .map(|widget| {
            process_widget_build_and_deploy(widget, &app_paths, &app_names, &package_manager)
        })
        .collect();

    // Separate successful and failed deployments
    let mut successful = Vec::new();
    let mut failed = Vec::new();

    for result in results {
        match result {
            Ok(success) => successful.push(success),
            Err(failure) => failed.push(failure),
        }
    }

    println!(
        "[Build & Deploy] Completed: {} successful, {} failed",
        successful.len(),
        failed.len()
    );

    Ok(BuildDeployResult { successful, failed })
}

fn process_widget_build_and_deploy(
    widget: WidgetBuildRequest,
    app_paths: &[String],
    app_names: &[String],
    package_manager: &str,
) -> Result<SuccessfulDeployment, FailedDeployment> {
    let widget_caption = widget.caption.clone();
    let widget_path = widget.widget_path.clone();

    println!("[Build & Deploy] Processing widget: {}", widget_caption);

    // Step 1: Check if node_modules exists, if not, run install
    let node_modules_path = Path::new(&widget_path).join("node_modules");
    if !node_modules_path.exists() {
        println!(
            "[Build & Deploy] node_modules not found for {}, running install",
            widget_caption
        );

        match run_package_manager_command(
            package_manager.to_string(),
            "install".to_string(),
            widget_path.clone(),
        ) {
            Ok(_) => println!("[Build & Deploy] Install completed for {}", widget_caption),
            Err(e) => {
                return Err(FailedDeployment {
                    widget: widget_caption,
                    error: format!("Failed to install dependencies: {}", e),
                });
            }
        }
    }

    // Step 2: Build the widget
    println!("[Build & Deploy] Building widget: {}", widget_caption);
    match run_package_manager_command(
        package_manager.to_string(),
        "run build".to_string(),
        widget_path.clone(),
    ) {
        Ok(_) => println!("[Build & Deploy] Build completed for {}", widget_caption),
        Err(e) => {
            return Err(FailedDeployment {
                widget: widget_caption,
                error: format!("Build failed: {}", e),
            });
        }
    }

    // Step 3: Deploy to all apps in parallel using rayon
    println!(
        "[Build & Deploy] Deploying {} to {} apps in parallel",
        widget_caption,
        app_paths.len()
    );

    let deploy_results: Vec<Result<(), String>> = app_paths
        .par_iter()
        .map(|app_path| {
            println!(
                "[Build & Deploy] Deploying {} to {}",
                widget_caption, app_path
            );

            // copy_widget_to_apps expects a Vec, so we pass a single-element Vec
            match copy_widget_to_apps_util(widget_path.clone(), vec![app_path.clone()]) {
                Ok(_) => {
                    println!(
                        "[Build & Deploy] Successfully deployed {} to {}",
                        widget_caption, app_path
                    );
                    Ok(())
                }
                Err(e) => {
                    println!(
                        "[Build & Deploy] Failed to deploy {} to {}: {}",
                        widget_caption, app_path, e
                    );
                    Err(e)
                }
            }
        })
        .collect();

    // Check if any deployment failed
    let mut failed_apps = Vec::new();
    for (i, result) in deploy_results.iter().enumerate() {
        if let Err(e) = result {
            if let Some(app_name) = app_names.get(i) {
                failed_apps.push(format!("{}: {}", app_name, e));
            }
        }
    }

    if !failed_apps.is_empty() {
        return Err(FailedDeployment {
            widget: widget_caption,
            error: format!("Failed to deploy to some apps: {}", failed_apps.join(", ")),
        });
    }

    Ok(SuccessfulDeployment {
        widget: widget_caption,
        apps: app_names.to_vec(),
    })
}

/// New command that takes raw widget/app selections and handles transformation internally
#[tauri::command]
pub async fn build_and_deploy_from_selections(
    widgets: Vec<WidgetInput>,
    apps: Vec<AppInput>,
    package_manager: String,
) -> Result<BuildDeployResult, String> {
    // Transform inputs to build requests
    let widget_requests = transform_widgets_to_build_requests(&widgets);
    let app_paths = extract_app_paths(&apps);
    let app_names = extract_app_names(&apps);

    // Delegate to existing build_and_deploy_widgets
    build_and_deploy_widgets(widget_requests, app_paths, app_names, package_manager).await
}
