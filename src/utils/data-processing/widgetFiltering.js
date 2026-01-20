import { invoke } from "@tauri-apps/api/core";

/**
 * Consolidated widget processing pipeline that combines:
 * - Search filtering
 * - ID selection filtering
 * - Custom ordering
 *
 * @param {Array} widgets - Array of widget objects
 * @param {Object} options - Processing options
 * @param {string|null} options.searchTerm - Search term to filter by
 * @param {Array|null} options.selectedIds - Array of IDs to filter by
 * @param {Array|null} options.order - Array of IDs defining custom order
 * @returns {Promise<Array>} Processed widgets
 */
export async function processWidgetsPipeline(
  widgets,
  { searchTerm = null, selectedIds = null, order = null } = {},
) {
  return await invoke("process_widgets_pipeline", {
    params: {
      widgets,
      search_term: searchTerm && searchTerm.trim() !== "" ? searchTerm : null,
      selected_ids: selectedIds,
      order,
    },
  });
}

// ============================================================================
// Legacy functions (deprecated - use processWidgetsPipeline instead)
// ============================================================================

/** @deprecated Use processWidgetsPipeline instead */
export async function filterWidgets(widgets, searchTerm = null) {
  return await invoke("filter_widgets", {
    widgets,
    searchTerm: searchTerm && searchTerm.trim() !== "" ? searchTerm : null,
  });
}

/** @deprecated Use processWidgetsPipeline instead */
export async function filterWidgetsBySelectedIds(widgets, selectedIds) {
  return await invoke("filter_widgets_by_selected_ids", { widgets, selectedIds });
}

/** @deprecated Use processWidgetsPipeline instead */
export async function sortWidgetsByOrder(widgets, order) {
  return await invoke("sort_widgets_by_order", { widgets, order });
}

export async function removeWidgetById(widgets, widgetId) {
  return await invoke("remove_widget_by_id", { widgets, widgetId });
}
