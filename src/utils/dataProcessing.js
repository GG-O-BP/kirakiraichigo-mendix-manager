import { invoke } from "@tauri-apps/api/core";

/**
 * Filter Mendix versions using Rust backend
 * @param {Array} versions - Array of MendixVersion objects
 * @param {string|null} searchTerm - Optional search term
 * @param {boolean} onlyValid - Filter only valid versions
 * @returns {Promise<Array>} Filtered and sorted versions
 */
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

/**
 * Filter Mendix apps using Rust backend
 * @param {Array} apps - Array of MendixApp objects
 * @param {string|null} searchTerm - Optional search term
 * @param {string|null} targetVersion - Optional version filter
 * @param {boolean} onlyValid - Filter only valid apps
 * @returns {Promise<Array>} Filtered and sorted apps
 */
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

/**
 * Filter widgets by search term using Rust backend
 * @param {Array} widgets - Array of Widget objects
 * @param {string|null} searchTerm - Search term to filter by
 * @returns {Promise<Array>} Filtered widgets
 */
export async function filterWidgets(widgets, searchTerm = null) {
  return await invoke("filter_widgets", {
    widgets,
    searchTerm: searchTerm && searchTerm.trim() !== "" ? searchTerm : null,
  });
}

/**
 * Filter and sort apps with priority version using Rust backend
 * Combines filtering by search term, sorting by version/date, and priority sorting
 * @param {Array} apps - Array of MendixApp objects
 * @param {string|null} searchTerm - Search term to filter by
 * @param {string|null} priorityVersion - Version to prioritize (matching apps appear first)
 * @returns {Promise<Array>} Filtered and sorted apps with priority
 */
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

/**
 * Initialize property values from widget path using Rust backend
 * @param {string} widgetPath - Path to widget directory
 * @returns {Promise<Object>} Map of property key to default value
 */
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
