import * as R from "ramda";
import { invoke } from "@tauri-apps/api/core";

// Ramda re-exports (used internally)
export const lensPath = R.lensPath;
export const set = R.set;

// Set utilities
export const arrayToSet = (arr) => new Set(arr);

// Widget creation
export const createWidget = R.curry((caption, path) => ({
  id: Date.now().toString(),
  caption,
  path,
}));

// Build/Deploy helpers
const captionLens = R.lensProp("caption");

const transformWidgetToBuildRequest = R.applySpec({
  widget_path: R.prop("path"),
  caption: R.prop("caption"),
});

const transformWidgetsToBuildRequests = R.map(transformWidgetToBuildRequest);

const filterBySetMembership = R.curry((set, prop, items) =>
  R.filter(
    R.pipe(R.prop(prop), (value) => set.has(value)),
    items,
  ),
);

export const createWidgetFilter = R.curry((selectedWidgets) =>
  filterBySetMembership(selectedWidgets, "id"),
);

export const createAppFilter = R.curry((selectedApps) =>
  filterBySetMembership(selectedApps, "path"),
);

const extractAppPaths = R.map(R.prop("path"));
const extractAppNames = R.map(R.prop("name"));

export const createBuildDeployParams = R.curry(
  (widgets, apps, packageManager) => ({
    widgets: transformWidgetsToBuildRequests(widgets),
    appPaths: extractAppPaths(apps),
    appNames: extractAppNames(apps),
    packageManager,
  }),
);

export const hasBuildFailures = R.pipe(
  R.propOr([], "failed"),
  R.complement(R.isEmpty),
);

export const createCatastrophicErrorResult = R.curry((error) => ({
  successful: [],
  failed: [
    {
      widget: "All widgets",
      error: error.toString(),
    },
  ],
}));

// Property utilities
export const updateProp = R.curry((prop, value, obj) =>
  set(R.lensProp(prop), value, obj),
);

export const createPropertyChangeHandler = R.curry(
  (propertyKey, updateFunction) =>
    R.pipe(R.identity, updateFunction(propertyKey)),
);

// Validation utilities
export const validateRequired = R.curry((fields, obj) =>
  R.all((field) => !R.isEmpty(R.prop(field, obj)), fields),
);

export const validateBuildDeploySelections = R.curry(
  (selectedWidgets, selectedApps) =>
    R.cond([
      [
        () => R.equals(0, selectedWidgets.size),
        R.always("Please select at least one widget to build"),
      ],
      [
        () => R.equals(0, selectedApps.size),
        R.always("Please select at least one app to deploy to"),
      ],
      [R.T, R.always(null)],
    ])(),
);

export const isSetNotEmpty = R.pipe(R.prop("size"), R.gt(R.__, 0));

// Storage utilities
const createStorageResult = R.curry((success, data, error = null) => ({
  success,
  data,
  error,
}));

const handleStorageSuccess = R.curry((data) => createStorageResult(true, data));

const handleStorageError = R.curry((defaultValue, error) => {
  console.error("Storage operation failed:", error);
  return createStorageResult(false, defaultValue, error);
});

const extractStorageData = R.prop("data");

const invokeSaveToStorage = R.curry((key, data) =>
  invoke("save_to_storage", { key, data }),
);

const invokeLoadFromStorage = R.curry((key, defaultValue) =>
  invoke("load_from_storage", { key, defaultValue }),
);

export const saveToStorage = R.curry((key, value) =>
  R.pipe(
    () => invokeSaveToStorage(key, value),
    R.andThen(handleStorageSuccess),
    R.andThen(extractStorageData),
    R.otherwise(R.pipe(handleStorageError(value), extractStorageData)),
  )(),
);

export const loadFromStorage = R.curry((key, defaultValue) =>
  R.pipe(
    () => invokeLoadFromStorage(key, defaultValue),
    R.andThen(handleStorageSuccess),
    R.andThen(extractStorageData),
    R.otherwise(R.pipe(handleStorageError(defaultValue), extractStorageData)),
  )(),
);

// Async wrapper
export const wrapAsync = R.curry((errorHandler, asyncFn) => async (...args) => {
  try {
    return await asyncFn(...args);
  } catch (error) {
    errorHandler(error);
    return null;
  }
});

// Version loading state management
const createVersionLoadingState = R.curry(
  (versionId, operation, value) => ({
    versionId,
    operation,
    value,
    timestamp: Date.now(),
  }),
);

export const updateVersionLoadingStates = R.curry(
  (versionId, operation, value, statesMap) =>
    R.pipe(
      R.assoc(
        versionId,
        createVersionLoadingState(versionId, operation, value),
      ),
      R.when(() => !value, R.dissoc(versionId)),
    )(statesMap),
);

export const getVersionLoadingState = R.curry((statesMap, versionId) => {
  const state = statesMap[versionId];
  if (!state) {
    return { isLaunching: false, isUninstalling: false, isDownloading: false };
  }
  return {
    isLaunching: state.operation === "launch" && state.value,
    isUninstalling: state.operation === "uninstall" && state.value,
    isDownloading: state.operation === "download" && state.value,
  };
});

// Constants
export const STORAGE_KEYS = {
  SELECTED_APPS: "selectedApps",
  SELECTED_WIDGETS: "selectedWidgets",
  WIDGETS: "kirakiraWidgets",
  WIDGET_ORDER: "widgetOrder",
  PACKAGE_MANAGER: "packageManagerConfig",
  WIDGET_PROPERTIES: "widgetProperties",
  THEME: "theme",
  LAST_TAB: "lastTab",
  SELECTED_VERSION: "selectedVersion",
};

export const PACKAGE_MANAGERS = ["npm", "yarn", "pnpm", "bun"];

export const ITEMS_PER_PAGE = 20;
