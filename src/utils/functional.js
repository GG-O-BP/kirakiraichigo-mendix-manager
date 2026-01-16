import * as R from "ramda";

export const lensPath = R.lensPath;
export const view = R.view;
export const set = R.set;
export const over = R.over;

export const idLens = R.lensProp("id");
export const versionLens = R.lensProp("version");
export const pathLens = R.lensProp("path");
export const captionLens = R.lensProp("caption");

export const createListItem = R.curry((index) => ({
  id: `item-${index}`,
  label: `Item ${index + 1}`,
  icon: "🍓",
}));

export const generateListData = R.pipe(R.range(0), R.map(createListItem));

export const toLower = R.toLower;

export const toggleInSet = R.curry((item, set) =>
  R.pipe(
    R.always(new Set(set)),
    R.tap((newSet) => (set.has(item) ? newSet.delete(item) : newSet.add(item))),
  )(),
);

export const setToArray = (set) => Array.from(set);

export const arrayToSet = (arr) => new Set(arr);

export const formatDate = R.pipe(
  (dateStr) => (dateStr ? new Date(dateStr) : null),
  R.ifElse(
    R.identity,
    (date) => date.toLocaleDateString(),
    R.always("Date unknown"),
  ),
);

export const versionMatches = R.curry((targetVersion, item) =>
  R.equals(view(versionLens, item), targetVersion),
);

export const sortByVersionAndDate = R.curry((selectedVersion, items) => {
  const compareVersionMatch = (a, b) => {
    const aMatches = versionMatches(selectedVersion, a);
    const bMatches = versionMatches(selectedVersion, b);

    if (aMatches && !bMatches) return -1;
    if (!aMatches && bMatches) return 1;
    return 0;
  };

  const compareDate = (a, b) => {
    const aDate = a.last_modified ? new Date(a.last_modified) : new Date(0);
    const bDate = b.last_modified ? new Date(b.last_modified) : new Date(0);
    return bDate - aDate;
  };

  return R.sort(
    (a, b) => compareVersionMatch(a, b) || compareDate(a, b),
    items,
  );
});

export const createWidget = R.curry((caption, path) => ({
  id: Date.now().toString(),
  caption,
  path,
}));

export const transformWidgetToBuildRequest = R.applySpec({
  widget_path: R.prop("path"),
  caption: R.prop("caption"),
});

export const transformWidgetsToBuildRequests = R.map(
  transformWidgetToBuildRequest,
);

export const isWidgetSelected = R.curry((selectedWidgets, widget) =>
  selectedWidgets.has(R.prop("id", widget)),
);

export const toggleWidgetSelection = R.curry((widget, selectedWidgets) =>
  toggleInSet(R.prop("id", widget), selectedWidgets),
);

export const getSelectedWidgets = R.curry((selectedWidgets, widgets) =>
  R.filter(
    R.pipe(R.prop("id"), (id) => selectedWidgets.has(id)),
    widgets,
  ),
);

export const filterBySetMembership = R.curry((set, prop, items) =>
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

export const removeWidgetFromList = R.curry((widgetId, widgets) =>
  R.filter(R.pipe(R.prop("id"), R.complement(R.equals(widgetId))), widgets),
);

export const filterAppsByVersion = R.curry((versionFilter, apps) =>
  versionFilter === "all"
    ? apps
    : R.filter(versionMatches(versionFilter), apps),
);

export const createVersionOptions = R.pipe(
  R.map((version) => ({
    value: view(versionLens, version),
    label: `📦 ${view(versionLens, version)}`,
  })),
  R.prepend({ value: "all", label: "🍓 All Versions" }),
);

export const getPaginatedItems = R.curry((itemsPerPage, currentPage, items) => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return R.slice(startIndex, endIndex, items);
});

export const hasMorePages = R.curry(
  (itemsPerPage, currentPage, items) =>
    R.length(items) > currentPage * itemsPerPage,
);

import { invoke } from "@tauri-apps/api/core";

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

export const saveToStorageSync = R.curry((key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
  return value;
});

export const loadFromStorageSync = R.curry((key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
});

export const saveManyToStorage = R.curry((keyValuePairs) =>
  Promise.all(
    R.map(
      ([key, value]) => saveToStorage(key, value),
      R.toPairs(keyValuePairs),
    ),
  ),
);

export const loadManyFromStorage = R.curry((keyDefaultPairs) =>
  R.pipe(
    R.toPairs,
    R.map(([key, defaultValue]) =>
      loadFromStorage(key, defaultValue).then((data) => [key, data]),
    ),
    (promises) => Promise.all(promises),
    R.andThen(R.fromPairs),
  )(keyDefaultPairs),
);

export const clearAppState = () =>
  invoke("clear_app_state")
    .then(() => createStorageResult(true, null))
    .catch(
      R.pipe(
        handleStorageError(null),
        R.always(createStorageResult(false, null)),
      ),
    );

export const wrapAsync = R.curry((errorHandler, asyncFn) => async (...args) => {
  try {
    return await asyncFn(...args);
  } catch (error) {
    errorHandler(error);
    return null;
  }
});

export const createBuildResult = R.curry((isSuccess, widget, data) =>
  isSuccess
    ? { widget: view(captionLens, widget), apps: data }
    : { widget: view(captionLens, widget), error: data.toString() },
);

export const partitionBuildResults = R.partition(R.has("apps"));

export const hasBuildFailures = R.pipe(
  R.propOr([], "failed"),
  R.complement(R.isEmpty),
);

export const hasBuildSuccesses = R.pipe(
  R.propOr([], "successful"),
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

export const extractAppPaths = R.map(R.prop("path"));

export const extractAppNames = R.map(R.prop("name"));

export const createBuildDeployParams = R.curry(
  (widgets, apps, packageManager) => ({
    widgets: transformWidgetsToBuildRequests(widgets),
    appPaths: extractAppPaths(apps),
    appNames: extractAppNames(apps),
    packageManager,
  }),
);

export const updateProp = R.curry((prop, value, obj) =>
  set(R.lensProp(prop), value, obj),
);

export const updateNestedProp = R.curry((path, value, obj) =>
  set(lensPath(path), value, obj),
);

export const createTab = R.curry((id, label, component) => ({
  id,
  label,
  component,
}));

export const findActiveTab = R.curry((activeTabId, tabs) =>
  R.find(R.propEq(activeTabId, "id"), tabs),
);

export const preventDefaultHandler = R.curry((handler, event) => {
  event.preventDefault();
  event.stopPropagation();
  return handler(event);
});

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

export const isSetEmpty = R.pipe(R.prop("size"), R.equals(0));

export const validateSetNotEmpty = R.curry((message, set) =>
  isSetEmpty(set) ? message : null,
);

export const createPropertyChangeHandler = R.curry(
  (propertyKey, updateFunction) =>
    R.pipe(R.identity, updateFunction(propertyKey)),
);

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

export const createVersionLoadingState = R.curry(
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

export const hasVersionLoadingOperation = R.curry((versionId, statesMap) =>
  R.pipe(
    R.prop(versionId),
    R.ifElse(R.identity, R.prop("value"), R.always(false)),
  )(statesMap),
);

export const clearAllLoadingStates = R.always({});

export const filterActiveLoadingStates = R.filter(
  R.pipe(R.prop("value"), R.identity),
);

export const createPaginatedData = R.curry(
  (itemsPerPage, currentPage, items) => ({
    items: R.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
      items,
    ),
    totalItems: R.length(items),
    currentPage,
    totalPages: Math.ceil(R.length(items) / itemsPerPage),
    hasNextPage: currentPage * itemsPerPage < R.length(items),
    hasPreviousPage: currentPage > 1,
  }),
);

// CSS/Style utilities used by functional components
export const createCSSVariables = R.pipe(
  R.toPairs,
  R.map(([key, value]) => `--${key}: ${value}`),
  R.join("; "),
);

export const sanitizeProps = R.curry((allowedProps, props) =>
  R.pick(allowedProps, props),
);

export const shallowEqual = R.curry((a, b) =>
  R.and(
    R.equals(R.keys(a).sort(), R.keys(b).sort()),
    R.all(R.identity, R.zipWith(R.equals, R.values(a), R.values(b))),
  ),
);
