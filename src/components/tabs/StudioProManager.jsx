import * as R from "ramda";
import { memo, useMemo } from "react";
import SearchBox from "../common/SearchBox";
import ListItem from "../common/ListItem";
import {
  ListArea,
  MendixVersionListItem,
  MendixAppListItem,
  createSearchFilter,
} from "../common/ListItems";

// ============= Helper Functions =============

// Filter items by search term
const filterBySearch = R.curry((searchTerm, items) =>
  R.filter(createSearchFilter(searchTerm), items),
);

// Create app sorter by version and date
const createAppSorter = R.curry((selectedVersion) => {
  // Check if app version matches selected version
  const versionMatches = R.propEq("version", selectedVersion);

  // Compare by version match
  const compareVersionMatch = R.curry((a, b) =>
    R.cond([
      [() => versionMatches(a) && !versionMatches(b), R.always(-1)],
      [() => !versionMatches(a) && versionMatches(b), R.always(1)],
      [R.T, R.always(0)],
    ])(),
  );

  // Get date value for comparison
  const getDateValue = R.pipe(
    R.prop("last_modified"),
    R.ifElse(R.identity, (dateStr) => new Date(dateStr).getTime(), R.always(0)),
  );

  // Compare by date
  const compareByDate = (a, b) => getDateValue(b) - getDateValue(a);

  // Combined comparator
  return R.comparator((a, b) => {
    const versionCompare = compareVersionMatch(a, b);
    return versionCompare !== 0 ? versionCompare < 0 : compareByDate(a, b) < 0;
  });
});

// Sort and filter apps
const sortAndFilterApps = R.curry((searchTerm, selectedVersion, apps) =>
  R.pipe(
    filterBySearch(searchTerm),
    R.ifElse(
      () => R.isNil(selectedVersion),
      R.sort(
        R.comparator((a, b) => {
          const aDate = a.last_modified
            ? new Date(a.last_modified)
            : new Date(0);
          const bDate = b.last_modified
            ? new Date(b.last_modified)
            : new Date(0);
          return bDate > aDate;
        }),
      ),
      R.sort(createAppSorter(selectedVersion)),
    ),
  )(apps),
);

// Check if app is disabled
const isAppDisabled = R.curry((selectedVersion, app) =>
  R.both(
    () => !R.isNil(selectedVersion),
    () => !R.equals(R.prop("version", app), selectedVersion),
  )(),
);

// ============= Render Functions =============

// Render empty state
const renderEmptyState = R.curry((icon, message) => (
  <div className="loading-indicator">
    <span className="loading-icon">{icon}</span>
    <span>{message}</span>
  </div>
));

// Render list items
const renderListItems = R.curry((handleItemClick, items) =>
  R.map(
    (item) => <ListItem key={item.id} item={item} onClick={handleItemClick} />,
    items,
  ),
);

// Render version list items with strict functional programming
const renderVersionListItems = R.curry(
  (
    handleLaunchStudioPro,
    handleUninstallClick,
    isLoading,
    selectedVersion,
    handleVersionClick,
    versions,
  ) =>
    R.map(
      (version) => (
        <MendixVersionListItem
          key={R.prop("version", version)}
          version={version}
          onLaunch={handleLaunchStudioPro}
          onUninstall={handleUninstallClick}
          isLaunching={isLoading}
          isUninstalling={isLoading}
          isSelected={R.equals(selectedVersion, R.prop("version", version))}
          onClick={() => handleVersionClick(version)}
        />
      ),
      versions,
    ),
);

// Render app list items with strict functional programming
const renderAppListItems = R.curry((selectedVersion, handleItemClick, apps) =>
  R.map(
    (app) => (
      <MendixAppListItem
        key={R.prop("name", app)}
        app={app}
        isDisabled={isAppDisabled(selectedVersion, app)}
        onClick={() => handleItemClick(app)}
      />
    ),
    apps,
  ),
);

// ============= Main Component =============

const StudioProManager = memo(
  ({
    searchTerm,
    setSearchTerm,
    versions,
    filteredVersions,
    selectedVersion,
    handleVersionClick,
    apps,
    listData,
    isLoading,
    handleLaunchStudioPro,
    handleUninstallClick,
    handleItemClick,
  }) => {
    // Memoized sorted and filtered apps
    const sortedAndFilteredMendixApps = useMemo(
      () => sortAndFilterApps(searchTerm, selectedVersion, apps),
      [apps, searchTerm, selectedVersion],
    );

    // Memoized filtered list data
    const filteredListData = useMemo(
      () => filterBySearch(searchTerm, listData),
      [listData, searchTerm],
    );

    return (
      <div className="studio-pro-manager">
        {/* Left Panel - List Items */}
        <div className="list-container">
          <SearchBox
            placeholder="Search items..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <div className="list-area">
            {renderListItems(handleItemClick, filteredListData)}
          </div>
        </div>

        {/* Middle Panel - Installed Versions */}
        <div className="list-container">
          <SearchBox
            placeholder="Search installed versions..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <div className="list-area">
            {R.ifElse(
              R.isEmpty,
              () =>
                renderEmptyState("🍓", "No Mendix Studio Pro versions found"),
              renderVersionListItems(
                handleLaunchStudioPro,
                handleUninstallClick,
                isLoading,
                selectedVersion,
                handleVersionClick,
              ),
            )(filteredVersions)}
          </div>
        </div>

        {/* Right Panel - Mendix Apps */}
        <div className="list-container narrow">
          <SearchBox
            placeholder="Search Mendix apps..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <div className="list-area">
            {R.ifElse(
              R.isEmpty,
              () => renderEmptyState("🍓", "No Mendix apps found"),
              renderAppListItems(selectedVersion, handleItemClick),
            )(sortedAndFilteredMendixApps)}
          </div>
        </div>
      </div>
    );
  },
);

StudioProManager.displayName = "StudioProManager";

export default StudioProManager;
