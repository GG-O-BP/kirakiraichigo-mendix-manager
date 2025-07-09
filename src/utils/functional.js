import * as R from 'ramda';

// ============= Pure Data Transformations =============

// Lens definitions for deep property access
export const lensPath = R.lensPath;
export const view = R.view;
export const set = R.set;
export const over = R.over;

// Common lenses
export const idLens = R.lensProp('id');
export const nameLens = R.lensProp('name');
export const versionLens = R.lensProp('version');
export const pathLens = R.lensProp('path');
export const captionLens = R.lensProp('caption');
export const selectedLens = R.lensProp('selected');

// ============= List Operations =============

// Create a list item with given index
export const createListItem = R.curry((index) => ({
  id: `item-${index}`,
  label: `Item ${index + 1}`,
  icon: '🍓',
}));

// Generate list data with given count
export const generateListData = R.pipe(
  R.range(0),
  R.map(createListItem)
);

// ============= Search and Filter =============

// Convert to lowercase for comparison
export const toLower = R.toLower;

// Get searchable text from item
export const getSearchableText = R.pipe(
  R.props(['label', 'version', 'name', 'caption']),
  R.filter(R.identity),
  R.join(' '),
  toLower
);

// Create search predicate
export const createSearchPredicate = R.curry((searchTerm, item) =>
  R.pipe(
    getSearchableText,
    R.includes(toLower(searchTerm))
  )(item)
);

// Filter by search term
export const filterBySearchTerm = R.curry((searchTerm, items) =>
  R.isEmpty(searchTerm)
    ? items
    : R.filter(createSearchPredicate(searchTerm), items)
);

// ============= Set Operations =============

// Toggle item in set
export const toggleInSet = R.curry((item, set) =>
  set.has(item)
    ? R.tap(() => set.delete(item))(new Set(set))
    : R.tap(() => set.add(item))(new Set(set))
);

// Convert set to array
export const setToArray = (set) => Array.from(set);

// Convert array to set
export const arrayToSet = (arr) => new Set(arr);

// ============= Date Operations =============

// Format date
export const formatDate = R.pipe(
  (dateStr) => dateStr ? new Date(dateStr) : null,
  R.ifElse(
    R.identity,
    (date) => date.toLocaleDateString(),
    R.always('Date unknown')
  )
);

// ============= Version Operations =============

// Check if version matches
export const versionMatches = R.curry((targetVersion, item) =>
  R.equals(view(versionLens, item), targetVersion)
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

  return R.sort((a, b) => compareVersionMatch(a, b) || compareDate(a, b), items);
});

// ============= Widget Operations =============

// Create new widget
export const createWidget = R.curry((caption, path) => ({
  id: Date.now().toString(),
  caption,
  path,
}));

// Filter widgets by caption
export const filterWidgetsByCaption = R.curry((searchTerm, widgets) =>
  filterBySearchTerm(searchTerm, widgets)
);

// ============= App Operations =============

// Filter apps by version
export const filterAppsByVersion = R.curry((versionFilter, apps) =>
  versionFilter === 'all'
    ? apps
    : R.filter(versionMatches(versionFilter), apps)
);

// Create version options for dropdown
export const createVersionOptions = R.pipe(
  R.map(version => ({
    value: view(versionLens, version),
    label: `📦 ${view(versionLens, version)}`,
  })),
  R.prepend({ value: 'all', label: '🍓 All Versions' })
);

// ============= Pagination =============

// Get paginated items
export const getPaginatedItems = R.curry((itemsPerPage, currentPage, items) => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return R.slice(startIndex, endIndex, items);
});

// Check if has more pages
export const hasMorePages = R.curry((itemsPerPage, currentPage, items) =>
  R.length(items) > currentPage * itemsPerPage
);

// ============= Local Storage Operations =============

// Save to localStorage
export const saveToStorage = R.curry((key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
  return value;
});

// Load from localStorage
export const loadFromStorage = R.curry((key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
});

// ============= Async Operations =============

// Wrap async function for error handling
export const wrapAsync = R.curry((errorHandler, asyncFn) =>
  async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      errorHandler(error);
      return null;
    }
  }
);

// ============= Build Results =============

// Create build result
export const createBuildResult = R.curry((isSuccess, widget, data) =>
  isSuccess
    ? { widget: view(captionLens, widget), apps: data }
    : { widget: view(captionLens, widget), error: data.toString() }
);

// Partition build results
export const partitionBuildResults = R.partition(R.has('apps'));

// ============= Property Updates =============

// Update property in object
export const updateProp = R.curry((prop, value, obj) =>
  set(R.lensProp(prop), value, obj)
);

// Update nested property
export const updateNestedProp = R.curry((path, value, obj) =>
  set(lensPath(path), value, obj)
);

// ============= Compose Utility Functions =============

// Filter and paginate
export const filterAndPaginate = R.curry((searchTerm, itemsPerPage, currentPage, items) =>
  R.pipe(
    filterBySearchTerm(searchTerm),
    getPaginatedItems(itemsPerPage, currentPage)
  )(items)
);

// Filter apps by version and search
export const filterAppsByVersionAndSearch = R.curry((versionFilter, searchTerm, apps) =>
  R.pipe(
    filterAppsByVersion(versionFilter),
    filterBySearchTerm(searchTerm)
  )(apps)
);

// ============= Tab Configuration =============

// Create tab configuration
export const createTab = R.curry((id, label, component) => ({
  id,
  label,
  component,
}));

// Find active tab
export const findActiveTab = R.curry((activeTabId, tabs) =>
  R.find(R.propEq('id', activeTabId), tabs)
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
  R.all(field => !R.isEmpty(R.prop(field, obj)), fields)
);

// ============= Constants =============

export const STORAGE_KEYS = {
  SELECTED_APPS: 'kirakiraSelectedApps',
  SELECTED_WIDGETS: 'kirakiraSelectedWidgets',
  WIDGETS: 'kirakiraWidgets',
  PACKAGE_MANAGER: 'kirakiraPackageManager',
};

export const PACKAGE_MANAGERS = ['npm', 'yarn', 'pnpm', 'bun'];

export const ITEMS_PER_PAGE = 20;
