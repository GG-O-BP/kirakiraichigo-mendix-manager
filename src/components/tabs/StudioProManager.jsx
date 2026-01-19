import * as R from "ramda";
import { memo, useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import SearchBox from "../common/SearchBox";
import { renderPanel } from "../common/Panel";
import {
  MendixVersionListItem,
  MendixAppListItem,
} from "../common/ListItems";
import { getVersionLoadingState } from "../../utils";
import {
  filterMendixVersions,
  filterAndSortAppsWithPriority,
} from "../../utils/dataProcessing";

const DOWNLOADABLE_VERSIONS_PAGE_SIZE = 10;

const VERSION_SUPPORT_BADGES = {
  LTS: { text: "LTS", className: "lts" },
  MTS: { text: "MTS", className: "mts" },
  LATEST: { text: "LATEST", className: "latest" },
};

export const invokeExcludeInstalledVersions = async (versions, installedVersions, showOnlyDownloadable) =>
  invoke("exclude_installed_versions", { versions, installedVersions, showOnlyDownloadable });

export const invokeFilterByVersionSupportType = async (versions, showLtsOnly, showMtsOnly, showBetaOnly) =>
  invoke("filter_by_version_support_type", { versions, showLtsOnly, showMtsOnly, showBetaOnly });

export const invokeCalculateNextPageNumber = async (totalItems, itemsPerPage) =>
  invoke("calculate_next_page_number", { totalItems, itemsPerPage });

export const invokeCheckAppVersionMismatch = async (selectedVersion, appVersion) =>
  invoke("is_app_version_mismatch", { selectedVersion, appVersion });

export const invokeCheckVersionInstalled = async (version, installedVersions) =>
  invoke("is_version_in_installed_list", { version, installedVersions });

export const invokeCheckVersionSelected = async (selectedVersion, version) =>
  invoke("is_version_currently_selected", { selectedVersion, version });

const createVersionSelectionHandler = R.curry(
  (handleClick, version) => () => handleClick(version),
);

const createAppSelectionHandler = R.curry(
  (handleClick, app) => () => handleClick(app),
);

const createVersionDownloadHandler = R.curry((handleClick, version) => () => {
  handleClick(version);
});

const createFetchMoreHandler = R.curry((fetchFunction, page) => {
  if (fetchFunction && page > 0) {
    return () => fetchFunction(page);
  }
  return null;
});

const renderEmptyListMessage = R.curry((message) => (
  <div className="no-content">
    <span className="berry-icon">🍓</span>
    <p>{message}</p>
  </div>
));

const renderSupportTypeBadge = R.curry((badgeText, badgeClassName) =>
  badgeText ? (
    <span key={badgeClassName} className={`version-badge ${badgeClassName}`}>
      {badgeText}
    </span>
  ) : null,
);

const extractBadgeText = (propName, badgeConfig) =>
  R.pipe(
    R.propOr(false, propName),
    R.ifElse(R.identity, R.always(badgeConfig.text), R.always(null)),
  );

const renderVersionSupportBadges = (version) =>
  R.pipe(
    R.juxt([
      extractBadgeText("is_lts", VERSION_SUPPORT_BADGES.LTS),
      extractBadgeText("is_mts", VERSION_SUPPORT_BADGES.MTS),
      extractBadgeText("is_latest", VERSION_SUPPORT_BADGES.LATEST),
    ]),
    R.zipWith(renderSupportTypeBadge, R.__, [
      VERSION_SUPPORT_BADGES.LTS.className,
      VERSION_SUPPORT_BADGES.MTS.className,
      VERSION_SUPPORT_BADGES.LATEST.className,
    ]),
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

const DownloadableVersionItem = memo(({
  version,
  installedVersions,
  versionLoadingStates,
  handleDownload
}) => {
  const [isInstalled, setIsInstalled] = useState(false);
  const loadingState = getVersionLoadingState(versionLoadingStates, version.version);

  useEffect(() => {
    invokeCheckVersionInstalled(version.version, installedVersions)
      .then(setIsInstalled)
      .catch(() => setIsInstalled(false));
  }, [version.version, installedVersions]);

  return (
    <div className="version-list-item">
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
});

DownloadableVersionItem.displayName = "DownloadableVersionItem";

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

const InstalledVersionItem = memo(({
  version,
  versionLoadingStates,
  handleLaunch,
  handleUninstall,
  handleVersionClick,
  selectedVersion,
}) => {
  const [isSelected, setIsSelected] = useState(false);
  const loadingState = getVersionLoadingState(versionLoadingStates, version.version);

  useEffect(() => {
    if (selectedVersion) {
      invokeCheckVersionSelected(selectedVersion.version, version.version)
        .then(setIsSelected)
        .catch(() => setIsSelected(false));
    } else {
      setIsSelected(false);
    }
  }, [selectedVersion, version.version]);

  return (
    <MendixVersionListItem
      version={version}
      onLaunch={handleLaunch}
      onUninstall={handleUninstall}
      isLaunching={loadingState.isLaunching}
      isUninstalling={loadingState.isUninstalling}
      isSelected={isSelected}
      onClick={createVersionSelectionHandler(handleVersionClick, version)}
    />
  );
});

InstalledVersionItem.displayName = "InstalledVersionItem";

const AppItem = memo(({ app, selectedVersion, handleClick }) => {
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    if (selectedVersion) {
      invokeCheckAppVersionMismatch(selectedVersion.version, app.version)
        .then(setIsDisabled)
        .catch(() => setIsDisabled(false));
    } else {
      setIsDisabled(false);
    }
  }, [selectedVersion, app.version]);

  return (
    <MendixAppListItem
      app={app}
      isDisabled={isDisabled}
      onClick={createAppSelectionHandler(handleClick, app)}
    />
  );
});

AppItem.displayName = "AppItem";

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
    const [displayedInstalledVersions, setDisplayedInstalledVersions] = useState([]);
    const [displayedApps, setDisplayedApps] = useState([]);
    const [displayedDownloadableVersions, setDisplayedDownloadableVersions] = useState([]);
    const [nextPageNumber, setNextPageNumber] = useState(1);

    useEffect(() => {
      if (versions && versions.length > 0) {
        filterMendixVersions(versions, searchTerm, true)
          .then(setDisplayedInstalledVersions)
          .catch((error) => {
            console.error("Failed to filter versions:", error);
            setDisplayedInstalledVersions(versions);
          });
      } else {
        setDisplayedInstalledVersions([]);
      }
    }, [versions, searchTerm]);

    useEffect(() => {
      if (apps && apps.length > 0) {
        filterAndSortAppsWithPriority(
          apps,
          searchTerm,
          selectedVersion?.version
        )
          .then(setDisplayedApps)
          .catch((error) => {
            console.error("Failed to filter apps:", error);
            setDisplayedApps(apps);
          });
      } else {
        setDisplayedApps([]);
      }
    }, [apps, searchTerm, selectedVersion]);

    useEffect(() => {
      const filterDownloadable = async () => {
        if (!downloadableVersions || downloadableVersions.length === 0) {
          setDisplayedDownloadableVersions([]);
          return;
        }

        try {
          let filtered = await invokeExcludeInstalledVersions(
            downloadableVersions,
            versions || [],
            showOnlyDownloadableVersions
          );

          filtered = await invokeFilterByVersionSupportType(
            filtered,
            showLTSOnly,
            showMTSOnly,
            showBetaOnly
          );

          if (searchTerm && searchTerm.trim() !== "") {
            const normalizedSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(v =>
              v.version.toLowerCase().includes(normalizedSearchTerm)
            );
          }

          setDisplayedDownloadableVersions(filtered);
        } catch (error) {
          console.error("Failed to filter downloadable versions:", error);
          setDisplayedDownloadableVersions(downloadableVersions);
        }
      };

      filterDownloadable();
    }, [downloadableVersions, versions, showOnlyDownloadableVersions, showLTSOnly, showMTSOnly, showBetaOnly, searchTerm]);

    useEffect(() => {
      if (downloadableVersions && downloadableVersions.length > 0) {
        invokeCalculateNextPageNumber(downloadableVersions.length, DOWNLOADABLE_VERSIONS_PAGE_SIZE)
          .then(setNextPageNumber)
          .catch(() => setNextPageNumber(1));
      }
    }, [downloadableVersions]);

    const loadMoreHandler = createFetchMoreHandler(fetchVersionsFromDatagrid, nextPageNumber);

    const renderDownloadableVersionsList = useCallback(() => {
      if (displayedDownloadableVersions.length === 0) {
        return renderEmptyListMessage("No downloadable versions found");
      }

      return [
        ...displayedDownloadableVersions.map((version) => (
          <DownloadableVersionItem
            key={`downloadable-${version.version}`}
            version={version}
            installedVersions={versions}
            versionLoadingStates={versionLoadingStates}
            handleDownload={handleDownloadVersion}
          />
        )),
        renderLoadMoreIndicator(loadMoreHandler, isLoadingDownloadableVersions, downloadableVersions?.length || 0),
      ];
    }, [displayedDownloadableVersions, versions, versionLoadingStates, handleDownloadVersion, loadMoreHandler, isLoadingDownloadableVersions, downloadableVersions]);

    const renderInstalledVersionsList = useCallback(() => {
      if (displayedInstalledVersions.length === 0) {
        return renderEmptyListMessage("No installed versions found");
      }

      return displayedInstalledVersions.map((version) => (
        <InstalledVersionItem
          key={`installed-${version.version}`}
          version={version}
          versionLoadingStates={versionLoadingStates}
          handleLaunch={handleLaunchStudioPro}
          handleUninstall={handleUninstallClick}
          handleVersionClick={handleVersionClick}
          selectedVersion={selectedVersion}
        />
      ));
    }, [displayedInstalledVersions, versionLoadingStates, handleLaunchStudioPro, handleUninstallClick, handleVersionClick, selectedVersion]);

    const renderMendixAppsList = useCallback(() => {
      if (displayedApps.length === 0) {
        return renderEmptyListMessage("No apps found");
      }

      return displayedApps.map((app) => (
        <AppItem
          key={`app-${app.name}`}
          app={app}
          selectedVersion={selectedVersion}
          handleClick={handleItemClick}
        />
      ));
    }, [displayedApps, selectedVersion, handleItemClick]);

    const panelConfigs = [
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
        content: renderDownloadableVersionsList(),
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
        content: renderInstalledVersionsList(),
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
        content: renderMendixAppsList(),
      },
    ];

    return (
      <div className="studio-pro-manager base-manager">
        {R.map(renderPanel, panelConfigs)}
      </div>
    );
  },
);

StudioProManager.displayName = "StudioProManager";

export default StudioProManager;
