import * as R from "ramda";
import { invoke } from "@tauri-apps/api/core";

export const STORAGE_KEYS = {
  SELECTED_APPS: "selectedApps",
  SELECTED_WIDGETS: "kirakiraSelectedWidgets",
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

const VERSION_OPERATIONS = {
  LAUNCH: "launch",
  UNINSTALL: "uninstall",
  DOWNLOAD: "download",
};

export const arrayToSet = (arr) => new Set(arr);

export const createWidget = R.curry((caption, path) => ({
  id: Date.now().toString(),
  caption,
  path,
}));

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

export const invokeHasBuildFailures = async (result) => {
  const failed = R.propOr([], "failed", result);
  return invoke("has_build_failures", { failed });
};

export const createCatastrophicErrorResult = R.curry((error) => ({
  successful: [],
  failed: [
    {
      widget: "All widgets",
      error: error.toString(),
    },
  ],
}));

export const updateProp = R.curry((prop, value, obj) =>
  set(R.lensProp(prop), value, obj),
);

export const createPropertyChangeHandler = R.curry(
  (propertyKey, updateFunction) =>
    R.pipe(R.identity, updateFunction(propertyKey)),
);

export const invokeValidateRequired = async (fields, values) =>
  invoke("validate_required_fields", { requiredFields: fields, values });

export const invokeValidateBuildDeploySelections = async (selectedWidgets, selectedApps) => {
  const result = await invoke("validate_build_deploy_selections", {
    selectedWidgetCount: selectedWidgets.size,
    selectedAppCount: selectedApps.size,
  });
  return result.is_valid ? null : result.error_message;
};

export const hasItems = R.pipe(R.prop("size"), R.gt(R.__, 0));

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

export const wrapAsync = R.curry((errorHandler, asyncFn) => async (...args) => {
  try {
    return await asyncFn(...args);
  } catch (error) {
    errorHandler(error);
    return null;
  }
});

const createVersionLoadingState = R.curry(
  (versionId, operation, isActive) => ({
    versionId,
    operation,
    value: isActive,
    timestamp: Date.now(),
  }),
);

export const updateVersionLoadingStates = R.curry(
  (versionId, operation, isActive, statesMap) =>
    R.pipe(
      R.assoc(
        versionId,
        createVersionLoadingState(versionId, operation, isActive),
      ),
      R.when(() => !isActive, R.dissoc(versionId)),
    )(statesMap),
);

export const getVersionLoadingState = R.curry((statesMap, versionId) => {
  const state = statesMap[versionId];
  const noActiveOperations = { isLaunching: false, isUninstalling: false, isDownloading: false };

  if (!state) return noActiveOperations;

  const isActiveOperation = (operationType) =>
    state.operation === operationType && state.value;

  return {
    isLaunching: isActiveOperation(VERSION_OPERATIONS.LAUNCH),
    isUninstalling: isActiveOperation(VERSION_OPERATIONS.UNINSTALL),
    isDownloading: isActiveOperation(VERSION_OPERATIONS.DOWNLOAD),
  };
});
