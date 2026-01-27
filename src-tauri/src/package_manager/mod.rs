mod executor;
mod powershell;
mod strategies;
mod strategy;
pub mod widget_operations;

use executor::execute_package_manager_command;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetInstallInput {
    pub id: String,
    pub caption: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallResult {
    pub widget_id: String,
    pub widget_caption: String,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchInstallSummary {
    pub results: Vec<InstallResult>,
    pub failed_widget_names: Vec<String>,
    pub success_count: usize,
    pub failure_count: usize,
}

fn install_single_widget(widget: &WidgetInstallInput, package_manager: &str) -> InstallResult {
    println!(
        "[Batch Install] Installing dependencies for widget: {}",
        widget.caption
    );

    match execute_package_manager_command(package_manager, "install", &widget.path) {
        Ok(_) => {
            println!(
                "[Batch Install] Successfully installed dependencies for: {}",
                widget.caption
            );
            InstallResult {
                widget_id: widget.id.clone(),
                widget_caption: widget.caption.clone(),
                success: true,
                error: None,
            }
        }
        Err(e) => {
            println!(
                "[Batch Install] Failed to install dependencies for {}: {}",
                widget.caption, e
            );
            InstallResult {
                widget_id: widget.id.clone(),
                widget_caption: widget.caption.clone(),
                success: false,
                error: Some(e),
            }
        }
    }
}

#[tauri::command]
pub fn batch_install_widgets(
    widgets: Vec<WidgetInstallInput>,
    package_manager: String,
    selected_widget_ids: Option<Vec<String>>,
) -> Result<BatchInstallSummary, String> {
    let widgets_to_install = match selected_widget_ids {
        Some(ids) if !ids.is_empty() => {
            let id_set: HashSet<&String> = ids.iter().collect();
            widgets
                .into_iter()
                .filter(|w| id_set.contains(&w.id))
                .collect()
        }
        _ => widgets,
    };

    if widgets_to_install.is_empty() {
        return Err("No widgets to install".to_string());
    }

    println!(
        "[Batch Install] Starting parallel installation for {} widgets using {}",
        widgets_to_install.len(),
        package_manager
    );

    let results: Vec<InstallResult> = widgets_to_install
        .par_iter()
        .map(|widget| install_single_widget(widget, &package_manager))
        .collect();

    let success_count = results.iter().filter(|r| r.success).count();
    let failure_count = results.iter().filter(|r| !r.success).count();
    let failed_widget_names: Vec<String> = results
        .iter()
        .filter(|r| !r.success)
        .map(|r| r.widget_caption.clone())
        .collect();

    println!(
        "[Batch Install] Completed: {} successful, {} failed",
        success_count, failure_count
    );

    Ok(BatchInstallSummary {
        results,
        failed_widget_names,
        success_count,
        failure_count,
    })
}
