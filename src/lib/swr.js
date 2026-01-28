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
