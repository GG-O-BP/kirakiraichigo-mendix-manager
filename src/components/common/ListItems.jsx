import * as R from "ramda";
import { memo, useMemo, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import ListItem from "./ListItem";

const UNINSTALL_BUTTON_STYLE = {
  background: "linear-gradient(135deg, rgba(220, 20, 60, 0.2) 0%, rgba(220, 20, 60, 0.3) 100%)",
  borderColor: "rgba(220, 20, 60, 0.4)",
};

const BUTTON_GROUP_STYLE = { display: "flex", gap: "8px" };

// Search text extraction (Rust backend)
export const extractSearchableText = async (label, version, name) =>
  invoke("extract_searchable_text", { label, version, name });

// Search filter using Rust backend
export const textMatchesSearch = async (searchableText, searchTerm) =>
  invoke("text_matches_search", { searchableText, searchTerm });

// Create search filter that works with items (async batch processing)
export const filterItemsBySearch = async (items, searchTerm) => {
  if (!searchTerm || searchTerm.trim() === "") {
    return items;
  }

  const results = await Promise.all(
    items.map(async (item) => {
      const searchableText = await extractSearchableText(
        item.label || item.caption,
        item.version,
        item.name
      );
      const matches = await textMatchesSearch(searchableText, searchTerm);
      return matches ? item : null;
    })
  );

  return results.filter(Boolean);
};

const composeClassNames = R.pipe(R.filter(R.identity), R.join(" "));

// Version validity badge (Rust backend)
export const getVersionValidityBadge = async (isValid, isLts, isMts) =>
  invoke("get_version_validity_badge", { isValid, isLts, isMts });

// Date formatting (Rust backend)
export const formatDateWithFallback = async (dateStr, fallback) =>
  invoke("format_date_with_fallback", { dateStr, fallback });

// Version status text (Rust backend)
export const getVersionStatusText = async (isLaunching, isUninstalling, installDate) =>
  invoke("get_version_status_text", { isLaunching, isUninstalling, installDate });

const preventPropagationAndExecute = R.curry((onClick, e) =>
  R.pipe(
    R.tap((e) => e.stopPropagation()),
    R.tap(() => onClick()),
    R.always(undefined),
  )(e),
);

const renderSupportBadge = R.curry((badge, badgeClass) =>
  badge ? <span className={`version-badge ${badgeClass}`}>{badge}</span> : null,
);

const renderLaunchButton = R.curry(
  (onLaunch, version, isLaunching, isUninstalling) => (
    <button
      className="install-button"
      onClick={preventPropagationAndExecute(() => onLaunch(version))}
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
      onClick={preventPropagationAndExecute(() => onUninstall(version))}
      disabled={isUninstalling || !version.is_valid || isLaunching}
      style={UNINSTALL_BUTTON_STYLE}
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
    const [statusText, setStatusText] = useState("Loading...");

    useEffect(() => {
      getVersionStatusText(isLaunching, isUninstalling, version.install_date)
        .then(setStatusText)
        .catch(() => setStatusText("Date unknown"));
    }, [isLaunching, isUninstalling, version.install_date]);

    const className = composeClassNames([
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
            <span className="version-number">{version.version}</span>
            <span className="version-date">{statusText}</span>
          </div>
        </div>
        <div style={BUTTON_GROUP_STYLE}>
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

const renderAppVersionBadge = R.curry((version) =>
  version ? (
    <span className="version-badge app-version">v{version}</span>
  ) : null,
);

export const MendixAppListItem = memo(({ app, isDisabled, onClick }) => {
  const [formattedDate, setFormattedDate] = useState("Loading...");

  useEffect(() => {
    formatDateWithFallback(app.last_modified, "Date unknown")
      .then(setFormattedDate)
      .catch(() => setFormattedDate("Date unknown"));
  }, [app.last_modified]);

  const className = composeClassNames([
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
          <span className="version-number">{app.name}</span>
          <span className="version-date">
            {renderAppVersionBadge(app.version)}
            {formattedDate}
          </span>
        </div>
      </div>
    </div>
  );
});

MendixAppListItem.displayName = "MendixAppListItem";

const renderDownloadProgressBar = R.curry((downloadProgress) => (
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
    onClick={preventPropagationAndExecute(() => onInstall(version))}
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
            {renderSupportBadge(version.is_lts && "LTS", "lts")}
            {renderSupportBadge(version.is_mts && "MTS", "mts")}
          </span>
          <span className="version-date">{version.release_date}</span>
        </div>
      </div>
      {R.ifElse(
        R.identity,
        () => renderDownloadProgressBar(downloadProgress),
        () => renderInstallButton(onInstall, version),
      )(isInstalling)}
    </div>
  ),
);

VersionListItem.displayName = "VersionListItem";

const renderListItemWithHandler = R.curry((onItemClick, item) => (
  <ListItem key={item.id} item={item} onClick={onItemClick} />
));

export const ListArea = memo(({ items, searchTerm, onItemClick }) => {
  const [filteredItems, setFilteredItems] = useState(items);

  useEffect(() => {
    filterItemsBySearch(items, searchTerm)
      .then(setFilteredItems)
      .catch(() => setFilteredItems(items));
  }, [items, searchTerm]);

  return (
    <div className="list-area">
      {R.map(renderListItemWithHandler(onItemClick), filteredItems)}
    </div>
  );
});

ListArea.displayName = "ListArea";
