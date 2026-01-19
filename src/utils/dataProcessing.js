// Re-export all data processing utilities for backward compatibility
// New code should import from individual modules in data-processing/

export {
  filterMendixVersions,
  filterMendixApps,
  filterAndSortAppsWithPriority,
  filterAppsBySelectedPaths,
  filterWidgets,
  filterWidgetsBySelectedIds,
  sortWidgetsByOrder,
  removeWidgetById,
  initializePropertyValues,
  countVisiblePropertiesInGroup,
  countVisiblePropertiesInWidgetGroup,
  countAllGroupsVisibleProperties,
  countAllWidgetGroupsVisibleProperties,
  transformPropertiesToSpec,
  countAllSpecGroupsVisibleProperties,
  extractFolderNameFromPath,
} from "./data-processing";
