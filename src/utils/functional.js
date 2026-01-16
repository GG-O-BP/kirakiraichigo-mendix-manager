import * as R from "ramda";

// ============= Pure Data Transformations =============

// Lens definitions for deep property access
export const lensPath = R.lensPath;
export const view = R.view;
export const set = R.set;
export const over = R.over;

// Common lenses
export const idLens = R.lensProp("id");
export const nameLens = R.lensProp("name");
export const versionLens = R.lensProp("version");
export const pathLens = R.lensProp("path");
export const captionLens = R.lensProp("caption");
export const selectedLens = R.lensProp("selected");

// ============= List Operations =============

// Create a list item with given index
export const createListItem = R.curry((index) => ({
  id: `item-${index}`,
  label: `Item ${index + 1}`,
  icon: "🍓",
}));

// Generate list data with given count
export const generateListData = R.pipe(R.range(0), R.map(createListItem));

// ============= Search and Filter =============

// Convert to lowercase for comparison
export const toLower = R.toLower;

// Get searchable text from item
export const getSearchableText = R.pipe(
  R.props(["label", "version", "name", "caption"]),
  R.filter(R.identity),
  R.join(" "),
  toLower,
);

// Get searchable text from widget
export const getWidgetSearchableText = R.pipe(
  R.props(["caption", "path"]),
  R.filter(R.identity),
  R.join(" "),
  toLower,
);

// Create search predicate
export const createSearchPredicate = R.curry((searchTerm, item) =>
  R.pipe(getSearchableText, R.includes(toLower(searchTerm)))(item),
);

// Create widget search predicate
export const createWidgetSearchPredicate = R.curry((searchTerm, widget) =>
  R.pipe(getWidgetSearchableText, R.includes(toLower(searchTerm)))(widget),
);

// Filter by search term
export const filterBySearchTerm = R.curry((searchTerm, items) =>
  R.isEmpty(searchTerm)
    ? items
    : R.filter(createSearchPredicate(searchTerm), items),
);

// Filter widgets by search term
export const filterWidgetsBySearchTerm = R.curry((searchTerm, widgets) =>
  R.isEmpty(searchTerm)
    ? widgets
    : R.filter(createWidgetSearchPredicate(searchTerm), widgets),
);

// ============= Set Operations =============

// Toggle item in set
export const toggleInSet = R.curry((item, set) =>
  R.pipe(
    R.always(new Set(set)),
    R.tap((newSet) => (set.has(item) ? newSet.delete(item) : newSet.add(item))),
  )(),
);

// Convert set to array
export const setToArray = (set) => Array.from(set);

// Convert array to set
export const arrayToSet = (arr) => new Set(arr);

// ============= Date Operations =============

// Format date
export const formatDate = R.pipe(
  (dateStr) => (dateStr ? new Date(dateStr) : null),
  R.ifElse(
    R.identity,
    (date) => date.toLocaleDateString(),
    R.always("Date unknown"),
  ),
);

// ============= Version Operations =============

// Check if version matches
export const versionMatches = R.curry((targetVersion, item) =>
  R.equals(view(versionLens, item), targetVersion),
);

// Sort by version match and date
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

// ============= Widget Operations =============

// Create new widget
export const createWidget = R.curry((caption, path) => ({
  id: Date.now().toString(),
  caption,
  path,
}));

// Transform widget to build request format for Rust backend
export const transformWidgetToBuildRequest = R.applySpec({
  widget_path: R.prop("path"),
  caption: R.prop("caption"),
});

// Transform multiple widgets to build requests
export const transformWidgetsToBuildRequests = R.map(
  transformWidgetToBuildRequest,
);

// Filter widgets by caption
export const filterWidgetsByCaption = R.curry((searchTerm, widgets) =>
  filterWidgetsBySearchTerm(searchTerm, widgets),
);

// Check if widget is selected
export const isWidgetSelected = R.curry((selectedWidgets, widget) =>
  selectedWidgets.has(R.prop("id", widget)),
);

// Toggle widget selection
export const toggleWidgetSelection = R.curry((widget, selectedWidgets) =>
  toggleInSet(R.prop("id", widget), selectedWidgets),
);

// Get selected widgets from list
export const getSelectedWidgets = R.curry((selectedWidgets, widgets) =>
  R.filter(
    R.pipe(R.prop("id"), (id) => selectedWidgets.has(id)),
    widgets,
  ),
);

// Filter items by Set membership (generic)
export const filterBySetMembership = R.curry((set, prop, items) =>
  R.filter(
    R.pipe(R.prop(prop), (value) => set.has(value)),
    items,
  ),
);

// Create filter for selected widgets (using Set)
export const createWidgetFilter = R.curry((selectedWidgets) =>
  filterBySetMembership(selectedWidgets, "id"),
);

// Create filter for selected apps (using Set)
export const createAppFilter = R.curry((selectedApps) =>
  filterBySetMembership(selectedApps, "path"),
);

// Remove widget from list
export const removeWidgetFromList = R.curry((widgetId, widgets) =>
  R.filter(R.pipe(R.prop("id"), R.complement(R.equals(widgetId))), widgets),
);

// ============= App Operations =============

// Filter apps by version
export const filterAppsByVersion = R.curry((versionFilter, apps) =>
  versionFilter === "all"
    ? apps
    : R.filter(versionMatches(versionFilter), apps),
);

// Create version options for dropdown
export const createVersionOptions = R.pipe(
  R.map((version) => ({
    value: view(versionLens, version),
    label: `📦 ${view(versionLens, version)}`,
  })),
  R.prepend({ value: "all", label: "🍓 All Versions" }),
);

// ============= Pagination =============

// Get paginated items
export const getPaginatedItems = R.curry((itemsPerPage, currentPage, items) => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return R.slice(startIndex, endIndex, items);
});

// Check if has more pages
export const hasMorePages = R.curry(
  (itemsPerPage, currentPage, items) =>
    R.length(items) > currentPage * itemsPerPage,
);

// ============= Storage Operations (Rust Backend) =============

import { invoke } from "@tauri-apps/api/core";

// Pure function: Create storage operation result
const createStorageResult = R.curry((success, data, error = null) => ({
  success,
  data,
  error,
}));

// Pure function: Handle storage success
const handleStorageSuccess = R.curry((data) => createStorageResult(true, data));

// Pure function: Handle storage error
const handleStorageError = R.curry((defaultValue, error) => {
  console.error("Storage operation failed:", error);
  return createStorageResult(false, defaultValue, error);
});

// Pure function: Extract data from storage result
const extractStorageData = R.prop("data");

// IO function: Invoke Rust backend save
const invokeSaveToStorage = R.curry((key, data) =>
  invoke("save_to_storage", { key, data }),
);

// IO function: Invoke Rust backend load
const invokeLoadFromStorage = R.curry((key, defaultValue) =>
  invoke("load_from_storage", { key, defaultValue }),
);

// Save to storage (Rust backend)
// Returns Promise<value>
export const saveToStorage = R.curry((key, value) =>
  R.pipe(
    () => invokeSaveToStorage(key, value),
    R.andThen(handleStorageSuccess),
    R.andThen(extractStorageData),
    R.otherwise(R.pipe(handleStorageError(value), extractStorageData)),
  )(),
);

// Load from storage (Rust backend)
// Returns Promise<value>
export const loadFromStorage = R.curry((key, defaultValue) =>
  R.pipe(
    () => invokeLoadFromStorage(key, defaultValue),
    R.andThen(handleStorageSuccess),
    R.andThen(extractStorageData),
    R.otherwise(R.pipe(handleStorageError(defaultValue), extractStorageData)),
  )(),
);

// Synchronous fallback for migration period (uses localStorage)
// These will be deprecated once full migration is complete
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

// Batch storage operations
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

// Clear app state (Rust backend)
export const clearAppState = () =>
  invoke("clear_app_state")
    .then(() => createStorageResult(true, null))
    .catch(
      R.pipe(
        handleStorageError(null),
        R.always(createStorageResult(false, null)),
      ),
    );

// ============= Async Operations =============

// Wrap async function for error handling
export const wrapAsync = R.curry((errorHandler, asyncFn) => async (...args) => {
  try {
    return await asyncFn(...args);
  } catch (error) {
    errorHandler(error);
    return null;
  }
});

// ============= Build Results =============

// Create build result
export const createBuildResult = R.curry((isSuccess, widget, data) =>
  isSuccess
    ? { widget: view(captionLens, widget), apps: data }
    : { widget: view(captionLens, widget), error: data.toString() },
);

// Partition build results
export const partitionBuildResults = R.partition(R.has("apps"));

// Check if build results have any failures
export const hasBuildFailures = R.pipe(
  R.propOr([], "failed"),
  R.complement(R.isEmpty),
);

// Check if build results have any successes
export const hasBuildSuccesses = R.pipe(
  R.propOr([], "successful"),
  R.complement(R.isEmpty),
);

// Create error result for catastrophic failure
export const createCatastrophicErrorResult = R.curry((error) => ({
  successful: [],
  failed: [
    {
      widget: "All widgets",
      error: error.toString(),
    },
  ],
}));

// Extract app paths from app list
export const extractAppPaths = R.map(R.prop("path"));

// Extract app names from app list
export const extractAppNames = R.map(R.prop("name"));

// Create build and deploy parameters for Rust backend
export const createBuildDeployParams = R.curry(
  (widgets, apps, packageManager) => ({
    widgets: transformWidgetsToBuildRequests(widgets),
    appPaths: extractAppPaths(apps),
    appNames: extractAppNames(apps),
    packageManager,
  }),
);

// ============= Property Updates =============

// Update property in object
export const updateProp = R.curry((prop, value, obj) =>
  set(R.lensProp(prop), value, obj),
);

// Update nested property
export const updateNestedProp = R.curry((path, value, obj) =>
  set(lensPath(path), value, obj),
);

// ============= Compose Utility Functions =============

// Filter and paginate
export const filterAndPaginate = R.curry(
  (searchTerm, itemsPerPage, currentPage, items) =>
    R.pipe(
      filterBySearchTerm(searchTerm),
      getPaginatedItems(itemsPerPage, currentPage),
    )(items),
);

// Filter apps by version and search
export const filterAppsByVersionAndSearch = R.curry(
  (versionFilter, searchTerm, apps) =>
    R.pipe(
      filterAppsByVersion(versionFilter),
      filterBySearchTerm(searchTerm),
    )(apps),
);

// ============= Tab Configuration =============

// Create tab configuration
export const createTab = R.curry((id, label, component) => ({
  id,
  label,
  component,
}));

// Find active tab
// Note: R.propEq arg order changed in Ramda 0.29+ to (val, name)
export const findActiveTab = R.curry((activeTabId, tabs) =>
  R.find(R.propEq(activeTabId, "id"), tabs),
);

// ============= Event Handlers =============

// Create event handler that prevents default
export const preventDefaultHandler = R.curry((handler, event) => {
  event.preventDefault();
  event.stopPropagation();
  return handler(event);
});

// ============= Validation =============

// Check if all required fields are filled
export const validateRequired = R.curry((fields, obj) =>
  R.all((field) => !R.isEmpty(R.prop(field, obj)), fields),
);

// Validate widget and app selections for build/deploy
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

// Check if Set is not empty
export const isSetNotEmpty = R.pipe(R.prop("size"), R.gt(R.__, 0));

// Check if Set is empty
export const isSetEmpty = R.pipe(R.prop("size"), R.equals(0));

// Validate that Set is not empty with message
export const validateSetNotEmpty = R.curry((message, set) =>
  isSetEmpty(set) ? message : null,
);

// ============= Widget Property Operations =============

// Recursively extract all properties from a property group with full category path
const extractPropertiesFromGroup = (categoryPath, group) => {
  const groupCaption = R.prop("caption", group);
  const fullPath = categoryPath
    ? (groupCaption ? `${categoryPath} > ${groupCaption}` : categoryPath)
    : (groupCaption || "General");

  const directProperties = R.pipe(
    R.propOr([], "properties"),
    R.map(R.assoc("category", fullPath)),
  )(group);

  const nestedGroups = R.propOr([], "property_groups", group);
  const nestedProperties = R.chain(
    (nestedGroup) => extractPropertiesFromGroup(fullPath, nestedGroup),
    nestedGroups,
  );

  return R.concat(directProperties, nestedProperties);
};

// Parse widget properties from XML definition
export const parseWidgetProperties = R.curry((widgetDefinition) => {
  // Get root-level properties (with "General" category)
  const rootProperties = R.pipe(
    R.propOr([], "properties"),
    R.map(R.assoc("category", "General")),
  )(widgetDefinition);

  // Get all properties from property groups with their full category paths
  const propertyGroups = R.propOr([], "property_groups", widgetDefinition);
  const groupProperties = R.chain(
    (group) => extractPropertiesFromGroup("", group),
    propertyGroups,
  );

  const allProperties = R.concat(rootProperties, groupProperties);

  return R.map(
    R.pipe(
      R.applySpec({
        key: R.prop("key"),
        type: R.prop("property_type"),
        caption: R.prop("caption"),
        description: R.prop("description"),
        required: R.prop("required"),
        defaultValue: R.prop("default_value"),
        options: R.prop("options"),
        category: R.prop("category"),
      }),
      R.reject(R.isNil),
    ),
    allProperties,
  );
});

// Map property type to UI component type
export const mapPropertyTypeToUIType = R.cond([
  [R.equals("string"), R.always("text")],
  [R.equals("boolean"), R.always("checkbox")],
  [R.equals("integer"), R.always("number")],
  [R.equals("decimal"), R.always("number")],
  [R.equals("enumeration"), R.always("select")],
  [R.equals("expression"), R.always("textarea")],
  [R.equals("textTemplate"), R.always("textarea")],
  [R.equals("action"), R.always("select")],
  [R.equals("attribute"), R.always("select")],
  [R.equals("association"), R.always("select")],
  [R.equals("object"), R.always("select")],
  [R.equals("file"), R.always("file")],
  [R.equals("datasource"), R.always("select")],
  [R.equals("icon"), R.always("icon")],
  [R.equals("image"), R.always("image")],
  [R.equals("widgets"), R.always("widgets")],
  [R.T, R.always("text")],
]);

// Get default value for property type
export const getDefaultValueForType = R.cond([
  [R.equals("string"), R.always("")],
  [R.equals("boolean"), R.always(false)],
  [R.equals("integer"), R.always(0)],
  [R.equals("decimal"), R.always(0.0)],
  [R.equals("enumeration"), R.always("")],
  [R.equals("expression"), R.always("")],
  [R.equals("textTemplate"), R.always("")],
  [R.T, R.always("")],
]);

// Create property value object from definition
export const createPropertyValue = R.curry((property) => ({
  key: R.prop("key", property),
  value: R.pipe(
    R.prop("defaultValue"),
    R.when(R.isNil, () => getDefaultValueForType(R.prop("type", property))),
  )(property),
}));

// Initialize property values from widget definition
export const initializePropertyValues = R.pipe(
  parseWidgetProperties,
  R.map(createPropertyValue),
  R.reduce(
    (acc, prop) => R.assoc(R.prop("key", prop), R.prop("value", prop), acc),
    {},
  ),
);

// Validate property value
export const validatePropertyValue = R.curry((property, value) => {
  const type = R.prop("type", property);
  const required = R.prop("required", property);

  // Check if required field is empty
  if (required && (R.isNil(value) || R.isEmpty(String(value)))) {
    return { isValid: false, error: "This field is required" };
  }

  // Type-specific validation
  const typeValidation = R.cond([
    [
      R.equals("integer"),
      () => {
        if (R.isEmpty(String(value))) return { isValid: true, error: null };
        const num = parseInt(value, 10);
        return isNaN(num)
          ? { isValid: false, error: "Must be a valid integer" }
          : { isValid: true, error: null };
      },
    ],
    [
      R.equals("decimal"),
      () => {
        if (R.isEmpty(String(value))) return { isValid: true, error: null };
        const num = parseFloat(value);
        return isNaN(num)
          ? { isValid: false, error: "Must be a valid decimal number" }
          : { isValid: true, error: null };
      },
    ],
    [
      R.equals("enumeration"),
      () => {
        const options = R.prop("options", property);
        return R.isEmpty(String(value)) || R.includes(value, options)
          ? { isValid: true, error: null }
          : { isValid: false, error: "Must be one of the available options" };
      },
    ],
    [R.T, R.always({ isValid: true, error: null })],
  ])(type);

  return typeValidation;
});

// Group properties by category
export const groupPropertiesByCategory = R.pipe(
  R.groupBy(R.propOr("General", "category")),
  R.toPairs,
  R.map(([category, properties]) => ({ category, properties })),
);

// Filter properties by search term
export const filterPropertiesBySearch = R.curry((searchTerm, properties) =>
  R.isEmpty(searchTerm)
    ? properties
    : R.filter(
        R.pipe(
          R.props(["caption", "description", "key"]),
          R.filter(R.identity),
          R.join(" "),
          toLower,
          R.includes(toLower(searchTerm)),
        ),
        properties,
      ),
);

// Create property change handler
export const createPropertyChangeHandler = R.curry(
  (propertyKey, updateFunction) =>
    R.pipe(R.identity, updateFunction(propertyKey)),
);

// ============= Constants =============

// Storage keys mapped to Rust backend
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

// ============= Loading State Management =============

// Create loading state object
export const createLoadingState = R.curry((isLaunching, isUninstalling) => ({
  isLaunching,
  isUninstalling,
  isLoading: isLaunching || isUninstalling,
}));

// Update loading state for specific operation
export const updateLoadingState = R.curry((operation, value, state) =>
  R.cond([
    [R.equals("launch"), () => R.assoc("isLaunching", value, state)],
    [R.equals("uninstall"), () => R.assoc("isUninstalling", value, state)],
    [R.T, R.always(state)],
  ])(operation),
);

// Check if any loading operation is active
export const hasAnyLoadingOperation = R.anyPass([
  R.prop("isLaunching"),
  R.prop("isUninstalling"),
]);

// Check if specific operation is loading
export const isOperationLoading = R.curry((operation, state) =>
  R.cond([
    [R.equals("launch"), R.prop("isLaunching")],
    [R.equals("uninstall"), R.prop("isUninstalling")],
    [R.T, R.always(false)],
  ])(operation)(state),
);

// Create operation state updater
export const createOperationStateUpdater = R.curry((operation, setState) =>
  R.pipe(
    R.curry(updateLoadingState)(operation),
    R.over(R.lensProp("isLoading"), hasAnyLoadingOperation),
    setState,
  ),
);

// Get loading text for operation
export const getLoadingText = R.curry((operation, defaultText) =>
  R.cond([
    [R.equals("launch"), R.always("Launching...")],
    [R.equals("uninstall"), R.always("Uninstalling...")],
    [R.T, R.always(defaultText)],
  ])(operation),
);

// Create version-specific loading state
export const createVersionLoadingState = R.curry(
  (versionId, operation, value) => ({
    versionId,
    operation,
    value,
    timestamp: Date.now(),
  }),
);

// Update version loading states map
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

// Get loading state for specific version - returns object with isLaunching, isUninstalling, isDownloading
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

// Check if version has any loading operation
export const hasVersionLoadingOperation = R.curry((versionId, statesMap) =>
  R.pipe(
    R.prop(versionId),
    R.ifElse(R.identity, R.prop("value"), R.always(false)),
  )(statesMap),
);

// Clear all loading states
export const clearAllLoadingStates = R.always({});

// Filter active loading states
export const filterActiveLoadingStates = R.filter(
  R.pipe(R.prop("value"), R.identity),
);

// ============= Version Operation State Management =============

// Create version operation manager
export const createVersionOperationManager = R.curry((initialState) => ({
  state: initialState || {},

  // Set operation state
  setOperationState: R.curry((versionId, operation, value) =>
    updateVersionLoadingStates(versionId, operation, value),
  ),

  // Get operation state
  getOperationState: R.curry((versionId, operation) =>
    getVersionLoadingState(versionId, operation),
  ),

  // Check if version is busy
  isVersionBusy: R.curry((versionId) => hasVersionLoadingOperation(versionId)),

  // Clear version state
  clearVersionState: R.curry((versionId) => R.dissoc(versionId)),

  // Get all active operations
  getActiveOperations: filterActiveLoadingStates,
}));

// Create state lens for version operations
export const versionOperationLens = R.curry((versionId, operation) =>
  R.lensPath([versionId, operation]),
);

// Update version operation state with lens
export const updateVersionOperationWithLens = R.curry(
  (versionId, operation, value, state) =>
    R.set(versionOperationLens(versionId, operation), value, state),
);

// ============= Enhanced Functional Utilities for LightningCSS Integration =============

// CSS class manipulation utilities
export const createCSSClass = R.curry((baseClass, modifiers) =>
  R.pipe(R.filter(R.identity), R.prepend(baseClass), R.join(" "))(modifiers),
);

// CSS variable utilities
export const createCSSVariables = R.pipe(
  R.toPairs,
  R.map(([key, value]) => `--${key}: ${value}`),
  R.join("; "),
);

// Style object to CSS string converter
export const styleToCSSString = R.pipe(
  R.toPairs,
  R.map(
    ([property, value]) =>
      `${R.replace(/([A-Z])/g, "-$1", property).toLowerCase()}: ${value}`,
  ),
  R.join("; "),
);

// Responsive breakpoint utilities
export const createBreakpointStyles = R.curry((breakpoints, styles) =>
  R.pipe(
    R.toPairs,
    R.map(([breakpoint, breakpointStyles]) => ({
      [`@media (min-width: ${breakpoints[breakpoint]})`]: breakpointStyles,
    })),
    R.mergeAll,
  )(styles),
);

// ============= Advanced State Management Utilities =============

// Immutable state updater with validation
export const createValidatedStateUpdater = R.curry(
  (validator, lens, setState) =>
    R.pipe(
      R.when(R.complement(validator), R.always(R.identity)),
      R.when(validator, (value) => setState(R.set(lens, value))),
    ),
);

// Batch state updates with transaction-like behavior
export const batchStateUpdates = R.curry((updates, setState) =>
  setState(R.pipe(...updates)),
);

// State subscription system
export const createStateSubscription = R.curry((selector, callback, state) =>
  R.pipe(
    selector,
    R.when(R.complement(R.equals(R.pipe(selector)(state))), callback),
  ),
);

// ============= Advanced List and Data Manipulation =============

// Paginated data with metadata
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

// Advanced sorting with multiple criteria
export const createMultiCriteriaSorter = R.curry((criteria) =>
  R.sortWith(
    R.map(({ path, direction = "asc" }) =>
      direction === "asc" ? R.ascend(R.path(path)) : R.descend(R.path(path)),
    )(criteria),
  ),
);

// Data aggregation utilities
export const aggregateData = R.curry((aggregators, data) =>
  R.pipe(R.juxt(R.values(aggregators)), R.zipObj(R.keys(aggregators)))(data),
);

// ============= Enhanced Event Handling =============

// Functional event handler with side effects isolation
export const createEventHandler = R.curry((sideEffects, pureHandler) =>
  R.pipe(pureHandler, R.tap(R.forEach(R.call)))(sideEffects),
);

// Debounced function creator
export const createDebouncedFunction = R.curry((delay, fn) => {
  let timeoutId;
  return R.pipe(
    R.tap(() => clearTimeout(timeoutId)),
    R.tap((args) => {
      timeoutId = setTimeout(() => fn(...args), delay);
    }),
  );
});

// Throttled function creator
export const createThrottledFunction = R.curry((limit, fn) => {
  let inThrottle;
  return R.pipe(
    R.unless(
      () => inThrottle,
      R.tap((args) => {
        fn(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }),
    ),
  );
});

// ============= Form and Validation Utilities =============

// Field validation pipeline
export const createFieldValidator = R.curry((rules) =>
  R.pipe(R.juxt(rules), R.filter(R.identity), R.head),
);

// Form state manager
export const createFormManager = R.curry((initialValues, validators) => ({
  values: initialValues,
  errors: R.map(R.always(null), initialValues),
  touched: R.map(R.always(false), initialValues),
  isValid: R.pipe(R.values, R.all(R.isNil)),
  validateField: R.curry((field, value) => {
    const validator = validators[field];
    return validator ? validator(value) : null;
  }),
  updateField: R.curry((field, value, state) =>
    R.pipe(
      R.assocPath(["values", field], value),
      R.assocPath(["touched", field], true),
      R.assocPath(["errors", field], state.validateField(field, value)),
    )(state),
  ),
}));

// ============= API and Async Utilities =============

// Functional API call wrapper
export const createAPICall = R.curry(
  (errorHandler, successHandler, apiFunction) =>
    R.pipe(apiFunction, R.andThen(successHandler), R.otherwise(errorHandler)),
);

// Resource loading state manager
export const createResourceState = () => ({
  data: null,
  loading: false,
  error: null,
  loaded: false,
});

// Resource state updaters
export const setResourceLoading = R.assoc("loading", true);
export const setResourceSuccess = R.curry((data) =>
  R.pipe(
    R.assoc("data", data),
    R.assoc("loading", false),
    R.assoc("error", null),
    R.assoc("loaded", true),
  ),
);
export const setResourceError = R.curry((error) =>
  R.pipe(
    R.assoc("error", error),
    R.assoc("loading", false),
    R.assoc("loaded", true),
  ),
);

// ============= Widget and Component Utilities =============

// Widget property transformer
export const transformWidgetProperty = R.curry((transformers, property) => {
  const transformer = transformers[property.type] || R.identity;
  return transformer(property);
});

// Component props sanitizer
export const sanitizeProps = R.curry((allowedProps, props) =>
  R.pick(allowedProps, props),
);

// Style merger with precedence
export const mergeStyles = R.reduce(R.mergeDeepRight, {});

// ============= Performance Optimization Utilities =============

// Memoization with custom equality
export const createMemoizer = R.curry((equalityFn, fn) => {
  const cache = new Map();
  return R.pipe(
    R.tap((args) => {
      const key = JSON.stringify(args);
      if (!cache.has(key) || !equalityFn(cache.get(key).args, args)) {
        cache.set(key, { result: fn(...args), args });
      }
    }),
    R.always(cache.get(JSON.stringify(arguments)).result),
  );
});

// Shallow equality checker
export const shallowEqual = R.curry((a, b) =>
  R.and(
    R.equals(R.keys(a).sort(), R.keys(b).sort()),
    R.all(R.identity, R.zipWith(R.equals, R.values(a), R.values(b))),
  ),
);

// Deep equality with custom comparators
export const createDeepEqual = R.curry((comparators, a, b) => {
  const compare = (x, y) => {
    if (R.type(x) !== R.type(y)) return false;
    const comparator = comparators[R.type(x)];
    return comparator ? comparator(x, y) : R.equals(x, y);
  };
  return compare(a, b);
});
