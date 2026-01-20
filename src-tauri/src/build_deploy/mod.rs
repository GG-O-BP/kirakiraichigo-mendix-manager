use crate::data_processing::filter_by_key_set;
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

/// Deploy result for a single app
struct AppDeployResult {
    app_name: String,
    result: Result<Vec<String>, String>,
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

    // Zip paths and names together for safe iteration
    let apps: Vec<_> = app_paths.into_iter().zip(app_names).collect();

    let results: Vec<Result<SuccessfulDeployment, FailedDeployment>> = widgets
        .into_iter()
        .map(|widget| process_widget_build_and_deploy(widget, &apps, &package_manager))
        .collect();

    // Partition results into successful and failed
    let (successful, failed): (Vec<_>, Vec<_>) =
        results.into_iter().partition(Result::is_ok);

    let successful: Vec<_> = successful.into_iter().filter_map(Result::ok).collect();
    let failed: Vec<_> = failed.into_iter().filter_map(Result::err).collect();

    println!(
        "[Build & Deploy] Completed: {} successful, {} failed",
        successful.len(),
        failed.len()
    );

    Ok(BuildDeployResult { successful, failed })
}

fn process_widget_build_and_deploy(
    widget: WidgetBuildRequest,
    apps: &[(String, String)], // (path, name) pairs
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
        apps.len()
    );

    // Deploy to all apps in parallel, using zip for safe path-name association
    let deploy_results: Vec<AppDeployResult> = apps
        .par_iter()
        .map(|(app_path, app_name)| {
            println!(
                "[Build & Deploy] Deploying {} to {}",
                widget_caption, app_path
            );

            let result = copy_widget_to_apps_util(widget_path.clone(), vec![app_path.clone()]);

            match &result {
                Ok(_) => println!(
                    "[Build & Deploy] Successfully deployed {} to {}",
                    widget_caption, app_path
                ),
                Err(e) => println!(
                    "[Build & Deploy] Failed to deploy {} to {}: {}",
                    widget_caption, app_path, e
                ),
            }

            AppDeployResult {
                app_name: app_name.clone(),
                result,
            }
        })
        .collect();

    // Collect failed apps using the zip pattern (safe - no index mismatch possible)
    let failed_apps: Vec<String> = deploy_results
        .iter()
        .filter_map(|deploy| {
            deploy
                .result
                .as_ref()
                .err()
                .map(|e| format!("{}: {}", deploy.app_name, e))
        })
        .collect();

    if !failed_apps.is_empty() {
        return Err(FailedDeployment {
            widget: widget_caption,
            error: format!("Failed to deploy to some apps: {}", failed_apps.join(", ")),
        });
    }

    let successful_app_names: Vec<String> = deploy_results
        .into_iter()
        .filter(|r| r.result.is_ok())
        .map(|r| r.app_name)
        .collect();

    Ok(SuccessfulDeployment {
        widget: widget_caption,
        apps: successful_app_names,
    })
}

/// Key extractor for widget id
fn widget_id_extractor(widget: &WidgetInput) -> &String {
    &widget.id
}

/// Key extractor for app path
fn app_path_extractor(app: &AppInput) -> &String {
    &app.path
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
        Some(ids) if !ids.is_empty() => filter_by_key_set(&widgets, &ids, widget_id_extractor),
        _ => widgets,
    };

    let filtered_apps = match selected_app_paths {
        Some(paths) if !paths.is_empty() => filter_by_key_set(&apps, &paths, app_path_extractor),
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
