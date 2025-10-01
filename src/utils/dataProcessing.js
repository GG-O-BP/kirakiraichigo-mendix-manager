import { invoke } from "@tauri-apps/api/core";

// ============= Type Definitions (JSDoc) =============

/**
 * @typedef {Object} SearchFilter
 * @property {string} search_term
 * @property {boolean} case_sensitive
 */

/**
 * @typedef {Object} VersionFilter
 * @property {string|null} target_version
 * @property {boolean} only_valid
 */

/**
 * @typedef {Object} FilterOptions
 * @property {SearchFilter|null} search
 * @property {VersionFilter|null} version
 */

/**
 * @typedef {Object} PaginationOptions
 * @property {number} page
 * @property {number} items_per_page
 */

/**
 * @typedef {Object} PaginatedResult
 * @property {Array} items
 * @property {number} total_items
 * @property {number} total_pages
 * @property {number} current_page
 * @property {boolean} has_next_page
 * @property {boolean} has_previous_page
 */

// ============= Rust Backend Invocation Functions =============

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
 * Paginate Mendix versions using Rust backend
 * @param {Array} versions - Array of MendixVersion objects
 * @param {number} page - Page number (0-indexed)
 * @param {number} itemsPerPage - Items per page
 * @returns {Promise<PaginatedResult>} Paginated result
 */
export async function paginateMendixVersions(versions, page, itemsPerPage) {
  return await invoke("paginate_mendix_versions", {
    versions,
    page,
    itemsPerPage,
  });
}

/**
 * Paginate Mendix apps using Rust backend
 * @param {Array} apps - Array of MendixApp objects
 * @param {number} page - Page number (0-indexed)
 * @param {number} itemsPerPage - Items per page
 * @returns {Promise<PaginatedResult>} Paginated result
 */
export async function paginateMendixApps(apps, page, itemsPerPage) {
  return await invoke("paginate_mendix_apps", {
    apps,
    page,
    itemsPerPage,
  });
}

/**
 * Sort versions by semantic version using Rust backend
 * @param {Array} versions - Array of MendixVersion objects
 * @returns {Promise<Array>} Sorted versions
 */
export async function sortVersionsBySemanticVersion(versions) {
  return await invoke("sort_versions_by_semantic_version", { versions });
}

/**
 * Sort apps by version and date using Rust backend
 * @param {Array} apps - Array of MendixApp objects
 * @returns {Promise<Array>} Sorted apps
 */
export async function sortAppsByVersionAndDate(apps) {
  return await invoke("sort_apps_by_version_and_date", { apps });
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

// ============= Higher-level Composition Functions =============

/**
 * Apply multiple filters and pagination to versions
 * @param {Array} versions - Array of MendixVersion objects
 * @param {Object} options - Filter and pagination options
 * @param {string} options.searchTerm - Search term
 * @param {boolean} options.onlyValid - Only valid items
 * @param {number} options.page - Page number
 * @param {number} options.itemsPerPage - Items per page
 * @returns {Promise<PaginatedResult>} Filtered, sorted, and paginated result
 */
export async function processVersions(versions, options = {}) {
  const {
    searchTerm = null,
    onlyValid = true,
    page = 0,
    itemsPerPage = 20,
  } = options;

  // Filter and sort first
  const filtered = await filterMendixVersions(versions, searchTerm, onlyValid);

  // Then paginate
  return await paginateMendixVersions(filtered, page, itemsPerPage);
}

/**
 * Apply multiple filters and pagination to apps
 * @param {Array} apps - Array of MendixApp objects
 * @param {Object} options - Filter and pagination options
 * @param {string} options.searchTerm - Search term
 * @param {string} options.targetVersion - Target version filter
 * @param {boolean} options.onlyValid - Only valid items
 * @param {number} options.page - Page number
 * @param {number} options.itemsPerPage - Items per page
 * @returns {Promise<PaginatedResult>} Filtered, sorted, and paginated result
 */
export async function processApps(apps, options = {}) {
  const {
    searchTerm = null,
    targetVersion = null,
    onlyValid = true,
    page = 0,
    itemsPerPage = 20,
  } = options;

  // Filter and sort first
  const filtered = await filterMendixApps(
    apps,
    searchTerm,
    targetVersion,
    onlyValid,
  );

  // Then paginate
  return await paginateMendixApps(filtered, page, itemsPerPage);
}

// ============= Legacy Support Functions (for gradual migration) =============

/**
 * Legacy filter function that uses Rust backend
 * @deprecated Use filterMendixVersions instead
 */
export async function filterBySearchTerm(items, searchTerm) {
  if (!searchTerm || searchTerm.trim() === "") {
    return items;
  }

  // Check if items are versions or apps based on properties
  const isVersion = items.length > 0 && "exe_path" in items[0];

  if (isVersion) {
    return await filterMendixVersions(items, searchTerm, false);
  } else {
    return await filterMendixApps(items, searchTerm, null, false);
  }
}

/**
 * Legacy sort function that uses Rust backend
 * @deprecated Use sortVersionsBySemanticVersion or sortAppsByVersionAndDate instead
 */
export async function sortByVersionAndDate(items) {
  // Check if items are versions or apps
  const isVersion = items.length > 0 && "exe_path" in items[0];

  if (isVersion) {
    return await sortVersionsBySemanticVersion(items);
  } else {
    return await sortAppsByVersionAndDate(items);
  }
}

// ============= Utility Functions =============

/**
 * Create search filter object
 * @param {string} searchTerm - Search term
 * @param {boolean} caseSensitive - Case sensitivity
 * @returns {SearchFilter} Search filter object
 */
export function createSearchFilter(searchTerm, caseSensitive = false) {
  return {
    search_term: searchTerm,
    case_sensitive: caseSensitive,
  };
}

/**
 * Create version filter object
 * @param {string|null} targetVersion - Target version
 * @param {boolean} onlyValid - Only valid items
 * @returns {VersionFilter} Version filter object
 */
export function createVersionFilter(targetVersion = null, onlyValid = true) {
  return {
    target_version: targetVersion,
    only_valid: onlyValid,
  };
}

/**
 * Create pagination options object
 * @param {number} page - Page number (0-indexed)
 * @param {number} itemsPerPage - Items per page
 * @returns {PaginationOptions} Pagination options object
 */
export function createPaginationOptions(page = 0, itemsPerPage = 20) {
  return {
    page,
    items_per_page: itemsPerPage,
  };
}

// ============= Export All =============

export default {
  filterMendixVersions,
  filterMendixApps,
  paginateMendixVersions,
  paginateMendixApps,
  sortVersionsBySemanticVersion,
  sortAppsByVersionAndDate,
  processVersions,
  processApps,
  filterBySearchTerm,
  sortByVersionAndDate,
  createSearchFilter,
  createVersionFilter,
  createPaginationOptions,
};
