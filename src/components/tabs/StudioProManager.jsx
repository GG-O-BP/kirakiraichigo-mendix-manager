import * as R from "ramda";
import { memo, useMemo, useState, useEffect } from "react";
import SearchBox from "../common/SearchBox";
import { renderPanel } from "../common/Panel";
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

const ITEMS_PER_PAGE = 10;

const excludeInstalledVersions = R.curry(
  (installedVersions, showOnlyDownloadable, versions) =>
    R.pipe(
      R.defaultTo([]),
      R.ifElse(
        () => showOnlyDownloadable,
        R.filter(R.complement(isVersionInInstalledList(installedVersions))),
        R.identity,
      ),
    )(versions),
);

const filterByVersionSupportType = R.curry(
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

const filterBySearchTerm = R.curry((searchTerm, items) =>
  R.pipe(
    R.when(() => R.isEmpty(searchTerm), R.identity),
    R.unless(
      () => R.isEmpty(searchTerm),
      R.filter(createSearchFilter(searchTerm)),
    ),
  )(items),
);

const calculateNextPageNumber = R.pipe(
  R.defaultTo([]),
  R.length,
  R.max(0),
  R.divide(R.__, ITEMS_PER_PAGE),
  Math.floor,
  R.add(1),
  R.max(1),
);

const normalizeVersionString = R.pipe(R.defaultTo(""), String, R.trim);

const extractModifiedDateTimestamp = R.pipe(
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

const isAppVersionMismatch = R.curry((selectedVersion, app) =>
  R.pipe(
    R.always(selectedVersion),
    R.ifElse(
      R.isNil,
      R.always(false),
      R.pipe(
        R.prop("version"),
        normalizeVersionString,
        (versionStr) =>
          R.pipe(
            R.prop("version"),
            normalizeVersionString,
            R.complement(R.equals)(versionStr),
          )(app),
      ),
    ),
  )(),
);

const isVersionInInstalledList = R.curry((installedVersions, version) =>
  R.pipe(
    R.defaultTo([]),
    R.map(R.pipe(R.prop("version"), normalizeVersionString)),
    R.includes(R.pipe(R.prop("version"), normalizeVersionString)(version)),
  )(installedVersions),
);

const isVersionCurrentlySelected = R.curry((selectedVersion, version) =>
  R.pipe(
    R.always(selectedVersion),
    R.ifElse(
      R.isNil,
      R.always(false),
      R.pipe(
        R.prop("version"),
        normalizeVersionString,
        R.equals(R.pipe(R.prop("version"), normalizeVersionString)(version)),
      ),
    ),
  )(),
);

const createVersionSelectionHandler = R.curry(
  (handleClick, version) => () => handleClick(version),
);

const createAppSelectionHandler = R.curry(
  (handleClick, app) => () => handleClick(app),
);

const createVersionDownloadHandler = R.curry((handleClick, version) => () => {
  if (!isVersionInInstalledList([], version)) {
    handleClick(version);
  }
});

const createFetchMoreHandler = R.curry((fetchFunction, page) => {
  if (fetchFunction && page > 0) {
    return () => fetchFunction(page);
  }
  return null;
});

const createVersionLaunchHandler = R.curry(
  (handleLaunch, version) => () => handleLaunch(version.version),
);

const createVersionUninstallHandler = R.curry(
  (handleUninstall, version) => () => handleUninstall(version),
);

const renderEmptyListMessage = R.curry((message) => (
  <div className="no-content">
    <span className="berry-icon">🍓</span>
    <p>{message}</p>
  </div>
));

const renderSupportTypeBadge = R.curry((badge, badgeClass) =>
  badge ? (
    <span key={badgeClass} className={`version-badge ${badgeClass}`}>
      {badge}
    </span>
  ) : null,
);

const renderVersionSupportBadges = (version) =>
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
    R.zipWith(renderSupportTypeBadge, R.__, ["lts", "mts", "latest"]),
    R.filter(R.identity),
  )(version);

const renderFilterCheckbox = R.curry((checked, onChange, label) => (
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

const renderDownloadableVersion = R.curry(
  (versions, versionLoadingStates, handleDownload, version) => {
    const isInstalled = isVersionInInstalledList(versions, version);
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
        <div className="version-badges-row">{renderVersionSupportBadges(version)}</div>
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
            onClick={createVersionDownloadHandler(handleDownload, version)}
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

const renderLoadMoreIndicator = R.curry((fetchFunction, isLoading, totalCount) => {
  if (isLoading) {
    return (
      <div key="loading-more" className="loading-indicator">
        <span className="loading-icon">🍓</span>
        <p>Loading more versions...</p>
      </div>
    );
  }

  const isInitialLoadOrEmpty = !fetchFunction && totalCount === 0;
  if (isInitialLoadOrEmpty) {
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

const renderInstalledVersion = R.curry(
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
      isSelected={isVersionCurrentlySelected(selectedVersion, version)}
      onClick={createVersionSelectionHandler(handleVersionClick, version)}
    />
  ),
);

const renderMendixApp = R.curry((selectedVersion, handleClick, app) => (
  <MendixAppListItem
    key={`app-${app.name}`}
    app={app}
    isDisabled={isAppVersionMismatch(selectedVersion, app)}
    onClick={createAppSelectionHandler(handleClick, app)}
  />
));

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
    const loadMoreHandler = createFetchMoreHandler(
      fetchFunction,
      calculateNextPageNumber(downloadableVersions),
    );

    return R.cond([
      [
        R.always(hasVersions),
        R.always([
          ...R.map(
            renderDownloadableVersion(
              installedVersions,
              versionLoadingStates,
              handleDownload,
            ),
            filteredVersions,
          ),
          renderLoadMoreIndicator(loadMoreHandler, isLoading, R.length(downloadableVersions)),
        ]),
      ],
      [R.T, R.always(renderEmptyListMessage("No downloadable versions found"))],
    ])();
  },
);

const renderInstalledVersionsList = R.curry(
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
      () => renderEmptyListMessage("No installed versions found"),
      R.map(
        renderInstalledVersion(
          versionLoadingStates,
          handleLaunch,
          handleUninstall,
          handleVersionClick,
          selectedVersion,
        ),
      ),
    )(versions),
);

const renderMendixAppsList = R.curry((apps, selectedVersion, handleClick) =>
  R.ifElse(
    R.isEmpty,
    () => renderEmptyListMessage("No apps found"),
    R.map(renderMendixApp(selectedVersion, handleClick)),
  )(apps),
);

const renderPanelSearchControls = R.curry((config) => (
  <div className="search-controls">
    <SearchBox
      placeholder={config.placeholder}
      value={config.searchTerm}
      onChange={config.setSearchTerm}
    />
    {config.isDownloadablePanel && (
      <>
        <div className="search-row">
          {renderFilterCheckbox(
            config.showOnlyDownloadableVersions,
            (e) => config.setShowOnlyDownloadableVersions(e.target.checked),
            "Only Show Downloadable",
          )}
        </div>
        <div className="version-type-filters">
          {renderFilterCheckbox(
            config.showLTSOnly,
            (e) => config.setShowLTSOnly(e.target.checked),
            "LTS",
          )}
          {renderFilterCheckbox(
            config.showMTSOnly,
            (e) => config.setShowMTSOnly(e.target.checked),
            "MTS",
          )}
          {renderFilterCheckbox(
            config.showBetaOnly,
            (e) => config.setShowBetaOnly(e.target.checked),
            "Beta",
          )}
        </div>
      </>
    )}
  </div>
));

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
    const [rustFilteredVersions, setRustFilteredVersions] = useState([]);
    const [rustFilteredApps, setRustFilteredApps] = useState([]);

    useEffect(() => {
      const processVersions = R.tryCatch(
        R.pipeWith(R.andThen, [
          R.always(filterMendixVersions(versions, searchTerm, true)),
          setRustFilteredVersions,
        ]),
        R.pipe(
          R.tap((error) => console.error("Failed to filter versions:", error)),
          R.always(versions),
          setRustFilteredVersions,
        ),
      );

      R.when(R.pipe(R.length, R.gt(R.__, 0)), processVersions)(versions || []);
    }, [versions, searchTerm]);

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
          setRustFilteredApps,
        ]),
        R.pipe(
          R.tap((error) => console.error("Failed to filter apps:", error)),
          R.always(apps),
          setRustFilteredApps,
        ),
      );

      R.when(R.pipe(R.length, R.gt(R.__, 0)), processApps)(apps || []);
    }, [apps, searchTerm, selectedVersion]);

    const computedData = useMemo(() => {
      return R.applySpec({
        sortedAndFilteredMendixApps: R.always(rustFilteredApps),
        filteredDownloadableVersions: R.pipe(
          R.always(downloadableVersions),
          excludeInstalledVersions(versions, showOnlyDownloadableVersions),
          filterByVersionSupportType(showLTSOnly, showMTSOnly, showBetaOnly),
          filterBySearchTerm(searchTerm),
        ),
        versionLoadingStates: R.always(versionLoadingStates),
      })();
    }, [
      rustFilteredApps,
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
          searchControls: renderPanelSearchControls({
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
          searchControls: renderPanelSearchControls({
            placeholder: "Search installed versions...",
            searchTerm,
            setSearchTerm,
            isDownloadablePanel: false,
          }),
          content: renderInstalledVersionsList(
            rustFilteredVersions,
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
          searchControls: renderPanelSearchControls({
            placeholder: "Search apps...",
            searchTerm,
            setSearchTerm,
            isDownloadablePanel: false,
          }),
          content: renderMendixAppsList(
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
        rustFilteredVersions,
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
