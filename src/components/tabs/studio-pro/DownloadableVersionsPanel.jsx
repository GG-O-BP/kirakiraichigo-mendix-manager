import * as R from "ramda";
import { memo, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import SearchBox from "../../common/SearchBox";
import { renderPanel } from "../../common/Panel";
import { renderFilterCheckbox } from "../../common/FilterCheckbox";
import { renderLoadMoreIndicator } from "../../common/LoadMoreIndicator";
import { getVersionLoadingState } from "../../../utils";

const VERSION_SUPPORT_BADGES = {
  LTS: { text: "LTS", className: "lts" },
  MTS: { text: "MTS", className: "mts" },
  LATEST: { text: "LATEST", className: "latest" },
};

const invokeCheckVersionInstalled = async (version, installedVersions) =>
  invoke("compare_versions", {
    comparisonType: "installed",
    value1: version,
    value2: null,
    installedVersions,
  });

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

const createVersionDownloadHandler = R.curry((handleClick, version) => () => {
  handleClick(version);
});

const renderEmptyListMessage = (message) => (
  <div className="no-content">
    <span className="berry-icon">🍓</span>
    <p>{message}</p>
  </div>
);

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

const DownloadableVersionsPanel = memo(({
  searchTerm,
  setSearchTerm,
  displayedDownloadableVersions,
  installedVersions,
  versionLoadingStates,
  handleDownloadVersion,
  loadMoreHandler,
  isLoadingDownloadableVersions,
  totalDownloadableCount,
  showOnlyDownloadableVersions,
  setShowOnlyDownloadableVersions,
  showLTSOnly,
  setShowLTSOnly,
  showMTSOnly,
  setShowMTSOnly,
  showBetaOnly,
  setShowBetaOnly,
}) => {
  const renderVersionsList = () => {
    if (displayedDownloadableVersions.length === 0) {
      return renderEmptyListMessage("No downloadable versions found");
    }

    return [
      ...displayedDownloadableVersions.map((version) => (
        <DownloadableVersionItem
          key={`downloadable-${version.version}`}
          version={version}
          installedVersions={installedVersions}
          versionLoadingStates={versionLoadingStates}
          handleDownload={handleDownloadVersion}
        />
      )),
      renderLoadMoreIndicator(loadMoreHandler, isLoadingDownloadableVersions, totalDownloadableCount),
    ];
  };

  const searchControls = (
    <div className="search-controls">
      <SearchBox
        placeholder="Search downloadable versions..."
        value={searchTerm}
        onChange={setSearchTerm}
      />
      <div className="search-row">
        {renderFilterCheckbox(
          showOnlyDownloadableVersions,
          (e) => setShowOnlyDownloadableVersions(e.target.checked),
          "Only Show Downloadable",
        )}
      </div>
      <div className="version-type-filters">
        {renderFilterCheckbox(
          showLTSOnly,
          (e) => setShowLTSOnly(e.target.checked),
          "LTS",
        )}
        {renderFilterCheckbox(
          showMTSOnly,
          (e) => setShowMTSOnly(e.target.checked),
          "MTS",
        )}
        {renderFilterCheckbox(
          showBetaOnly,
          (e) => setShowBetaOnly(e.target.checked),
          "Beta",
        )}
      </div>
    </div>
  );

  return renderPanel({
    key: "downloadable-versions",
    className: "list-container downloadable-list",
    searchControls,
    content: renderVersionsList(),
  });
});

DownloadableVersionsPanel.displayName = "DownloadableVersionsPanel";

export default DownloadableVersionsPanel;
