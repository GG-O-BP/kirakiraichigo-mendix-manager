import * as R from "ramda";
import { memo, useMemo, useEffect } from "react";
import SearchBox from "../common/SearchBox";
import ListItem from "../common/ListItem";
import {
  ListArea,
  MendixVersionListItem,
  MendixAppListItem,
  createSearchFilter,
} from "../common/ListItems";
import {
  createLoadingState,
  updateLoadingState,
  hasAnyLoadingOperation,
  isOperationLoading,
  getLoadingText,
  createVersionOperationManager,
  updateVersionOperationWithLens,
  getVersionLoadingState,
} from "../../utils/functional";

// ============= Helper Functions =============

// Create operation state predicates
const isLaunchingOperation = R.equals("launch");
const isUninstallingOperation = R.equals("uninstall");

// Filter items by search term with enhanced composition
const filterBySearch = R.curry((searchTerm, items) =>
  R.pipe(
    R.when(() => R.isEmpty(searchTerm), R.identity),
    R.unless(
      () => R.isEmpty(searchTerm),
      R.filter(createSearchFilter(searchTerm)),
    ),
  )(items),
);

// Enhanced pagination logic with better functional composition and error handling
const ITEMS_PER_PAGE = 10;

// Safe page calculation with validation and error handling
const calculateNextPage = R.pipe(
  R.defaultTo([]),
  R.length,
  R.max(0), // Ensure non-negative count
  R.divide(R.__, ITEMS_PER_PAGE),
  Math.floor,
  R.add(1),
  R.max(1), // Ensure minimum page is 1
);

// Check if more pages are available based on current count and total
const hasMorePages = R.curry((currentCount, totalAvailable) =>
  R.pipe(
    R.always(currentCount),
    R.defaultTo(0),
    R.lt(R.__, totalAvailable || Infinity),
  )(),
);

// Create safe pagination handler with functional composition
const createPaginationHandler = R.curry(
  (downloadableVersions, isLoading, fetchFunction) => {
    if (isLoading) {
      return null;
    }

    return R.pipe(
      R.always(downloadableVersions),
      R.ifElse(
        R.always(false),
        R.identity,
        R.pipe(
          calculateNextPage,
          R.when(
            R.pipe(R.gte(R.__, 1), R.and(R.lt(R.__, 100))), // Validate page range
            (page) => () => {
              if (fetchFunction) {
                return fetchFunction(page);
              }
            },
          ),
          R.defaultTo(() => console.warn("Invalid page calculation")),
        ),
      ),
    )();
  },
);

// Enhanced version string conversion with error handling
const toVersionString = R.pipe(R.defaultTo(""), String, R.trim);

// Enhanced date value extraction with validation
const getDateValue = R.pipe(
  R.prop("last_modified"),
  R.when(R.isNil, R.always(0)),
  R.unless(
    R.isNil,
    R.pipe(
      (dateStr) => new Date(dateStr),
      (date) => date.getTime(),
      R.when(isNaN, R.always(0)),
    ),
  ),
);

// Sort apps with version priority using advanced functional composition
const sortAppsWithVersionPriority = R.curry((selectedVersion, apps) => {
  const selectedVersionStr = toVersionString(selectedVersion);

  // Enhanced version matching with proper validation
  const versionMatches = R.pipe(
    R.prop("version"),
    toVersionString,
    R.equals(selectedVersionStr),
  );

  // Functional sorting composition
  const sortByDate = R.sortWith([R.descend(getDateValue)]);

  // Pure functional partitioning and sorting
  return R.pipe(
    R.partition(versionMatches),
    R.juxt([R.pipe(R.head, sortByDate), R.pipe(R.last, sortByDate)]),
    R.apply(R.concat),
  )(apps);
});

// Enhanced sort and filter apps with comprehensive functional composition
const sortAndFilterApps = R.curry((searchTerm, selectedVersion, apps) =>
  R.pipe(
    filterBySearch(searchTerm),
    R.ifElse(
      () => R.isNil(selectedVersion),
      R.sortWith([R.descend(getDateValue)]),
      sortAppsWithVersionPriority(selectedVersion),
    ),
  )(apps),
);

// Enhanced app disabled check with proper functional composition
const isAppDisabled = R.curry((selectedVersion, app) =>
  R.pipe(
    R.always(selectedVersion),
    R.ifElse(
      R.isNil,
      R.always(false),
      R.pipe(
        toVersionString,
        R.complement(R.equals(R.pipe(R.prop("version"), toVersionString)(app))),
      ),
    ),
  )(),
);

// Check if a version is already installed using functional composition
const isVersionAlreadyInstalled = R.curry((installedVersions, version) =>
  R.pipe(
    R.always(installedVersions),
    R.defaultTo([]),
    R.map(R.pipe(R.prop("version"), toVersionString)),
    R.includes(R.pipe(R.prop("version"), toVersionString)(version)),
  )(),
);

// Filter out installed versions when showOnlyDownloadable is true
const filterDownloadableOnly = R.curry(
  (installedVersions, showOnlyDownloadable, versions) =>
    R.pipe(
      R.defaultTo([]),
      R.ifElse(
        () => showOnlyDownloadable,
        R.filter(R.complement(isVersionAlreadyInstalled(installedVersions))),
        R.identity,
      ),
    )(versions),
);

// Filter by version type (LTS, MTS, Beta) using functional composition
const filterByVersionType = R.curry(
  (showLTSOnly, showMTSOnly, showBetaOnly, versions) =>
    R.pipe(
      R.defaultTo([]),
      R.when(
        () => showLTSOnly || showMTSOnly || showBetaOnly,
        R.filter(
          R.anyPass([
            R.both(() => showLTSOnly, R.propEq(true, "is_lts")),
            R.both(() => showMTSOnly, R.propEq(true, "is_mts")),
            R.both(() => showBetaOnly, R.propEq(true, "is_beta")),
          ]),
        ),
      ),
    )(versions),
);

// ============= Render Functions =============

// Enhanced empty state renderer with functional composition
const renderEmptyState = R.curry((icon, message) => (
  <div className="loading-indicator">
    <span className="loading-icon">{icon}</span>
    <span>{message}</span>
  </div>
));

// Create operation state checker
const createOperationStateChecker = R.curry((operation, loadingStates) =>
  R.pipe(R.always(loadingStates), isOperationLoading(operation)),
);

// Enhanced list items renderer with functional composition
const renderListItems = R.curry((handleItemClick, items) =>
  R.pipe(
    R.map(
      R.applySpec({
        key: R.prop("id"),
        item: R.identity,
        onClick: R.always(handleItemClick),
      }),
    ),
    R.map(({ key, item, onClick }) => (
      <ListItem key={key} item={item} onClick={() => onClick(item)} />
    )),
  )(items),
);

// Enhanced version list items renderer with advanced functional patterns
const renderVersionListItems = R.curry(
  (
    handleLaunchStudioPro,
    handleUninstallClick,
    versionLoadingStates,
    selectedVersion,
    handleVersionClick,
    versions,
  ) =>
    R.pipe(
      R.map(
        R.applySpec({
          key: R.prop("version"),
          version: R.identity,
          onLaunch: R.always(handleLaunchStudioPro),
          onUninstall: R.always(handleUninstallClick),
          isLaunching: R.pipe(R.prop("version"), (versionId) =>
            getVersionLoadingState(versionId, "launch", versionLoadingStates),
          ),
          isUninstalling: R.pipe(R.prop("version"), (versionId) =>
            getVersionLoadingState(
              versionId,
              "uninstall",
              versionLoadingStates,
            ),
          ),
          isSelected: R.pipe(R.prop("version"), R.equals(selectedVersion)),
          onClick: R.pipe(
            R.identity,
            (version) => () => handleVersionClick(version),
          ),
        }),
      ),
      R.map(
        ({
          key,
          version,
          onLaunch,
          onUninstall,
          isLaunching,
          isUninstalling,
          isSelected,
          onClick,
        }) => (
          <MendixVersionListItem
            key={key}
            version={version}
            onLaunch={onLaunch}
            onUninstall={onUninstall}
            isLaunching={isLaunching}
            isUninstalling={isUninstalling}
            isSelected={isSelected}
            onClick={onClick}
          />
        ),
      ),
    )(versions),
);

// Enhanced app list items renderer with functional composition
const renderAppListItems = R.curry((selectedVersion, handleItemClick, apps) =>
  R.pipe(
    R.map(
      R.applySpec({
        key: R.prop("name"),
        app: R.identity,
        isDisabled: isAppDisabled(selectedVersion),
        onClick: R.pipe(R.identity, (app) => () => handleItemClick(app)),
      }),
    ),
    R.map(({ key, app, isDisabled, onClick }) => (
      <MendixAppListItem
        key={key}
        app={app}
        isDisabled={isDisabled}
        onClick={onClick}
      />
    )),
  )(apps),
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
    downloadableVersions,
    isLoadingDownloadableVersions,
    versionLoadingStates,
    handleLaunchStudioPro,
    handleUninstallClick,
    handleItemClick,
    handleDownloadVersion,
    fetchVersionsFromDatagrid,
    showOnlyDownloadableVersions,
    setShowOnlyDownloadableVersions,
    showLTSOnly,
    setShowLTSOnly,
    showMTSOnly,
    setShowMTSOnly,
    showBetaOnly,
    setShowBetaOnly,
  }) => {
    // Enhanced memoized computations with functional composition
    const computedData = useMemo(() => {
      const result = R.applySpec({
        sortedAndFilteredMendixApps: R.pipe(
          R.always(apps),
          sortAndFilterApps(searchTerm, selectedVersion),
        ),
        filteredDownloadableVersions: R.pipe(
          R.always(downloadableVersions),
          filterDownloadableOnly(versions, showOnlyDownloadableVersions),
          filterByVersionType(showLTSOnly, showMTSOnly, showBetaOnly),
          filterBySearch(searchTerm),
        ),
        versionLoadingStates: R.always(versionLoadingStates),
      })();

      return result;
    }, [
      apps,
      searchTerm,
      selectedVersion,
      downloadableVersions,
      versions,
      versionLoadingStates,
      showOnlyDownloadableVersions,
      showLTSOnly,
      showMTSOnly,
      showBetaOnly,
    ]);

    // Enhanced panel configuration with functional composition
    const panelConfigs = useMemo(
      () => [
        {
          key: "downloadable-versions",
          className: "list-container",
          placeholder: "Search downloadable versions...",
          hasCheckbox: true,
          checkboxLabel: "New only",
          checkboxChecked: showOnlyDownloadableVersions,
          checkboxOnChange: setShowOnlyDownloadableVersions,
          content: () => {
            if (!downloadableVersions || downloadableVersions.length === 0) {
              return renderEmptyState("🔄", "Loading downloadable versions...");
            }

            const filteredVersions =
              computedData.filteredDownloadableVersions || [];
            const versionItems = filteredVersions.map((version) => {
              const isAlreadyInstalled = isVersionAlreadyInstalled(
                versions,
                version,
              );
              const isVersionDownloading = getVersionLoadingState(
                version.version,
                "download",
                versionLoadingStates,
              );
              const isButtonDisabled =
                isVersionDownloading || isAlreadyInstalled;

              return (
                <div key={version.version} className="version-list-item">
                  <div className="version-info">
                    <span className="version-icon">📦</span>
                    <div className="version-details">
                      <span className="version-number">
                        {version.version}
                        {version.is_lts && (
                          <span className="version-badge lts">LTS</span>
                        )}
                        {version.is_mts && (
                          <span className="version-badge mts">MTS</span>
                        )}
                        {version.is_latest && (
                          <span className="version-badge">LATEST</span>
                        )}
                        {version.is_beta && (
                          <span className="version-badge">Beta</span>
                        )}
                      </span>
                      {version.release_date && (
                        <span className="version-date">
                          {version.release_date}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="install-button"
                    disabled={isButtonDisabled}
                    onClick={() => {
                      if (handleDownloadVersion && !isAlreadyInstalled) {
                        handleDownloadVersion(version);
                      }
                    }}
                    style={{
                      opacity: isButtonDisabled ? 0.6 : 1,
                      cursor: isButtonDisabled ? "not-allowed" : "pointer",
                    }}
                  >
                    <span className="button-icon">
                      {isVersionDownloading
                        ? "⏳"
                        : isAlreadyInstalled
                          ? "✅"
                          : "📥"}
                    </span>
                    {isVersionDownloading
                      ? "Downloading..."
                      : isAlreadyInstalled
                        ? "Installed"
                        : "Download"}
                  </button>
                </div>
              );
            });

            const loadMoreButton = (
              <div
                key="load-more-btn"
                className="version-list-item"
                style={{
                  cursor: isLoadingDownloadableVersions ? "default" : "pointer",
                  opacity: isLoadingDownloadableVersions ? 0.6 : 1,
                }}
                onClick={() => {
                  const handler = createPaginationHandler(
                    downloadableVersions,
                    isLoadingDownloadableVersions,
                    fetchVersionsFromDatagrid,
                  );
                  if (handler) {
                    handler();
                  }
                }}
              >
                <div className="version-info">
                  <span className="version-icon">
                    {isLoadingDownloadableVersions ? "⏳" : "🔄"}
                  </span>
                  <div className="version-details">
                    <span className="version-number">
                      {isLoadingDownloadableVersions
                        ? "Loading More Versions..."
                        : "📥 Load More Versions"}
                    </span>
                    <span className="version-date">
                      {isLoadingDownloadableVersions
                        ? "Please wait..."
                        : "Click to fetch from Mendix Marketplace"}
                    </span>
                  </div>
                </div>
              </div>
            );

            return [...versionItems, loadMoreButton];
          },
        },
        {
          key: "versions",
          className: "list-container",
          placeholder: "Search installed versions...",
          hasCheckbox: false,
          content: R.pipe(
            R.always(filteredVersions),
            R.defaultTo([]),
            R.ifElse(
              R.isEmpty,
              R.always(
                renderEmptyState("🍓", "No Mendix Studio Pro versions found"),
              ),
              renderVersionListItems(
                handleLaunchStudioPro,
                handleUninstallClick,
                computedData.versionLoadingStates,
                selectedVersion,
                handleVersionClick,
              ),
            ),
          ),
        },
        {
          key: "apps",
          className: "list-container narrow",
          placeholder: "Search Mendix apps...",
          hasCheckbox: false,
          content: R.pipe(
            R.always(computedData.sortedAndFilteredMendixApps),
            R.defaultTo([]),
            R.ifElse(
              R.isEmpty,
              R.always(renderEmptyState("🍓", "No Mendix apps found")),
              renderAppListItems(selectedVersion, handleItemClick),
            ),
          ),
        },
      ],
      [
        computedData,
        filteredVersions,
        versions,
        isLoadingDownloadableVersions,
        handleItemClick,
        handleLaunchStudioPro,
        handleUninstallClick,
        handleDownloadVersion,
        versionLoadingStates,
        selectedVersion,
        handleVersionClick,
        showOnlyDownloadableVersions,
        setShowOnlyDownloadableVersions,
        showLTSOnly,
        setShowLTSOnly,
        showMTSOnly,
        setShowMTSOnly,
        showBetaOnly,
        setShowBetaOnly,
      ],
    );

    // Enhanced panel renderer with functional composition
    const renderPanel = R.curry((config) => {
      return (
        <div key={config.key} className={config.className}>
          <div className="search-controls">
            <div className="search-row">
              <SearchBox
                placeholder={config.placeholder}
                value={searchTerm}
                onChange={setSearchTerm}
              />
              {config.key === "downloadable-versions" && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showOnlyDownloadableVersions}
                    onChange={(e) => {
                      setShowOnlyDownloadableVersions(e.target.checked);
                    }}
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">New only</span>
                </label>
              )}
            </div>
            {config.key === "downloadable-versions" && (
              <div className="version-type-filters">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showLTSOnly}
                    onChange={(e) => {
                      setShowLTSOnly(e.target.checked);
                    }}
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">LTS</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showMTSOnly}
                    onChange={(e) => {
                      setShowMTSOnly(e.target.checked);
                    }}
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">MTS</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showBetaOnly}
                    onChange={(e) => {
                      setShowBetaOnly(e.target.checked);
                    }}
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">Beta</span>
                </label>
              </div>
            )}
          </div>
          <div className="list-area">{config.content()}</div>
        </div>
      );
    });

    return (
      <div className="studio-pro-manager">
        {R.map(renderPanel, panelConfigs)}
      </div>
    );
  },
);

StudioProManager.displayName = "StudioProManager";

export default StudioProManager;
