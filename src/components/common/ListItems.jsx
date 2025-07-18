import * as R from "ramda";
import { memo, useMemo } from "react";
import ListItem from "./ListItem";

// ============= Pure Data Transformations =============

// Create a list item with given index
export const createListItem = R.curry((index) => ({
  id: `item-${index}`,
  label: `Item ${index + 1}`,
  icon: "🍓",
}));

// Generate list data with given count
export const generateListData = R.pipe(R.range(0), R.map(createListItem));

// Convert to lowercase for comparison
const toLower = R.toLower;

// Get searchable text from item
const getSearchableText = R.pipe(
  R.props(["label", "version", "name"]),
  R.filter(R.identity),
  R.join(" "),
  toLower,
);

// Create search filter
export const createSearchFilter = R.curry((searchTerm) =>
  R.pipe(getSearchableText, R.includes(toLower(searchTerm))),
);

// ============= Component Helpers =============

// Build class names
const buildClassNames = R.pipe(R.filter(R.identity), R.join(" "));

// Get version badge type
const getVersionBadge = R.cond([
  [R.prop("is_valid"), R.always("✓")],
  [R.prop("is_lts"), R.always("LTS")],
  [R.prop("is_mts"), R.always("MTS")],
  [R.T, R.always(null)],
]);

// Format date with fallback
const formatDate = R.curry((fallbackText, dateStr) =>
  R.ifElse(
    R.identity,
    R.pipe(
      (date) => new Date(date),
      (date) => date.toLocaleDateString(),
    ),
    R.always(fallbackText),
  )(dateStr),
);

// Handle button click with event propagation prevention
const handleButtonClick = R.curry((onClick, e) =>
  R.pipe(
    R.tap((e) => e.stopPropagation()),
    R.tap(() => onClick()),
    R.always(undefined),
  )(e),
);

// ============= MendixVersionListItem Component =============

const renderVersionBadge = R.curry((badge, badgeClass) =>
  badge ? <span className={`version-badge ${badgeClass}`}>{badge}</span> : null,
);

const getVersionDate = R.cond([
  [R.prop("isLaunching"), R.always("Launching...")],
  [R.prop("isUninstalling"), R.always("Uninstalling...")],
  [
    R.T,
    R.pipe(R.prop("install_date"), formatDate("Installation date unknown")),
  ],
]);

const renderLaunchButton = R.curry(
  (onLaunch, version, isLaunching, isUninstalling) => (
    <button
      className="install-button"
      onClick={handleButtonClick(() => onLaunch(version))}
      disabled={isLaunching || !version.is_valid || isUninstalling}
    >
      <span className="button-icon">▶️</span>
      {isLaunching ? "Launching..." : "Launch"}
    </button>
  ),
);

const renderUninstallButton = R.curry(
  (onUninstall, version, isUninstalling, isLaunching) => (
    <button
      className="install-button uninstall-button"
      onClick={handleButtonClick(() => onUninstall(version))}
      disabled={isUninstalling || !version.is_valid || isLaunching}
      style={{
        background:
          "linear-gradient(135deg, rgba(220, 20, 60, 0.2) 0%, rgba(220, 20, 60, 0.3) 100%)",
        borderColor: "rgba(220, 20, 60, 0.4)",
      }}
    >
      <span className="button-icon">🗑️</span>
      {isUninstalling ? "..." : ""}
    </button>
  ),
);

export const MendixVersionListItem = memo(
  ({
    version,
    onLaunch,
    onUninstall,
    isLaunching,
    isUninstalling,
    isSelected,
    onClick,
  }) => {
    const className = buildClassNames([
      "version-list-item",
      isSelected && "selected",
      isUninstalling && "disabled",
    ]);

    const containerProps = {
      className,
      onClick: isUninstalling ? undefined : onClick,
      style: { cursor: isUninstalling ? "not-allowed" : "pointer" },
    };

    return (
      <div {...containerProps}>
        <div className="version-info">
          <span className="version-icon">🚀</span>
          <div className="version-details">
            <span className="version-number">
              {version.version}
              {renderVersionBadge(getVersionBadge(version), "lts")}
            </span>
            <span className="version-date">
              {getVersionDate({ ...version, isLaunching, isUninstalling })}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {renderLaunchButton(onLaunch, version, isLaunching, isUninstalling)}
          {renderUninstallButton(
            onUninstall,
            version,
            isUninstalling,
            isLaunching,
          )}
        </div>
      </div>
    );
  },
);

MendixVersionListItem.displayName = "MendixVersionListItem";

// ============= MendixAppListItem Component =============

const renderVersionBadgeSpan = R.curry((version) =>
  version ? <span className="version-badge mts">v{version}</span> : null,
);

export const MendixAppListItem = memo(({ app, isDisabled, onClick }) => {
  const className = buildClassNames([
    "version-list-item",
    isDisabled && "disabled",
  ]);

  const containerProps = {
    className,
    onClick: isDisabled ? undefined : onClick,
    style: {
      cursor: isDisabled ? "not-allowed" : "pointer",
      opacity: isDisabled ? 0.5 : 1,
    },
  };

  return (
    <div {...containerProps}>
      <div className="version-info">
        <span className="version-icon">📁</span>
        <div className="version-details">
          <span className="version-number">
            {app.name}
            {renderVersionBadgeSpan(app.version)}
          </span>
          <span className="version-date">
            {formatDate("Date unknown", app.last_modified)}
          </span>
        </div>
      </div>
      <div className="app-actions">
        <span className="item-sparkle">✨</span>
      </div>
    </div>
  );
});

MendixAppListItem.displayName = "MendixAppListItem";

// ============= VersionListItem Component =============

const renderProgressBar = R.curry((downloadProgress) => (
  <div className="download-progress">
    <div className="progress-bar">
      <div
        className="progress-fill"
        style={{ width: `${downloadProgress}%` }}
      />
    </div>
    <span className="progress-text">{Math.round(downloadProgress)}%</span>
  </div>
));

const renderInstallButton = R.curry((onInstall, version) => (
  <button
    className="install-button"
    onClick={handleButtonClick(() => onInstall(version))}
    disabled={false}
  >
    <span className="button-icon">💫</span>
    Install
  </button>
));

export const VersionListItem = memo(
  ({ version, onInstall, isInstalling, downloadProgress }) => (
    <div className="version-list-item">
      <div className="version-info">
        <span className="version-icon">📦</span>
        <div className="version-details">
          <span className="version-number">
            {version.version}
            {renderVersionBadge(version.is_lts && "LTS", "lts")}
            {renderVersionBadge(version.is_mts && "MTS", "mts")}
          </span>
          <span className="version-date">{version.release_date}</span>
        </div>
      </div>
      {R.ifElse(
        R.identity,
        () => renderProgressBar(downloadProgress),
        () => renderInstallButton(onInstall, version),
      )(isInstalling)}
    </div>
  ),
);

VersionListItem.displayName = "VersionListItem";

// ============= ListArea Component =============

const filterItems = R.curry((searchTerm, items) =>
  R.ifElse(
    () => R.isEmpty(searchTerm),
    R.identity,
    R.filter(createSearchFilter(searchTerm)),
  )(items),
);

const renderListItem = R.curry((onItemClick, item) => (
  <ListItem key={item.id} item={item} onClick={onItemClick} />
));

export const ListArea = memo(({ items, searchTerm, onItemClick }) => {
  const filteredItems = useMemo(
    () => filterItems(searchTerm, items),
    [items, searchTerm],
  );

  return (
    <div className="list-area">
      {R.map(renderListItem(onItemClick), filteredItems)}
    </div>
  );
});

ListArea.displayName = "ListArea";
