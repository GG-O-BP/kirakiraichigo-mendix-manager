use super::types::{AppInput, WidgetBuildRequest, WidgetInput};

pub fn transform_widget_to_build_request(widget: &WidgetInput) -> WidgetBuildRequest {
    WidgetBuildRequest {
        widget_path: widget.path.clone(),
        caption: widget.caption.clone(),
    }
}

pub fn transform_widgets_to_build_requests(widgets: &[WidgetInput]) -> Vec<WidgetBuildRequest> {
    widgets
        .iter()
        .map(transform_widget_to_build_request)
        .collect()
}

pub fn extract_app_paths(apps: &[AppInput]) -> Vec<String> {
    apps.iter().map(|app| app.path.clone()).collect()
}

pub fn extract_app_names(apps: &[AppInput]) -> Vec<String> {
    apps.iter().map(|app| app.name.clone()).collect()
}

/// Key extractor for widget id
pub fn widget_id_extractor(widget: &WidgetInput) -> &String {
    &widget.id
}

/// Key extractor for app path
pub fn app_path_extractor(app: &AppInput) -> &String {
    &app.path
}
