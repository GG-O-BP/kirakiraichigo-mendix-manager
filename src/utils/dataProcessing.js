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

export default {
  filterMendixVersions,
  filterMendixApps,
  filterWidgets,
  filterAndSortAppsWithPriority,
  initializePropertyValues,
};
