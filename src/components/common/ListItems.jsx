import { useMemo } from "react";
import ListItem from "./ListItem";

// Pure functions for data transformations
const createListItem = (index) => ({
  id: `item-${index}`,
  label: `Item ${index + 1}`,
  icon: "🍓",
});

const generateListData = (count) =>
  Array.from({ length: count }, (_, i) => createListItem(i));

// Higher-order function for search filtering
const createSearchFilter = (searchTerm) => (item) => {
  const searchLower = searchTerm.toLowerCase();
  if (typeof item === "string") {
    return item.toLowerCase().includes(searchLower);
  }
  return (item.label || item.version || "").toLowerCase().includes(searchLower);
};

const MendixVersionListItem = ({
  version,
  onLaunch,
  onUninstall,
  isLaunching,
  isUninstalling,
  isSelected,
  onClick,
}) => (
  <div
    className={`version-list-item ${isSelected ? "selected" : ""} ${isUninstalling ? "disabled" : ""}`}
    onClick={isUninstalling ? undefined : onClick}
    style={{ cursor: isUninstalling ? "not-allowed" : "pointer" }}
  >
    <div className="version-info">
      <span className="version-icon">🚀</span>
      <div className="version-details">
        <span className="version-number">
          {version.version}
          {version.is_valid && <span className="version-badge lts">✓</span>}
        </span>
        <span className="version-date">
          {isUninstalling
            ? "Uninstalling..."
            : version.install_date
              ? new Date(version.install_date).toLocaleDateString()
              : "Installation date unknown"}
        </span>
      </div>
    </div>
    <div style={{ display: "flex", gap: "8px" }}>
      <button
        className="install-button"
        onClick={(e) => {
          e.stopPropagation();
          onLaunch(version);
        }}
        disabled={isLaunching || !version.is_valid || isUninstalling}
      >
        <span className="button-icon">▶️</span>
        {isLaunching ? "Launching..." : "Launch"}
      </button>
      <button
        className="install-button uninstall-button"
        onClick={(e) => {
          e.stopPropagation();
          onUninstall(version);
        }}
        disabled={isUninstalling || !version.is_valid || isLaunching}
        style={{
          background:
            "linear-gradient(135deg, rgba(220, 20, 60, 0.2) 0%, rgba(220, 20, 60, 0.3) 100%)",
          borderColor: "rgba(220, 20, 60, 0.4)",
        }}
      >
        <span className="button-icon">🗑️</span>
        {isUninstalling ? "ing..." : ""}
      </button>
    </div>
  </div>
);

const MendixAppListItem = ({ app, isDisabled, onClick }) => (
  <div
    className={`version-list-item ${isDisabled ? "disabled" : ""}`}
    onClick={isDisabled ? undefined : onClick}
    style={{
      cursor: isDisabled ? "not-allowed" : "pointer",
      opacity: isDisabled ? 0.5 : 1,
    }}
  >
    <div className="version-info">
      <span className="version-icon">📁</span>
      <div className="version-details">
        <span className="version-number">
          {app.name}
          {app.version && (
            <span className="version-badge mts">v{app.version}</span>
          )}
        </span>
        <span className="version-date">
          {app.last_modified
            ? new Date(app.last_modified).toLocaleDateString()
            : "Date unknown"}
        </span>
      </div>
    </div>
    <div className="app-actions">
      <span className="item-sparkle">✨</span>
    </div>
  </div>
);

const VersionListItem = ({
  version,
  onInstall,
  isInstalling,
  downloadProgress,
}) => (
  <div className="version-list-item">
    <div className="version-info">
      <span className="version-icon">📦</span>
      <div className="version-details">
        <span className="version-number">
          {version.version}
          {version.is_lts && <span className="version-badge lts">LTS</span>}
          {version.is_mts && <span className="version-badge mts">MTS</span>}
        </span>
        <span className="version-date">{version.release_date}</span>
      </div>
    </div>
    {isInstalling ? (
      <div className="download-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${downloadProgress}%` }}
          />
        </div>
        <span className="progress-text">{Math.round(downloadProgress)}%</span>
      </div>
    ) : (
      <button
        className="install-button"
        onClick={(e) => {
          e.stopPropagation();
          onInstall(version);
        }}
      >
        <span className="button-icon">💫</span>
        Install
      </button>
    )}
  </div>
);

const ListArea = ({ items, searchTerm, onItemClick }) => {
  const filteredItems = useMemo(
    () => (searchTerm ? items.filter(createSearchFilter(searchTerm)) : items),
    [items, searchTerm],
  );

  return (
    <div className="list-area">
      {filteredItems.map((item) => (
        <ListItem key={item.id} item={item} onClick={onItemClick} />
      ))}
    </div>
  );
};

export {
  createListItem,
  generateListData,
  createSearchFilter,
  MendixVersionListItem,
  MendixAppListItem,
  VersionListItem,
  ListArea,
};
