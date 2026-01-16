import { invoke } from "@tauri-apps/api/core";

export async function filterMendixVersions(
  versions,
  searchTerm = null,
  onlyValid = true,
) {
  return await invoke("filter_mendix_versions", {
    versions,
    searchTerm,
    onlyValid,
  });
}

export async function filterMendixApps(
  apps,
  searchTerm = null,
  targetVersion = null,
  onlyValid = true,
) {
  return await invoke("filter_mendix_apps", {
    apps,
    searchTerm,
    targetVersion,
    onlyValid,
  });
}

export async function filterWidgets(widgets, searchTerm = null) {
  return await invoke("filter_widgets", {
    widgets,
    searchTerm: searchTerm && searchTerm.trim() !== "" ? searchTerm : null,
  });
}

export async function filterAndSortAppsWithPriority(
  apps,
  searchTerm = null,
  priorityVersion = null,
) {
  return await invoke("filter_and_sort_apps_with_priority", {
    apps,
    searchTerm: searchTerm && searchTerm.trim() !== "" ? searchTerm : null,
    priorityVersion,
  });
}

export async function initializePropertyValues(widgetPath) {
  return await invoke("initialize_property_values", { widgetPath });
}

// Widget selection filtering
export async function filterWidgetsBySelectedIds(widgets, selectedIds) {
  return await invoke("filter_widgets_by_selected_ids", { widgets, selectedIds });
}

// App selection filtering
export async function filterAppsBySelectedPaths(apps, selectedPaths) {
  return await invoke("filter_apps_by_selected_paths", { apps, selectedPaths });
}

// Widget ordering
export async function sortWidgetsByOrder(widgets, order) {
  return await invoke("sort_widgets_by_order", { widgets, order });
}

// Widget removal
export async function removeWidgetById(widgets, widgetId) {
  return await invoke("remove_widget_by_id", { widgets, widgetId });
}

// Property count calculation
export async function countVisiblePropertiesInGroup(group, visibleKeys = null) {
  return await invoke("count_visible_properties_in_group", { group, visibleKeys });
}

// Property count calculation for WidgetPropertyGroup (original XML parsed format)
export async function countVisiblePropertiesInWidgetGroup(group, visibleKeys = null) {
  return await invoke("count_visible_properties_in_widget_group", { group, visibleKeys });
}

// Path utility
export async function extractFolderNameFromPath(path) {
  return await invoke("extract_folder_name_from_path", { path });
}

// Batch property count - returns array of { group_path, count }
export async function countAllGroupsVisibleProperties(propertyGroups, visibleKeys = null) {
  return await invoke("count_all_groups_visible_properties", { propertyGroups, visibleKeys });
}

// Batch property count for WidgetPropertyGroup (from parse_widget_properties)
export async function countAllWidgetGroupsVisibleProperties(propertyGroups, visibleKeys = null) {
  return await invoke("count_all_widget_groups_visible_properties", { propertyGroups, visibleKeys });
}

export default {
  filterMendixVersions,
  filterMendixApps,
  filterWidgets,
  filterAndSortAppsWithPriority,
  initializePropertyValues,
  filterWidgetsBySelectedIds,
  filterAppsBySelectedPaths,
  sortWidgetsByOrder,
  removeWidgetById,
  countVisiblePropertiesInGroup,
  countVisiblePropertiesInWidgetGroup,
  extractFolderNameFromPath,
  countAllGroupsVisibleProperties,
  countAllWidgetGroupsVisibleProperties,
};
