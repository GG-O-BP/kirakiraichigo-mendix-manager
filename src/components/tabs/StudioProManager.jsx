import * as R from "ramda";
import { memo, useMemo } from "react";
import SearchBox from "../common/SearchBox";
import {
  MendixVersionListItem,
  MendixAppListItem,
  createSearchFilter,
} from "../common/ListItems";
import { getVersionLoadingState } from "../../utils/functional";

// ============= Constants =============

const ITEMS_PER_PAGE = 10;

// ============= Filter & Search Functions =============

const filterBySearch = R.curry((searchTerm, items) =>
  R.pipe(
    R.when(() => R.isEmpty(searchTerm), R.identity),
    R.unless(
      () => R.isEmpty(searchTerm),
      R.filter(createSearchFilter(searchTerm)),
    ),
  )(items),
);

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

const sortAppsWithVersionPriority = R.curry((selectedVersion, apps) => {
  const selectedVersionStr = toVersionString(selectedVersion);

  const versionMatches = R.pipe(
    R.prop("version"),
    toVersionString,
    R.equals(selectedVersionStr),
  );

  const sortByDate = R.sortWith([R.descend(getDateValue)]);

  return R.pipe(
    R.partition(versionMatches),
    R.juxt([R.pipe(R.head, sortByDate), R.pipe(R.last, sortByDate)]),
    R.apply(R.concat),
  )(apps);
});

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

// ============= Selection State Functions =============

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

const isVersionAlreadyInstalled = R.curry((installedVersions, version) =>
  R.pipe(
    R.always(installedVersions),
    R.defaultTo([]),
    R.map(R.pipe(R.prop("version"), toVersionString)),
    R.includes(R.pipe(R.prop("version"), toVersionString)(version)),
  )(),
);

const isVersionSelected = R.curry((selectedVersion, version) =>
  R.pipe(R.prop("version"), R.equals(selectedVersion))(version),
);

// ============= Button State Functions =============

const isDownloadButtonDisabled = R.curry(
  (isVersionDownloading, isAlreadyInstalled) =>
    R.or(isVersionDownloading, isAlreadyInstalled),
);

// ============= Event Handlers =============

const createVersionClickHandler = R.curry(
  (handleVersionClick, version) => () => handleVersionClick(version),
);

const createAppClickHandler = R.curry(
  (handleItemClick, app) => () => handleItemClick(app),
);

const createDownloadHandler = R.curry(
  (handleDownloadVersion, isAlreadyInstalled, version) => () => {
    if (handleDownloadVersion && !isAlreadyInstalled) {
      handleDownloadVersion(version);
    }
  },
);

const createLoadMoreHandler = R.curry(
  (
    downloadableVersions,
    isLoadingDownloadableVersions,
    fetchVersionsFromDatagrid,
  ) =>
    () => {
      const handler = createPaginationHandler(
        downloadableVersions,
        isLoadingDownloadableVersions,
        fetchVersionsFromDatagrid,
      );
      if (handler) {
        handler();
      }
    },
);

const createLaunchHandler = R.curry(
  (handleLaunchStudioPro, version) => () => handleLaunchStudioPro(version),
);

const createUninstallHandler = R.curry(
  (handleUninstallClick, version) => () => handleUninstallClick(version),
);

// ============= Render Functions =============

const renderEmptyState = R.curry((icon, message) => (
  <div className="loading-indicator">
    <span className="loading-icon">{icon}</span>
    <span>{message}</span>
  </div>
));

const renderVersionBadge = R.curry((type, label) => (
  <span className={`version-badge ${type}`}>{label}</span>
));

const renderVersionBadges = (version) => [
  ...(version.is_lts ? [renderVersionBadge("lts", "LTS")] : []),
  ...(version.is_mts ? [renderVersionBadge("mts", "MTS")] : []),
  ...(version.is_latest ? [renderVersionBadge("", "LATEST")] : []),
  ...(version.is_beta ? [renderVersionBadge("", "Beta")] : []),
];

const renderCheckbox = R.curry((label, checked, onChange, className = "") => (
  <label className={`checkbox-label ${className}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="checkbox-input"
    />
    <span className="checkbox-text">{label}</span>
  </label>
));

// ============= List Item Renderers =============

const renderDownloadableVersionItem = R.curry(
  (versions, versionLoadingStates, handleDownloadVersion, version) => {
    const isAlreadyInstalled = isVersionAlreadyInstalled(versions, version);
    const isVersionDownloading = getVersionLoadingState(
      version.version,
      "download",
      versionLoadingStates,
    );
    const isButtonDisabled = isDownloadButtonDisabled(
      isVersionDownloading,
      isAlreadyInstalled,
    );

    return (
      <div key={version.version} className="version-list-item">
        <div className="version-info">
          <span className="version-icon">📦</span>
          <div className="version-details">
            <span className="version-number">
              {version.version}
              {renderVersionBadges(version)}
            </span>
            {version.release_date && (
              <span className="version-date">{version.release_date}</span>
            )}
          </div>
        </div>
        <button
          className="install-button"
          disabled={isButtonDisabled}
          onClick={createDownloadHandler(
            handleDownloadVersion,
            isAlreadyInstalled,
            version,
          )}
          style={{
            opacity: isButtonDisabled ? 0.6 : 1,
            cursor: isButtonDisabled ? "not-allowed" : "pointer",
          }}
        >
          <span className="button-icon">
            {isVersionDownloading ? "⏳" : isAlreadyInstalled ? "✅" : "📥"}
          </span>
          {isVersionDownloading
            ? "Downloading..."
            : isAlreadyInstalled
              ? "Installed"
              : "Download"}
        </button>
      </div>
    );
  },
);

const renderLoadMoreItem = R.curry(
  (
    downloadableVersions,
    isLoadingDownloadableVersions,
    fetchVersionsFromDatagrid,
  ) => (
    <div
      key="load-more-btn"
      className="version-list-item"
      style={{
        cursor: isLoadingDownloadableVersions ? "default" : "pointer",
        opacity: isLoadingDownloadableVersions ? 0.6 : 1,
      }}
      onClick={createLoadMoreHandler(
        downloadableVersions,
        isLoadingDownloadableVersions,
        fetchVersionsFromDatagrid,
      )}
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
  ),
);

const renderVersionListItem = R.curry(
  (
    handleLaunchStudioPro,
    handleUninstallClick,
    versionLoadingStates,
    selectedVersion,
    handleVersionClick,
    version,
  ) => {
    const isLaunching = getVersionLoadingState(
      version.version,
      "launch",
      versionLoadingStates,
    );
    const isUninstalling = getVersionLoadingState(
      version.version,
      "uninstall",
      versionLoadingStates,
    );
    const isSelected = isVersionSelected(selectedVersion, version);

    return (
      <MendixVersionListItem
        key={version.version}
        version={version}
        onLaunch={createLaunchHandler(handleLaunchStudioPro, version)}
        onUninstall={createUninstallHandler(handleUninstallClick, version)}
        isLaunching={isLaunching}
        isUninstalling={isUninstalling}
        isSelected={isSelected}
        onClick={createVersionClickHandler(handleVersionClick, version)}
      />
    );
  },
);

const renderAppListItem = R.curry((selectedVersion, handleItemClick, app) => {
  const isDisabled = isAppDisabled(selectedVersion, app);

  return (
    <MendixAppListItem
      key={app.name}
      app={app}
      isDisabled={isDisabled}
      onClick={createAppClickHandler(handleItemClick, app)}
    />
  );
});

// ============= List Renderers =============

const renderDownloadableVersionsList = R.curry(
  (
    downloadableVersions,
    filteredDownloadableVersions,
    versions,
    versionLoadingStates,
    handleDownloadVersion,
    isLoadingDownloadableVersions,
    fetchVersionsFromDatagrid,
  ) => {
    if (!downloadableVersions || downloadableVersions.length === 0) {
      return renderEmptyState("🔄", "Loading downloadable versions...");
    }

    const versionItems = R.map(
      renderDownloadableVersionItem(
        versions,
        versionLoadingStates,
        handleDownloadVersion,
      ),
      filteredDownloadableVersions || [],
    );

    const loadMoreButton = renderLoadMoreItem(
      downloadableVersions,
      isLoadingDownloadableVersions,
      fetchVersionsFromDatagrid,
    );

    return [...versionItems, loadMoreButton];
  },
);

const renderVersionsList = R.curry(
  (
    filteredVersions,
    handleLaunchStudioPro,
    handleUninstallClick,
    versionLoadingStates,
    selectedVersion,
    handleVersionClick,
  ) =>
    R.pipe(
      R.defaultTo([]),
      R.ifElse(
        R.isEmpty,
        () => renderEmptyState("🍓", "No Mendix Studio Pro versions found"),
        R.map(
          renderVersionListItem(
            handleLaunchStudioPro,
            handleUninstallClick,
            versionLoadingStates,
            selectedVersion,
            handleVersionClick,
          ),
        ),
      ),
    )(filteredVersions),
);

const renderAppsList = R.curry(
  (sortedAndFilteredMendixApps, selectedVersion, handleItemClick) =>
    R.pipe(
      R.defaultTo([]),
      R.ifElse(
        R.isEmpty,
        () => renderEmptyState("🍓", "No Mendix apps found"),
        R.map(renderAppListItem(selectedVersion, handleItemClick)),
      ),
    )(sortedAndFilteredMendixApps),
);

// ============= Panel Renderers =============

const renderSearchControls = R.curry((config) => (
  <div className="search-controls">
    <div className="search-row">
      <SearchBox
        placeholder={config.placeholder}
        value={config.searchTerm}
        onChange={config.setSearchTerm}
      />
      {config.isDownloadablePanel &&
        renderCheckbox(
          "New only",
          config.showOnlyDownloadableVersions,
          config.setShowOnlyDownloadableVersions,
        )}
    </div>
    {config.isDownloadablePanel && (
      <div className="version-type-filters">
        {renderCheckbox("LTS", config.showLTSOnly, config.setShowLTSOnly)}
        {renderCheckbox("MTS", config.showMTSOnly, config.setShowMTSOnly)}
        {renderCheckbox("Beta", config.showBetaOnly, config.setShowBetaOnly)}
      </div>
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
    const computedData = useMemo(() => {
      return R.applySpec({
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

    const panelConfigs = useMemo(
      () => [
        {
          key: "downloadable-versions",
          className: "list-container",
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
            showOnlyDownloadableVersions,
            setShowOnlyDownloadableVersions,
            showLTSOnly,
            setShowLTSOnly,
            showMTSOnly,
            setShowMTSOnly,
            showBetaOnly,
            setShowBetaOnly,
            isDownloadablePanel: false,
          }),
          content: renderVersionsList(
            filteredVersions,
            handleLaunchStudioPro,
            handleUninstallClick,
            computedData.versionLoadingStates,
            selectedVersion,
            handleVersionClick,
          ),
        },
        {
          key: "apps",
          className: "list-container narrow",
          searchControls: renderSearchControls({
            placeholder: "Search Mendix apps...",
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
        searchTerm,
        setSearchTerm,
      ],
    );

    return (
      <div className="base-manager studio-pro-manager">
        {R.map(renderPanel, panelConfigs)}
      </div>
    );
  },
);

StudioProManager.displayName = "StudioProManager";

export default StudioProManager;
