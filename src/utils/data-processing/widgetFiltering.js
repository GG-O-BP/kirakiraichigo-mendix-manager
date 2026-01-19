import { invoke } from "@tauri-apps/api/core";

export async function filterWidgets(widgets, searchTerm = null) {
  return await invoke("filter_widgets", {
    widgets,
    searchTerm: searchTerm && searchTerm.trim() !== "" ? searchTerm : null,
  });
}

export async function filterWidgetsBySelectedIds(widgets, selectedIds) {
  return await invoke("filter_widgets_by_selected_ids", { widgets, selectedIds });
}

export async function sortWidgetsByOrder(widgets, order) {
  return await invoke("sort_widgets_by_order", { widgets, order });
}

export async function removeWidgetById(widgets, widgetId) {
  return await invoke("remove_widget_by_id", { widgets, widgetId });
}
