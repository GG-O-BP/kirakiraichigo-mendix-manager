import { invoke } from "@tauri-apps/api/core";

/**
 * Consolidated app processing pipeline that combines:
 * - Validity filtering
 * - Version filtering
 * - Search filtering
 * - Path selection filtering
 * - Priority version sorting
 *
 * @param {Array} apps - Array of app objects
 * @param {Object} options - Processing options
 * @param {string|null} options.searchTerm - Search term to filter by
 * @param {string|null} options.targetVersion - Exact version to filter by
 * @param {Array|null} options.selectedPaths - Array of paths to filter by
 * @param {string|null} options.priorityVersion - Version to prioritize (move to top)
 * @param {boolean} options.onlyValid - Filter only valid apps (default: true)
 * @returns {Promise<Array>} Processed apps
 */
export async function processAppsPipeline(
  apps,
  {
    searchTerm = null,
    targetVersion = null,
    selectedPaths = null,
    priorityVersion = null,
    onlyValid = true,
  } = {},
) {
  return await invoke("process_apps_pipeline", {
    params: {
      apps,
      search_term: searchTerm && searchTerm.trim() !== "" ? searchTerm : null,
      target_version: targetVersion,
      selected_paths: selectedPaths,
      priority_version: priorityVersion,
      only_valid: onlyValid,
    },
  });
}

// ============================================================================
// Legacy functions (deprecated - use processAppsPipeline instead)
// ============================================================================

/** @deprecated Use processAppsPipeline instead */
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

/** @deprecated Use processAppsPipeline instead */
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

/** @deprecated Use processAppsPipeline instead */
export async function filterAppsBySelectedPaths(apps, selectedPaths) {
  return await invoke("filter_apps_by_selected_paths", { apps, selectedPaths });
}
