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

// Sort apps with version priority using Ramda partition and sortWith
const sortAppsWithVersionPriority = R.curry((selectedVersion, apps) => {
  // Convert selectedVersion to string for proper comparison
  const selectedVersionStr = String(selectedVersion);

  // Get date value for comparison
  const getDateValue = R.pipe(
    R.prop("last_modified"),
    R.ifElse(R.identity, (dateStr) => new Date(dateStr).getTime(), R.always(0)),
  );

  // Sort function by date (newer first)
  const sortByDate = R.sortWith([R.descend(getDateValue)]);

  // Version matcher that converts both values to strings for comparison
  const versionMatches = R.pipe(
    R.prop("version"),
    String,
    R.equals(selectedVersionStr),
  );

  // Partition apps into matching and non-matching versions
  const [matchingApps, nonMatchingApps] = R.partition(versionMatches, apps);

  const sortedMatching = sortByDate(matchingApps);
  const sortedNonMatching = sortByDate(nonMatchingApps);

  // Concatenate sorted matching apps first, then sorted non-matching apps
  return R.concat(sortedMatching, sortedNonMatching);
});

// Sort and filter apps using strict functional programming
const sortAndFilterApps = R.curry((searchTerm, selectedVersion, apps) =>
  R.pipe(
    filterBySearch(searchTerm),

    R.ifElse(
      () => R.isNil(selectedVersion),
      R.sortWith([
        R.descend(
          R.pipe(
            R.prop("last_modified"),
            R.ifElse(
              R.identity,
              (dateStr) => new Date(dateStr).getTime(),
              R.always(0),
            ),
          ),
        ),
      ]),
      sortAppsWithVersionPriority(selectedVersion),
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
