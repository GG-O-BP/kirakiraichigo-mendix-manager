import * as R from "ramda";
import { memo, useMemo, useState, useEffect } from "react";
import SearchBox from "../common/SearchBox";
import {
  MendixVersionListItem,
  MendixAppListItem,
  createSearchFilter,
} from "../common/ListItems";
import { getVersionLoadingState } from "../../utils/functional";
import {
  filterMendixVersions,
  filterAndSortAppsWithPriority,
} from "../../utils/dataProcessing";

// ============= Constants =============

const ITEMS_PER_PAGE = 10;

// ============= Legacy Filter Functions (kept for backward compatibility) =============

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

const filterBySearch = R.curry((searchTerm, items) =>
  R.pipe(
    R.when(() => R.isEmpty(searchTerm), R.identity),
    R.unless(
      () => R.isEmpty(searchTerm),
      R.filter(createSearchFilter(searchTerm)),
    ),
  )(items),
);

// ============= Pagination Functions =============

const calculateNextPage = R.pipe(
  R.defaultTo([]),
  R.length,
  R.max(0),
  R.divide(R.__, ITEMS_PER_PAGE),
  Math.floor,
  R.add(1),
  R.max(1),
);

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
            R.pipe(R.gte(R.__, 1), R.and(R.lt(R.__, 100))),
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

// ============= Data Processing Functions =============

const toVersionString = R.pipe(R.defaultTo(""), String, R.trim);

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

// ============= Selection State Functions =============

const isAppDisabled = R.curry((selectedVersion, app) =>
  R.pipe(
    R.always(selectedVersion),
    R.ifElse(
      R.isNil,
      R.always(false),
      R.pipe(
        R.prop("version"), // Get version string from selectedVersion object
        toVersionString,
        (versionStr) =>
          R.pipe(
            R.prop("version"),
            toVersionString,
            R.complement(R.equals)(versionStr),
          )(app),
      ),
    ),
  )(),
);

const isVersionAlreadyInstalled = R.curry((installedVersions, version) =>
  R.pipe(
    R.defaultTo([]),
    R.map(R.pipe(R.prop("version"), toVersionString)),
    R.includes(R.pipe(R.prop("version"), toVersionString)(version)),
  )(installedVersions),
);

const isVersionSelected = R.curry((selectedVersion, version) =>
  R.pipe(
    R.always(selectedVersion),
    R.ifElse(
      R.isNil,
      R.always(false),
      R.pipe(
        R.prop("version"),
        toVersionString,
        R.equals(R.pipe(R.prop("version"), toVersionString)(version)),
      ),
    ),
  )(),
);

// ============= Button State Functions =============

const isDownloadButtonDisabled = R.curry((versions, version) =>
  isVersionAlreadyInstalled(versions, version),
);

// ============= Event Handlers =============

const createVersionClickHandler = R.curry(
  (handleClick, version) => () => handleClick(version),
);

const createAppClickHandler = R.curry(
  (handleClick, app) => () => handleClick(app),
);

const createDownloadHandler = R.curry((handleClick, version) => () => {
  if (!isVersionAlreadyInstalled([], version)) {
    handleClick(version);
  }
});

const createLoadMoreHandler = R.curry((fetchFunction, page) => {
  if (fetchFunction && page > 0) {
    return () => fetchFunction(page);
  }
  return null;
});

// ============= Launch/Uninstall Handlers =============

const createLaunchHandler = R.curry(
  (handleLaunch, version) => () => handleLaunch(version.version),
);

const createUninstallHandler = R.curry(
  (handleUninstall, version) => () => handleUninstall(version),
);

// ============= Render Functions =============

const renderEmptyState = R.curry((message) => (
  <div className="no-content">
    <span className="berry-icon">🍓</span>
    <p>{message}</p>
  </div>
));

const renderVersionBadge = R.curry((badge, badgeClass) =>
  badge ? (
    <span key={badgeClass} className={`version-badge ${badgeClass}`}>
      {badge}
    </span>
  ) : null,
);

const renderVersionBadges = (version) =>
  R.pipe(
    R.juxt([
      R.pipe(
        R.propOr(false, "is_lts"),
        R.ifElse(R.identity, R.always("LTS"), R.always(null)),
      ),
      R.pipe(
        R.propOr(false, "is_mts"),
        R.ifElse(R.identity, R.always("MTS"), R.always(null)),
      ),
      R.pipe(
        R.propOr(false, "is_latest"),
        R.ifElse(R.identity, R.always("LATEST"), R.always(null)),
      ),
    ]),
    R.zipWith(renderVersionBadge, R.__, ["lts", "mts", "latest"]),
    R.filter(R.identity),
  )(version);

const renderCheckbox = R.curry((checked, onChange, label) => (
  <label className="checkbox-label">
    <input
      type="checkbox"
      className="checkbox-input"
      checked={checked}
      onChange={onChange}
    />
    <span className="checkbox-text">{label}</span>
  </label>
));

// ============= List Item Renderers =============

const renderDownloadableVersionItem = R.curry(
  (versions, versionLoadingStates, handleDownload, version) => {
    const isInstalled = isVersionAlreadyInstalled(versions, version);
    const loadingState = getVersionLoadingState(
      versionLoadingStates,
      version.version,
    );

    return (
      <div
        key={`downloadable-${version.version}`}
        className="version-list-item"
      >
        <div className="version-info">
          <span className="version-icon">📦</span>
          <div className="version-details">
            <span className="version-number">{version.version}</span>
            <span className="version-date">{version.release_date}</span>
          </div>
        </div>
        <div className="version-badges-row">{renderVersionBadges(version)}</div>
        {loadingState.isDownloading ? (
          <div className="download-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${loadingState.downloadProgress || 0}%` }}
              />
            </div>
            <span className="progress-text">
              {Math.round(loadingState.downloadProgress || 0)}%
            </span>
          </div>
        ) : (
          <button
            className="install-button"
            onClick={createDownloadHandler(handleDownload, version)}
            disabled={isInstalled}
          >
            {!isInstalled && <span className="button-icon">💫</span>}
            {isInstalled ? "Installed" : "Install"}
          </button>
        )}
      </div>
    );
  },
);

const renderLoadMoreItem = R.curry((fetchFunction, isLoading, totalCount) => {
  if (isLoading) {
    return (
      <div key="loading-more" className="loading-indicator">
        <span className="loading-icon">🍓</span>
        <p>Loading more versions...</p>
      </div>
    );
  }

  // 초기 로드 전이거나 데이터가 없으면 아무것도 표시하지 않음
  if (!fetchFunction && totalCount === 0) {
    return null;
  }

  if (!fetchFunction) {
    return (
      <div
        key="end-of-list"
        className="end-indicator"
        style={{ cursor: "default" }}
      >
        <p>All versions loaded</p>
      </div>
    );
  }

  return (
    <div key="load-more" className="end-indicator" onClick={fetchFunction}>
      <p>Click to load more versions</p>
    </div>
  );
});

const renderVersionListItem = R.curry(
  (
    versionLoadingStates,
    handleLaunch,
    handleUninstall,
    handleVersionClick,
    selectedVersion,
    version,
  ) => (
    <MendixVersionListItem
      key={`installed-${version.version}`}
      version={version}
      onLaunch={handleLaunch}
      onUninstall={handleUninstall}
      isLaunching={
        getVersionLoadingState(versionLoadingStates, version.version)
          .isLaunching
      }
      isUninstalling={
        getVersionLoadingState(versionLoadingStates, version.version)
          .isUninstalling
      }
      isSelected={isVersionSelected(selectedVersion, version)}
      onClick={createVersionClickHandler(handleVersionClick, version)}
    />
  ),
);

const renderAppListItem = R.curry((selectedVersion, handleClick, app) => (
  <MendixAppListItem
    key={`app-${app.name}`}
    app={app}
    isDisabled={isAppDisabled(selectedVersion, app)}
    onClick={createAppClickHandler(handleClick, app)}
  />
));

// ============= List Renderers =============

const renderDownloadableVersionsList = R.curry(
  (
    downloadableVersions,
    filteredVersions,
    installedVersions,
    versionLoadingStates,
    handleDownload,
    isLoading,
    fetchFunction,
  ) => {
    const hasVersions = !R.isEmpty(filteredVersions);
    const loadMoreHandler = createLoadMoreHandler(
      fetchFunction,
      calculateNextPage(downloadableVersions),
    );

    return R.cond([
      [
        R.always(hasVersions),
        R.always([
          ...R.map(
            renderDownloadableVersionItem(
              installedVersions,
              versionLoadingStates,
              handleDownload,
            ),
            filteredVersions,
          ),
          renderLoadMoreItem(loadMoreHandler, isLoading, R.length(downloadableVersions)),
        ]),
      ],
      [R.T, R.always(renderEmptyState("No downloadable versions found"))],
    ])();
  },
);

const renderVersionsList = R.curry(
  (
    versions,
    versionLoadingStates,
    handleLaunch,
    handleUninstall,
    handleVersionClick,
    selectedVersion,
  ) =>
    R.ifElse(
      R.isEmpty,
      () => renderEmptyState("No installed versions found"),
      R.map(
        renderVersionListItem(
          versionLoadingStates,
          handleLaunch,
          handleUninstall,
          handleVersionClick,
          selectedVersion,
        ),
      ),
    )(versions),
);

const renderAppsList = R.curry((apps, selectedVersion, handleClick) =>
  R.ifElse(
    R.isEmpty,
    () => renderEmptyState("No apps found"),
    R.map(renderAppListItem(selectedVersion, handleClick)),
  )(apps),
);

// ============= Search Controls =============

const renderSearchControls = R.curry((config) => (
  <div className="search-controls">
    <SearchBox
      placeholder={config.placeholder}
      value={config.searchTerm}
      onChange={config.setSearchTerm}
    />
    {config.isDownloadablePanel && (
      <>
        <div className="search-row">
          {renderCheckbox(
            config.showOnlyDownloadableVersions,
            (e) => config.setShowOnlyDownloadableVersions(e.target.checked),
            "Only Show Downloadable",
          )}
        </div>
        <div className="version-type-filters">
          {renderCheckbox(
            config.showLTSOnly,
            (e) => config.setShowLTSOnly(e.target.checked),
            "LTS",
          )}
          {renderCheckbox(
            config.showMTSOnly,
            (e) => config.setShowMTSOnly(e.target.checked),
            "MTS",
          )}
          {renderCheckbox(
            config.showBetaOnly,
            (e) => config.setShowBetaOnly(e.target.checked),
            "Beta",
          )}
        </div>
      </>
    )}
  </div>
));

const renderPanel = R.curry((config) => (
  <div key={config.key} className={config.className}>
    {config.searchControls}
    <div className="list-area">{config.content}</div>
  </div>
));

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
    // State for Rust-processed data
    const [filteredVersionsRust, setFilteredVersionsRust] = useState([]);
    const [filteredAppsRust, setFilteredAppsRust] = useState([]);

    // Process versions with Rust backend using Ramda
    useEffect(() => {
      const processVersions = R.tryCatch(
        R.pipeWith(R.andThen, [
          R.always(filterMendixVersions(versions, searchTerm, true)),
          setFilteredVersionsRust,
        ]),
        R.pipe(
          R.tap((error) => console.error("Failed to filter versions:", error)),
          R.always(versions),
          setFilteredVersionsRust,
        ),
      );

      R.when(R.pipe(R.length, R.gt(R.__, 0)), processVersions)(versions || []);
    }, [versions, searchTerm]);

    // Process apps with Rust backend - all logic moved to Rust for performance
    useEffect(() => {
      const processApps = R.tryCatch(
        R.pipeWith(R.andThen, [
          R.always(
            filterAndSortAppsWithPriority(
              apps,
              searchTerm,
              R.path(["version"], selectedVersion),
            ),
          ),
          setFilteredAppsRust,
        ]),
        R.pipe(
          R.tap((error) => console.error("Failed to filter apps:", error)),
          R.always(apps),
          setFilteredAppsRust,
        ),
      );

      R.when(R.pipe(R.length, R.gt(R.__, 0)), processApps)(apps || []);
    }, [apps, searchTerm, selectedVersion]);

    const computedData = useMemo(() => {
      return R.applySpec({
        sortedAndFilteredMendixApps: R.always(filteredAppsRust),
        filteredDownloadableVersions: R.pipe(
          R.always(downloadableVersions),
          filterDownloadableOnly(versions, showOnlyDownloadableVersions),
          filterByVersionType(showLTSOnly, showMTSOnly, showBetaOnly),
          filterBySearch(searchTerm),
        ),
        versionLoadingStates: R.always(versionLoadingStates),
      })();
    }, [
      filteredAppsRust,
      downloadableVersions,
      versions,
      versionLoadingStates,
      showOnlyDownloadableVersions,
      showLTSOnly,
      showMTSOnly,
      showBetaOnly,
      searchTerm,
    ]);

    const panelConfigs = useMemo(
      () => [
        {
          key: "downloadable-versions",
          className: "list-container downloadable-list",
          searchControls: renderSearchControls({
            placeholder: "Search downloadable versions...",
            searchTerm,
            setSearchTerm,
            showOnlyDownloadableVersions,
            setShowOnlyDownloadableVersions,
            showLTSOnly,
            setShowLTSOnly,
            showMTSOnly,
            setShowMTSOnly,
            showBetaOnly,
            setShowBetaOnly,
            isDownloadablePanel: true,
          }),
          content: renderDownloadableVersionsList(
            downloadableVersions,
            computedData.filteredDownloadableVersions,
            versions,
            versionLoadingStates,
            handleDownloadVersion,
            isLoadingDownloadableVersions,
            fetchVersionsFromDatagrid,
          ),
        },
        {
          key: "versions",
          className: "list-container",
          searchControls: renderSearchControls({
            placeholder: "Search installed versions...",
            searchTerm,
            setSearchTerm,
            isDownloadablePanel: false,
          }),
          content: renderVersionsList(
            filteredVersionsRust,
            versionLoadingStates,
            handleLaunchStudioPro,
            handleUninstallClick,
            handleVersionClick,
            selectedVersion,
          ),
        },
        {
          key: "apps",
          className: "list-container",
          searchControls: renderSearchControls({
            placeholder: "Search apps...",
            searchTerm,
            setSearchTerm,
            isDownloadablePanel: false,
          }),
          content: renderAppsList(
            computedData.sortedAndFilteredMendixApps,
            selectedVersion,
            handleItemClick,
          ),
        },
      ],
      [
        searchTerm,
        setSearchTerm,
        computedData,
        versionLoadingStates,
        handleLaunchStudioPro,
        handleUninstallClick,
        handleVersionClick,
        handleItemClick,
        selectedVersion,
        filteredVersionsRust,
        downloadableVersions,
        versions,
        handleDownloadVersion,
        isLoadingDownloadableVersions,
        fetchVersionsFromDatagrid,
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

    return (
      <div className="studio-pro-manager base-manager">
        {R.map(renderPanel, panelConfigs)}
      </div>
    );
  },
);

StudioProManager.displayName = "StudioProManager";

export default StudioProManager;
