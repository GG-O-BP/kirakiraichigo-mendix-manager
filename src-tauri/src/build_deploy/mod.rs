use crate::package_manager::widget_operations::install_and_build_widget;
use crate::utils::copy_widget_to_apps as copy_widget_to_apps_util;
use rayon::prelude::*;
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

fn transform_widget_to_build_request(widget: &WidgetInput) -> WidgetBuildRequest {
    WidgetBuildRequest {
        widget_path: widget.path.clone(),
        caption: widget.caption.clone(),
    }
}

fn transform_widgets_to_build_requests(widgets: &[WidgetInput]) -> Vec<WidgetBuildRequest> {
    widgets
        .iter()
        .map(transform_widget_to_build_request)
        .collect()
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

    // Use the common install_and_build_widget function
    if let Err(e) = install_and_build_widget(&widget_path, package_manager) {
        return Err(FailedDeployment {
            widget: widget_caption,
            error: e,
        });
    }

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

fn filter_widgets_by_ids(widgets: &[WidgetInput], selected_ids: &[String]) -> Vec<WidgetInput> {
    use std::collections::HashSet;
    let id_set: HashSet<&String> = selected_ids.iter().collect();
    widgets
        .iter()
        .filter(|w| id_set.contains(&w.id))
        .cloned()
        .collect()
}

fn filter_apps_by_paths(apps: &[AppInput], selected_paths: &[String]) -> Vec<AppInput> {
    use std::collections::HashSet;
    let path_set: HashSet<&String> = selected_paths.iter().collect();
    apps.iter()
        .filter(|a| path_set.contains(&a.path))
        .cloned()
        .collect()
}

#[tauri::command]
pub async fn build_and_deploy_from_selections(
    widgets: Vec<WidgetInput>,
    apps: Vec<AppInput>,
    package_manager: String,
    selected_widget_ids: Option<Vec<String>>,
    selected_app_paths: Option<Vec<String>>,
) -> Result<BuildDeployResult, String> {
    // Filter widgets and apps if selection IDs/paths are provided
    let filtered_widgets = match selected_widget_ids {
        Some(ids) if !ids.is_empty() => filter_widgets_by_ids(&widgets, &ids),
        _ => widgets,
    };

    let filtered_apps = match selected_app_paths {
        Some(paths) if !paths.is_empty() => filter_apps_by_paths(&apps, &paths),
        _ => apps,
    };

    let widget_requests = transform_widgets_to_build_requests(&filtered_widgets);
    let app_paths = extract_app_paths(&filtered_apps);
    let app_names = extract_app_names(&filtered_apps);

    build_and_deploy_widgets(widget_requests, app_paths, app_names, package_manager).await
}

#[tauri::command]
pub fn create_catastrophic_error_result(error_message: String) -> Result<BuildDeployResult, String> {
    Ok(BuildDeployResult {
        successful: Vec::new(),
        failed: vec![FailedDeployment {
            widget: "All widgets".to_string(),
            error: error_message,
        }],
    })
}
