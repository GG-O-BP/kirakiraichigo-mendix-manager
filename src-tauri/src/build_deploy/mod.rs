pub mod transform;
pub mod types;

use crate::data_processing::filter_by_key_set;
use crate::package_manager::widget_operations::install_and_build_widget;
use crate::utils::copy_widget_to_apps as copy_widget_to_apps_util;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};

pub use types::{
    AppDeployResult, AppInput, BuildDeployResult, FailedDeployment, SuccessfulDeployment,
    WidgetBuildRequest, WidgetInput,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidateAndBuildDeployResponse {
    pub validation_error: Option<String>,
    pub results: Option<BuildDeployResult>,
    pub has_failures: bool,
}

pub use transform::{app_path_extractor, transform_widgets_to_build_requests, widget_id_extractor};

async fn process_widgets(
    widgets: Vec<WidgetBuildRequest>,
    apps: Vec<AppInput>,
    package_manager: Option<String>,
    log_prefix: &str,
) -> Result<BuildDeployResult, String> {
    println!(
        "[{}] Starting for {} widgets to {} apps",
        log_prefix,
        widgets.len(),
        apps.len()
    );

    let results: Vec<Result<SuccessfulDeployment, FailedDeployment>> = widgets
        .into_iter()
        .map(|widget| process_single_widget(widget, &apps, package_manager.as_deref(), log_prefix))
        .collect();

    let (successful, failed): (Vec<_>, Vec<_>) = results.into_iter().partition(Result::is_ok);
    let successful: Vec<_> = successful.into_iter().filter_map(Result::ok).collect();
    let failed: Vec<_> = failed.into_iter().filter_map(Result::err).collect();

    println!(
        "[{}] Completed: {} successful, {} failed",
        log_prefix,
        successful.len(),
        failed.len()
    );

    Ok(BuildDeployResult { successful, failed })
}

fn process_single_widget(
    widget: WidgetBuildRequest,
    apps: &[AppInput],
    package_manager: Option<&str>,
    log_prefix: &str,
) -> Result<SuccessfulDeployment, FailedDeployment> {
    let widget_caption = widget.caption.clone();
    let widget_path = widget.widget_path.clone();

    println!("[{}] Processing widget: {}", log_prefix, widget_caption);

    if let Some(pm) = package_manager {
        if let Err(e) = install_and_build_widget(&widget_path, pm) {
            return Err(FailedDeployment {
                widget: widget_caption,
                error: e,
            });
        }
    }

    println!(
        "[{}] Deploying {} to {} apps in parallel",
        log_prefix,
        widget_caption,
        apps.len()
    );

    let deploy_results: Vec<AppDeployResult> = apps
        .par_iter()
        .map(|app| {
            println!("[{}] Deploying {} to {}", log_prefix, widget_caption, app.path);

            let result = copy_widget_to_apps_util(widget_path.clone(), vec![app.path.clone()]);

            match &result {
                Ok(_) => println!(
                    "[{}] Successfully deployed {} to {}",
                    log_prefix, widget_caption, app.path
                ),
                Err(e) => println!(
                    "[{}] Failed to deploy {} to {}: {}",
                    log_prefix, widget_caption, app.path, e
                ),
            }

            AppDeployResult {
                app_name: app.name.clone(),
                result,
            }
        })
        .collect();

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

fn filter_selections(
    widgets: Vec<WidgetInput>,
    apps: Vec<AppInput>,
    selected_widget_ids: Option<Vec<String>>,
    selected_app_paths: Option<Vec<String>>,
) -> (Vec<WidgetBuildRequest>, Vec<AppInput>) {
    let filtered_widgets = match selected_widget_ids {
        Some(ids) if !ids.is_empty() => filter_by_key_set(&widgets, &ids, widget_id_extractor),
        _ => widgets,
    };

    let filtered_apps = match selected_app_paths {
        Some(paths) if !paths.is_empty() => filter_by_key_set(&apps, &paths, app_path_extractor),
        _ => apps,
    };

    (transform_widgets_to_build_requests(&filtered_widgets), filtered_apps)
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

fn validate_selections(widget_count: usize, app_count: usize) -> Option<String> {
    if widget_count == 0 {
        return Some("Please select at least one widget to build".to_string());
    }
    if app_count == 0 {
        return Some("Please select at least one app to deploy to".to_string());
    }
    None
}

fn has_any_failures(results: &BuildDeployResult) -> bool {
    !results.failed.is_empty()
}

#[tauri::command]
pub async fn validate_and_build_deploy(
    widgets: Vec<WidgetInput>,
    apps: Vec<AppInput>,
    package_manager: String,
    selected_widget_ids: Option<Vec<String>>,
    selected_app_paths: Option<Vec<String>>,
) -> Result<ValidateAndBuildDeployResponse, String> {
    let widget_count = selected_widget_ids
        .as_ref()
        .map(|ids| ids.len())
        .unwrap_or(widgets.len());
    let app_count = selected_app_paths
        .as_ref()
        .map(|paths| paths.len())
        .unwrap_or(apps.len());

    if let Some(error) = validate_selections(widget_count, app_count) {
        return Ok(ValidateAndBuildDeployResponse {
            validation_error: Some(error),
            results: None,
            has_failures: false,
        });
    }

    let (widget_requests, filtered_apps) = filter_selections(
        widgets,
        apps,
        selected_widget_ids,
        selected_app_paths,
    );

    let results = process_widgets(
        widget_requests,
        filtered_apps,
        Some(package_manager),
        "Build & Deploy",
    )
    .await?;

    let has_failures = has_any_failures(&results);

    Ok(ValidateAndBuildDeployResponse {
        validation_error: None,
        results: Some(results),
        has_failures,
    })
}

#[tauri::command]
pub async fn validate_and_deploy_only(
    widgets: Vec<WidgetInput>,
    apps: Vec<AppInput>,
    selected_widget_ids: Option<Vec<String>>,
    selected_app_paths: Option<Vec<String>>,
) -> Result<ValidateAndBuildDeployResponse, String> {
    let widget_count = selected_widget_ids
        .as_ref()
        .map(|ids| ids.len())
        .unwrap_or(widgets.len());
    let app_count = selected_app_paths
        .as_ref()
        .map(|paths| paths.len())
        .unwrap_or(apps.len());

    if let Some(error) = validate_selections(widget_count, app_count) {
        return Ok(ValidateAndBuildDeployResponse {
            validation_error: Some(error),
            results: None,
            has_failures: false,
        });
    }

    let (widget_requests, filtered_apps) = filter_selections(
        widgets,
        apps,
        selected_widget_ids,
        selected_app_paths,
    );

    let results = process_widgets(
        widget_requests,
        filtered_apps,
        None,
        "Deploy Only",
    )
    .await?;

    let has_failures = has_any_failures(&results);

    Ok(ValidateAndBuildDeployResponse {
        validation_error: None,
        results: Some(results),
        has_failures,
    })
}

#[tauri::command]
pub fn check_multiple_dist_exists(widget_paths: Vec<String>) -> Vec<bool> {
    use std::path::Path;
    widget_paths
        .iter()
        .map(|path| Path::new(path).join("dist").exists())
        .collect()
}
