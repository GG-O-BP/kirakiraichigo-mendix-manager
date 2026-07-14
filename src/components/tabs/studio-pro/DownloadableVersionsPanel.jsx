import * as R from "ramda";
import { memo, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import SearchBox from "../../common/SearchBox";
import { renderPanel } from "../../common/Panel";
import { renderFilterCheckbox } from "../../common/FilterCheckbox";
import { renderLoadMoreIndicator } from "../../common/LoadMoreIndicator";
import { useI18n } from "../../../i18n/useI18n";

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
  R.ifElse(
    R.isNotNil,
    (text) => (
      <span key={badgeClassName} className={`version-badge ${badgeClassName}`}>
        {text}
      </span>
    ),
    R.always(null),
  )(badgeText),
);

const extractBadgeText = (propName, badgeConfig) =>
  R.pipe(
    R.propOr(false, propName),
    R.ifElse(R.identity, R.always(R.prop("text", badgeConfig)), R.always(null)),
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
  getLoadingStateSync,
  handleDownload,
  t,
}) => {
  const [isInstalled, setIsInstalled] = useState(false);
  const loadingState = getLoadingStateSync(R.prop("version", version));

  useEffect(() => {
    R.pipe(
      () => invokeCheckVersionInstalled(R.prop("version", version), installedVersions),
      R.andThen(setIsInstalled),
      R.otherwise(() => setIsInstalled(false)),
    )();
  }, [R.prop("version", version), installedVersions]);

  return (
    <div className="version-list-item">
      <div className="version-info">
        <span className="version-icon">📦</span>
        <div className="version-details">
          <span className="version-number">{R.prop("version", version)}</span>
          <span className="version-date">{R.prop("release_date", version)}</span>
        </div>
      </div>
      <div className="version-badges-row">{renderVersionSupportBadges(version)}</div>
      {R.ifElse(
        R.prop("isDownloading"),
        (state) => (
          <div className="download-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${R.propOr(0, "downloadProgress", state)}%` }}
              />
            </div>
            <span className="progress-text">
              {Math.round(R.propOr(0, "downloadProgress", state))}%
            </span>
          </div>
        ),
        () => (
          <button
            className="install-button"
            onClick={createVersionDownloadHandler(handleDownload, version)}
            disabled={isInstalled}
          >
            {R.ifElse(
              R.identity,
              R.always(null),
              () => (<span className="button-icon">💫</span>),
            )(isInstalled)}
            {R.ifElse(
              R.identity,
              R.always(R.pathOr("Installed", ["common", "installed"], t)),
              R.always(R.pathOr("Install", ["common", "install"], t)),
            )(isInstalled)}
          </button>
        ),
      )(loadingState)}
    </div>
  );
});

DownloadableVersionItem.displayName = "DownloadableVersionItem";

const DownloadableVersionsPanel = memo(({
  searchTerm,
  setSearchTerm,
  displayedDownloadableVersions,
  installedVersions,
  getLoadingStateSync,
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
  onRefreshCache,
}) => {
  const { t } = useI18n();

  const renderVersionsList = () =>
    R.ifElse(
      R.isEmpty,
      () =>
        renderEmptyListMessage(
          R.pathOr("No downloadable versions found", ["versions", "noDownloadableVersions"], t),
        ),
      R.pipe(
        R.map((version) => (
          <DownloadableVersionItem
            key={`downloadable-${R.prop("version", version)}`}
            version={version}
            installedVersions={installedVersions}
            getLoadingStateSync={getLoadingStateSync}
            handleDownload={handleDownloadVersion}
            t={t}
          />
        )),
        R.append(
          renderLoadMoreIndicator(loadMoreHandler, isLoadingDownloadableVersions, totalDownloadableCount, t),
        ),
      ),
    )(displayedDownloadableVersions);

  const searchControls = (
    <div className="search-controls">
      <div className="search-row-with-action">
        <SearchBox
          placeholder={R.pathOr("Search downloadable versions...", ["versions", "searchDownloadable"], t)}
          value={searchTerm}
          onChange={setSearchTerm}
        />
        <button
          className="refresh-cache-button"
          onClick={onRefreshCache}
          disabled={isLoadingDownloadableVersions}
          title={R.pathOr("Clear cache and refresh versions", ["versions", "clearCacheRefresh"], t)}
        >
          {R.ifElse(
            R.identity,
            R.always("..."),
            R.always(R.pathOr("Refresh", ["common", "refresh"], t)),
          )(isLoadingDownloadableVersions)}
        </button>
      </div>
      <div className="search-row">
        {renderFilterCheckbox(
          showOnlyDownloadableVersions,
          R.pipe(R.path(["target", "checked"]), setShowOnlyDownloadableVersions),
          R.pathOr("Only Show Downloadable", ["versions", "onlyShowDownloadable"], t),
        )}
      </div>
      <div className="version-type-filters">
        {renderFilterCheckbox(
          showLTSOnly,
          R.pipe(R.path(["target", "checked"]), setShowLTSOnly),
          R.pathOr("LTS", ["versions", "lts"], t),
        )}
        {renderFilterCheckbox(
          showMTSOnly,
          R.pipe(R.path(["target", "checked"]), setShowMTSOnly),
          R.pathOr("MTS", ["versions", "mts"], t),
        )}
        {renderFilterCheckbox(
          showBetaOnly,
          R.pipe(R.path(["target", "checked"]), setShowBetaOnly),
          R.pathOr("Beta", ["versions", "beta"], t),
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
