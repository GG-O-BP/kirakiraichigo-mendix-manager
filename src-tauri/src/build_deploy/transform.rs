use super::types::{AppInput, WidgetBuildRequest, WidgetInput};

fn to_build_request(widget: &WidgetInput) -> WidgetBuildRequest {
    WidgetBuildRequest {
        widget_path: widget.path.clone(),
        caption: widget.caption.clone(),
    }
}

pub fn transform_widgets_to_build_requests(widgets: &[WidgetInput]) -> Vec<WidgetBuildRequest> {
    widgets.iter().map(to_build_request).collect()
}

pub fn widget_id_extractor(widget: &WidgetInput) -> &String {
    &widget.id
}

pub fn app_path_extractor(app: &AppInput) -> &String {
    &app.path
}
