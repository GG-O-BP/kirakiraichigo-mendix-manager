import * as R from "ramda";
import { SWRConfig } from "swr";

export const SWR_KEYS = {
  INSTALLED_VERSIONS: "installed-versions",
  DOWNLOADABLE_VERSIONS: "downloadable-versions",
  APPS: "apps",
  WIDGETS: "widgets",
  WIDGET_DATA: (widgetId) => ["widget-data", widgetId],
  THEME_METADATA: (themeName) => ["theme-metadata", themeName],
  DIST_EXISTS: (widgetPath) => ["dist-exists", widgetPath],
  SELECTION: (selectionType) => ["selection", selectionType],
  FILTERED_DOWNLOADABLE: (deps) => ["filtered-downloadable", JSON.stringify(deps)],
  FILTERED_INSTALLED: (deps) => ["filtered-installed", JSON.stringify(deps)],
  FILTERED_APPS: (deps) => ["filtered-apps", JSON.stringify(deps)],
  PROPERTY_VISIBILITY: (widgetId, inputHash) => ["property-visibility", widgetId, inputHash],
  UNINSTALL_STUDIO_PRO: "uninstall-studio-pro",
  DOWNLOAD_VERSION: "download-version",
  LAUNCH_STUDIO_PRO: "launch-studio-pro",
  WIDGET_PREVIEW_BUILD: "widget-preview-build",
  WIDGET_PREVIEW_RUN: "widget-preview-run",
  PACKAGE_MANAGER: "package-manager",
  UNINSTALL_MODAL_APPS: "uninstall-modal-apps",
  TOGGLE_SELECTION: (selectionType) => `toggle-selection-${selectionType}`,
  REMOVE_SELECTION: (selectionType) => `remove-selection-${selectionType}`,
};

export const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  shouldRetryOnError: false,
  dedupingInterval: 2000,
  keepPreviousData: true,
  onError: R.curry((error, key) => {
    console.error(`SWR Error [${key}]:`, error);
  }),
};

export { SWRConfig };
