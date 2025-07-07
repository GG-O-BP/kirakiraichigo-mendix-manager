import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

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

// Pure functional components
const SearchBox = ({ placeholder, value, onChange }) => (
  <div className="search-container">
    <span className="search-icon">🔍</span>
    <input
      type="text"
      className="search-box"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    <span className="sparkle">✨</span>
  </div>
);

const ListItem = ({ item, onClick, children }) => (
  <div className="list-item" onClick={() => onClick(item)}>
    <span className="item-icon">{item.icon || "🍓"}</span>
    <span className="item-label">{item.label}</span>
    {children}
    <span className="item-sparkle">·</span>
  </div>
);

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

const Dropdown = ({ value, onChange, options }) => (
  <div className="dropdown-container">
    <select
      className="dropdown"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <span className="dropdown-icon">🍓</span>
  </div>
);

const PropertyInput = ({ label, type, value, onChange, options = [] }) => {
  const renderInput = () => {
    switch (type) {
      case "text":
        return (
          <input
            type="text"
            className="property-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "textarea":
        return (
          <textarea
            className="property-textarea"
            rows="4"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "select":
        return (
          <select
            className="property-select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      default:
        return null;
    }
  };

  return (
    <label className="property-label">
      <span className="label-text">{label}</span>
      {renderInput()}
    </label>
  );
};

const TabButton = ({ label, isActive, onClick }) => (
  <button className={`tab ${isActive ? "active" : ""}`} onClick={onClick}>
    <span className="tab-icon">🍓</span>
    {label}
    {isActive && <span className="tab-sparkle">✨</span>}
  </button>
);

// Confirm Modal Component
const ConfirmModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  onConfirmWithApps,
  isLoading,
  relatedApps,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p>{message}</p>
          {relatedApps && relatedApps.length > 0 && (
            <div className="related-apps-section">
              <h4>Related Apps that will be deleted:</h4>
              <ul className="related-apps-list">
                {relatedApps.map((app) => (
                  <li key={app.name} className="related-app-item">
                    <span className="app-icon">📱</span>
                    <span className="app-name">{app.name}</span>
                    <span className="app-version">v{app.version}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button
            className="modal-button cancel-button"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="modal-button confirm-button"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Uninstall Only"}
          </button>
          {onConfirmWithApps && relatedApps && relatedApps.length > 0 && (
            <button
              className="modal-button confirm-with-apps-button"
              onClick={onConfirmWithApps}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Uninstall + Delete Apps"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Main App component
function App() {
  const [activeTab, setActiveTab] = useState("studio-pro");
  const [versions, setVersions] = useState([]);
  const [apps, setApps] = useState([]);
  const [filteredVersions, setFilteredVersions] = useState([]);
  const [filteredApps, setFilteredApps] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [appSearchTerm, setAppSearchTerm] = useState("");
  const [versionFilter, setVersionFilter] = useState("all");
  const [selectedApps, setSelectedApps] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [showUninstallModal, setShowUninstallModal] = useState(false);
  const [versionToUninstall, setVersionToUninstall] = useState(null);
  const [relatedApps, setRelatedApps] = useState([]);
  const [showAppDeleteModal, setShowAppDeleteModal] = useState(false);
  const [appToDelete, setAppToDelete] = useState(null);
  const listRef = useRef(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const unlisten = useRef(null);

  // Widget Manager specific states
  const [widgets, setWidgets] = useState([]);
  const [filteredWidgets, setFilteredWidgets] = useState([]);
  const [widgetSearchTerm, setWidgetSearchTerm] = useState("");
  const [selectedWidgets, setSelectedWidgets] = useState(new Set());
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [showAddWidgetForm, setShowAddWidgetForm] = useState(false);
  const [newWidgetCaption, setNewWidgetCaption] = useState("");
  const [newWidgetPath, setNewWidgetPath] = useState("");
  const [widgetManagerSearch2, setWidgetManagerSearch2] = useState("");
  const [widgetPreviewSearch, setWidgetPreviewSearch] = useState("");
  const [properties, setProperties] = useState({
    prop1: "",
    prop2: "",
    prop3: "",
    prop4: "Select...",
  });

  const loadVersions = useCallback(async () => {
    try {
      const versions = await invoke("get_installed_mendix_versions");
      setVersions(versions);
    } catch (error) {
      console.error("Failed to load versions:", error);
    }
  }, []);

  const loadApps = useCallback(async () => {
    try {
      const apps = await invoke("get_installed_mendix_apps");
      setApps(apps);
    } catch (error) {
      console.error("Failed to load apps:", error);
    }
  }, []);

  useEffect(() => {
    loadVersions();
    loadApps();

    // Load widgets from localStorage
    const savedWidgets = localStorage.getItem("kirakiraWidgets");
    if (savedWidgets) {
      try {
        setWidgets(JSON.parse(savedWidgets));
      } catch (error) {
        console.error("Failed to load widgets from localStorage:", error);
      }
    }

    // Load selected apps from localStorage immediately
    const savedSelectedApps = localStorage.getItem("kirakiraSelectedApps");
    if (savedSelectedApps) {
      try {
        const selectedAppArray = JSON.parse(savedSelectedApps);
        console.log(
          "Loading selected apps from localStorage:",
          selectedAppArray,
        );
        setSelectedApps(new Set(selectedAppArray));
      } catch (error) {
        console.error("Failed to load selected apps from localStorage:", error);
      }
    }

    // Load selected widgets from localStorage immediately
    const savedSelectedWidgets = localStorage.getItem(
      "kirakiraSelectedWidgets",
    );
    if (savedSelectedWidgets) {
      try {
        const selectedWidgetArray = JSON.parse(savedSelectedWidgets);
        console.log(
          "Loading selected widgets from localStorage:",
          selectedWidgetArray,
        );
        setSelectedWidgets(new Set(selectedWidgetArray));
      } catch (error) {
        console.error(
          "Failed to load selected widgets from localStorage:",
          error,
        );
      }
    }
  }, [loadVersions, loadApps]);

  // Removed - selections are now loaded immediately on mount

  // Filter versions based on search term
  useEffect(() => {
    if (searchTerm) {
      setFilteredVersions(
        versions.filter((version) =>
          version.version.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );
    } else {
      setFilteredVersions(versions);
    }
  }, [versions, searchTerm]);

  // Filter apps based on version filter and search term
  useEffect(() => {
    let filtered = apps;

    // Apply version filter
    if (versionFilter !== "all") {
      filtered = filtered.filter((app) => app.version === versionFilter);
    }

    // Apply text search
    if (appSearchTerm) {
      filtered = filtered.filter((app) =>
        app.name.toLowerCase().includes(appSearchTerm.toLowerCase()),
      );
    }

    setFilteredApps(filtered);
    setCurrentPage(1);
    setHasMore(filtered.length > ITEMS_PER_PAGE);
  }, [apps, versionFilter, appSearchTerm]);

  // Filter widgets based on search term
  useEffect(() => {
    let filtered = widgets;

    if (widgetSearchTerm) {
      filtered = filtered.filter((widget) =>
        widget.caption.toLowerCase().includes(widgetSearchTerm.toLowerCase()),
      );
    }

    setFilteredWidgets(filtered);
  }, [widgets, widgetSearchTerm]);

  // Save selected apps to localStorage whenever they change
  // Commented out - now saving directly in handleAppClick
  // useEffect(() => {
  //   const selectedAppsArray = Array.from(selectedApps);
  //   console.log("Saving selected apps to localStorage:", selectedAppsArray);
  //   localStorage.setItem(
  //     "kirakiraSelectedApps",
  //     JSON.stringify(selectedAppsArray),
  //   );
  // }, [selectedApps]);

  // Save selected widgets to localStorage whenever they change
  // Commented out - now saving directly in widget click handler
  // useEffect(() => {
  //   const selectedWidgetsArray = Array.from(selectedWidgets);
  //   console.log(
  //     "Saving selected widgets to localStorage:",
  //     selectedWidgetsArray,
  //   );
  //   localStorage.setItem(
  //     "kirakiraSelectedWidgets",
  //     JSON.stringify(selectedWidgetsArray),
  //   );
  // }, [selectedWidgets]);

  // Removed cleanup effects - selections persist until explicitly changed by user

  const handleAppClick = (app) => {
    setSelectedApps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(app.path)) {
        newSet.delete(app.path);
        console.log(`Deselected app: ${app.path}`);
      } else {
        newSet.add(app.path);
        console.log(`Selected app: ${app.path}`);
      }

      // Save to localStorage immediately
      const selectedAppsArray = Array.from(newSet);
      console.log("Saving selected apps to localStorage:", selectedAppsArray);
      localStorage.setItem(
        "kirakiraSelectedApps",
        JSON.stringify(selectedAppsArray),
      );

      return newSet;
    });
  };

  // Memoized data
  const listData = useMemo(() => generateListData(20), []);

  // Pure update functions
  const updateProperty = useCallback((key, value) => {
    setProperties((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleLaunchStudioPro = useCallback(async (version) => {
    setIsLoading(true);

    try {
      await invoke("launch_studio_pro", {
        version: version.version,
      });

      // Reset loading state after a short delay
      setTimeout(() => {
        setIsLoading(false);
      }, 8000);
    } catch (error) {
      console.error("Failed to launch Studio Pro:", error);
      alert(`Failed to launch Studio Pro ${version.version}: ${error}`);
      setIsLoading(false);
    }
  }, []);

  const handleUninstallClick = useCallback(async (version) => {
    try {
      const relatedApps = await invoke("get_apps_by_version", {
        version: version.version,
      });
      setShowUninstallModal(true);
      setVersionToUninstall(version);
      setRelatedApps(relatedApps);
    } catch (error) {
      console.error("Failed to get related apps:", error);
      alert(`Failed to get related apps: ${error}`);
    }
  }, []);

  const handleUninstallStudioPro = useCallback(
    async (version, deleteApps = false, relatedAppsList = []) => {
      setIsLoading(true);

      try {
        // Delete related apps first if requested
        if (deleteApps && relatedAppsList.length > 0) {
          for (const app of relatedAppsList) {
            await invoke("delete_mendix_app", {
              appPath: app.path,
            });
          }
        }

        // Uninstall Studio Pro
        await invoke("uninstall_studio_pro", {
          version: version.version,
        });

        // Start monitoring folder deletion
        const monitorDeletion = setInterval(async () => {
          try {
            const folderExists = await invoke("check_version_folder_exists", {
              version: version.version,
            });

            if (!folderExists) {
              clearInterval(monitorDeletion);
              // Refresh lists
              await loadVersions();
              if (deleteApps) {
                await loadApps();
              }
              setIsLoading(false);
              setShowUninstallModal(false);
              setVersionToUninstall(null);
              setRelatedApps([]);
            }
          } catch (error) {
            console.error("Error monitoring folder deletion:", error);
          }
        }, 1000);

        // Fallback timeout after 60 seconds
        setTimeout(() => {
          clearInterval(monitorDeletion);
          setIsLoading(false);
          setShowUninstallModal(false);
          setVersionToUninstall(null);
          setRelatedApps([]);
        }, 60000);
      } catch (error) {
        const errorMsg = deleteApps
          ? `Failed to uninstall Studio Pro ${version.version} with apps: ${error}`
          : `Failed to uninstall Studio Pro ${version.version}: ${error}`;
        console.error(errorMsg);
        alert(errorMsg);
        setIsLoading(false);
        setShowUninstallModal(false);
        setVersionToUninstall(null);
        setRelatedApps([]);
      }
    },
    [loadVersions, loadApps],
  );

  const handleModalCancel = useCallback(() => {
    setShowUninstallModal(false);
    setVersionToUninstall(null);
    setRelatedApps([]);
  }, []);

  const handleItemClick = useCallback((item) => {
    console.log("Clicked:", item);
  }, []);

  const handleVersionClick = useCallback((version) => {
    setSelectedVersion((prev) =>
      prev === version.version ? null : version.version,
    );
  }, []);

  const sortedAndFilteredMendixApps = useMemo(() => {
    let filtered = apps.filter((app) =>
      app.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    if (selectedVersion) {
      // Sort apps: matching version first, then by last modified
      filtered.sort((a, b) => {
        const aMatches = a.version === selectedVersion;
        const bMatches = b.version === selectedVersion;

        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;

        // If both match or both don't match, sort by last modified
        if (a.last_modified && b.last_modified) {
          return new Date(b.last_modified) - new Date(a.last_modified);
        }
        return 0;
      });
    } else {
      // Default sort by last modified
      filtered.sort((a, b) => {
        if (a.last_modified && b.last_modified) {
          return new Date(b.last_modified) - new Date(a.last_modified);
        }
        return 0;
      });
    }

    return filtered;
  }, [apps, searchTerm, selectedVersion]);

  // Tab content renderers
  const renderStudioProManager = useCallback(
    () => (
      <div className="studio-pro-manager">
        <div className="list-container">
          <SearchBox
            placeholder="Search items..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <div className="list-area">
            {listData.filter(createSearchFilter(searchTerm)).map((item) => (
              <ListItem key={item.id} item={item} onClick={handleItemClick} />
            ))}
          </div>
        </div>
        <div className="list-container">
          <SearchBox
            placeholder="Search installed versions..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <div className="list-area">
            {filteredVersions.map((version) => (
              <MendixVersionListItem
                key={version.version}
                version={version}
                onLaunch={handleLaunchStudioPro}
                onUninstall={handleUninstallClick}
                isLaunching={isLoading}
                isUninstalling={isLoading}
                isSelected={selectedVersion === version.version}
                onClick={() => handleVersionClick(version)}
              />
            ))}
            {versions.length === 0 && (
              <div className="loading-indicator">
                <span className="loading-icon">🍓</span>
                <span>No Mendix Studio Pro versions found</span>
              </div>
            )}
          </div>
        </div>
        <div className="list-container narrow">
          <SearchBox
            placeholder="Search Mendix apps..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <div className="list-area">
            {sortedAndFilteredMendixApps.map((app) => (
              <MendixAppListItem
                key={app.name}
                app={app}
                isDisabled={selectedVersion && app.version !== selectedVersion}
                onClick={() => handleItemClick(app)}
              />
            ))}
            {apps.length === 0 && (
              <div className="loading-indicator">
                <span className="loading-icon">🍓</span>
                <span>No Mendix apps found</span>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    [
      searchTerm,
      versions,
      filteredVersions,
      selectedVersion,
      sortedAndFilteredMendixApps,
      listData,
      isLoading,
      handleLaunchStudioPro,
      handleUninstallClick,
      handleVersionClick,
      handleItemClick,
      apps,
    ],
  );

  const renderWidgetManager = useCallback(() => {
    // Create version filter options
    const versionOptions = [
      { value: "all", label: "🍓 All Versions" },
      ...versions.map((v) => ({
        value: v.version,
        label: `📦 ${v.version}`,
      })),
    ];

    // Get displayed apps (paginated)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const displayedApps = filteredApps.slice(startIndex, endIndex);

    return (
      <div className="widget-manager">
        <div className="list-container">
          <Dropdown
            value={versionFilter}
            onChange={setVersionFilter}
            options={versionOptions}
          />
          <SearchBox
            placeholder="Search Mendix apps..."
            value={appSearchTerm}
            onChange={setAppSearchTerm}
          />
          <div className="list-area">
            {displayedApps.map((app) => (
              <div
                key={app.path}
                className={`version-list-item ${selectedApps.has(app.path) ? "selected" : ""}`}
                onClick={() => handleAppClick(app)}
                style={{ cursor: "pointer" }}
              >
                <div className="version-info">
                  <span className="version-icon">
                    {selectedApps.has(app.path) ? "☑️" : "📁"}
                  </span>
                  <div className="version-details">
                    <span className="version-number">
                      {app.name}
                      {app.version && (
                        <span className="version-badge mts">
                          v{app.version}
                        </span>
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
            ))}
            {filteredApps.length === 0 && (
              <div className="loading-indicator">
                <span className="loading-icon">🍓</span>
                <span>No Mendix apps found</span>
              </div>
            )}
            {hasMore && displayedApps.length > 0 && (
              <div
                className="end-indicator"
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <span>Load more apps...</span>
              </div>
            )}
          </div>
        </div>
        <div className="list-container">
          <SearchBox
            placeholder="Search widgets by caption..."
            value={widgetSearchTerm}
            onChange={setWidgetSearchTerm}
          />
          <div className="list-area">
            {/* Add Widget Button - Always First Row */}
            <div
              className="version-list-item"
              onClick={() => {
                setShowWidgetModal(true);
                setShowAddWidgetForm(false);
                setNewWidgetCaption("");
                setNewWidgetPath("");
              }}
              style={{
                cursor: "pointer",
                backgroundColor: "rgba(255, 182, 193, 0.1)",
              }}
            >
              <div className="version-info">
                <span className="version-icon">➕</span>
                <div className="version-details">
                  <span className="version-number">Add New Widget</span>
                  <span className="version-date">Click to add a widget</span>
                </div>
              </div>
            </div>

            {/* Widget List */}
            {filteredWidgets.map((widget) => (
              <div
                key={widget.id}
                className={`version-list-item ${selectedWidgets.has(widget.id) ? "selected" : ""}`}
                onClick={() => {
                  setSelectedWidgets((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(widget.id)) {
                      newSet.delete(widget.id);
                      console.log(
                        `Deselected widget: ${widget.caption} (${widget.id})`,
                      );
                    } else {
                      newSet.add(widget.id);
                      console.log(
                        `Selected widget: ${widget.caption} (${widget.id})`,
                      );
                    }

                    // Save to localStorage immediately
                    const selectedWidgetsArray = Array.from(newSet);
                    console.log(
                      "Saving selected widgets to localStorage:",
                      selectedWidgetsArray,
                    );
                    localStorage.setItem(
                      "kirakiraSelectedWidgets",
                      JSON.stringify(selectedWidgetsArray),
                    );

                    return newSet;
                  });
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="version-info">
                  <span className="version-icon">
                    {selectedWidgets.has(widget.id) ? "☑️" : "🧩"}
                  </span>
                  <div className="version-details">
                    <span className="version-number">{widget.caption}</span>
                    <span className="version-date">{widget.path}</span>
                  </div>
                </div>
                <button
                  className="uninstall-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setWidgets((prev) => {
                      const newWidgets = prev.filter((w) => w.id !== widget.id);
                      localStorage.setItem(
                        "kirakiraWidgets",
                        JSON.stringify(newWidgets),
                      );
                      return newWidgets;
                    });
                    setSelectedWidgets((prev) => {
                      const newSet = new Set(prev);
                      newSet.delete(widget.id);

                      // Save to localStorage immediately
                      const newSelectedArray = Array.from(newSet);
                      console.log(
                        "Updating selected widgets after delete:",
                        newSelectedArray,
                      );
                      localStorage.setItem(
                        "kirakiraSelectedWidgets",
                        JSON.stringify(newSelectedArray),
                      );

                      return newSet;
                    });
                  }}
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(220, 20, 60, 0.2) 0%, rgba(220, 20, 60, 0.3) 100%)",
                    borderColor: "rgba(220, 20, 60, 0.4)",
                    padding: "4px 12px",
                    fontSize: "12px",
                  }}
                >
                  <span className="button-icon">🗑️</span>
                </button>
              </div>
            ))}

            {filteredWidgets.length === 0 && widgetSearchTerm === "" && (
              <div className="loading-indicator">
                <span className="loading-icon">🧩</span>
                <span>No widgets registered</span>
              </div>
            )}
            {filteredWidgets.length === 0 && widgetSearchTerm !== "" && (
              <div className="loading-indicator">
                <span className="loading-icon">🔍</span>
                <span>No widgets found matching "{widgetSearchTerm}"</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }, [
    appSearchTerm,
    versionFilter,
    filteredApps,
    selectedApps,
    versions,
    currentPage,
    hasMore,
    widgets,
    filteredWidgets,
    widgetSearchTerm,
    selectedWidgets,
    listData,
    handleItemClick,
    setVersionFilter,
    setAppSearchTerm,
    handleAppClick,
  ]);

  const renderWidgetPreview = useCallback(
    () => (
      <div className="widget-preview">
        <div className="preview-left">
          <SearchBox
            placeholder="Search components..."
            value={widgetPreviewSearch}
            onChange={setWidgetPreviewSearch}
          />
          <ListArea
            items={listData}
            searchTerm={widgetPreviewSearch}
            onItemClick={handleItemClick}
          />
        </div>
        <div className="preview-middle">
          <h3>🍓 Properties</h3>
          <div className="property-section">
            <PropertyInput
              label="Berry Name"
              type="text"
              value={properties.prop1}
              onChange={(value) => updateProperty("prop1", value)}
            />
            <PropertyInput
              label="Berry Color"
              type="text"
              value={properties.prop2}
              onChange={(value) => updateProperty("prop2", value)}
            />
            <PropertyInput
              label="Description"
              type="textarea"
              value={properties.prop3}
              onChange={(value) => updateProperty("prop3", value)}
            />
            <PropertyInput
              label="Berry Type"
              type="select"
              value={properties.prop4}
              onChange={(value) => updateProperty("prop4", value)}
              options={["Select...", "Sweet", "Sour", "Sparkly"]}
            />
          </div>
        </div>
        <div className="preview-right">
          <h3>✨ Widget Preview</h3>
          <div className="widget-content">
            <div className="preview-placeholder">
              <span className="berry-icon">🍓</span>
              <p>Widget content will sparkle here</p>
              <div className="sparkle-animation">✨ ✨ ✨</div>
            </div>
          </div>
        </div>
      </div>
    ),
    [
      widgetPreviewSearch,
      properties,
      listData,
      updateProperty,
      handleItemClick,
    ],
  );

  // Tab configuration
  const tabs = useMemo(
    () => [
      {
        id: "studio-pro",
        label: "Studio Pro Manager",
        renderer: renderStudioProManager,
      },
      {
        id: "widget-manager",
        label: "Widget Manager",
        renderer: renderWidgetManager,
      },
      {
        id: "widget-preview",
        label: "Widget Preview",
        renderer: renderWidgetPreview,
      },
    ],
    [renderStudioProManager, renderWidgetManager, renderWidgetPreview],
  );

  const activeTabContent = useMemo(
    () => tabs.find((tab) => tab.id === activeTab)?.renderer(),
    [tabs, activeTab],
  );

  return (
    <main className="app-container">
      <div className="app-header">
        <h1 className="app-title">
          <span className="title-icon">🍓</span>
          Kirakira Ichigo Manager
          <span className="title-sparkle">✨</span>
        </h1>
      </div>

      <div className="tabs">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            label={tab.label}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      <div className="tab-content">{activeTabContent}</div>

      {showWidgetModal && !showAddWidgetForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Widget Action</h3>
            </div>
            <div className="modal-body">
              <p>Choose an action for widget management:</p>
            </div>
            <div className="modal-footer">
              <button
                className="modal-button cancel-button"
                onClick={() => setShowWidgetModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-button"
                disabled
                style={{
                  opacity: 0.5,
                  cursor: "not-allowed",
                  background:
                    "linear-gradient(135deg, rgba(169, 169, 169, 0.3) 0%, rgba(169, 169, 169, 0.5) 100%)",
                }}
              >
                Create Widget (Coming Soon)
              </button>
              <button
                className="modal-button confirm-button"
                onClick={() => setShowAddWidgetForm(true)}
              >
                Add Existing Widget
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showUninstallModal}
        title="Confirm Uninstall"
        message={
          versionToUninstall
            ? `Are you sure you want to uninstall Studio Pro ${versionToUninstall.version}?\n\nThis action cannot be undone.`
            : ""
        }
        onConfirm={async () => {
          if (versionToUninstall) {
            await handleUninstallStudioPro(
              versionToUninstall,
              false,
              relatedApps,
            );
          }
        }}
        onConfirmWithApps={
          relatedApps.length > 0
            ? async () => {
                if (versionToUninstall) {
                  await handleUninstallStudioPro(
                    versionToUninstall,
                    true,
                    relatedApps,
                  );
                }
              }
            : null
        }
        onCancel={handleModalCancel}
        isLoading={isLoading}
        relatedApps={relatedApps}
      />

      <ConfirmModal
        isOpen={showAppDeleteModal}
        title="Confirm Delete"
        message={
          appToDelete
            ? `Are you sure you want to delete ${appToDelete.name}?\n\nThis action cannot be undone.`
            : ""
        }
        onConfirm={async () => {
          if (appToDelete) {
            setIsLoading(true);
            try {
              await invoke("delete_mendix_app", { appPath: appToDelete.path });
              await loadApps();

              // Remove from selected apps if it was selected
              setSelectedApps((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(appToDelete.path)) {
                  newSet.delete(appToDelete.path);

                  // Save to localStorage immediately
                  const selectedAppsArray = Array.from(newSet);
                  console.log(
                    "Updating selected apps after delete:",
                    selectedAppsArray,
                  );
                  localStorage.setItem(
                    "kirakiraSelectedApps",
                    JSON.stringify(selectedAppsArray),
                  );
                }
                return newSet;
              });

              setIsLoading(false);
              setShowAppDeleteModal(false);
              setAppToDelete(null);
            } catch (error) {
              console.error("Failed to delete app:", error);
              alert(`Failed to delete app: ${error}`);
              setIsLoading(false);
              setShowAppDeleteModal(false);
              setAppToDelete(null);
            }
          }
        }}
        onCancel={() => {
          setShowAppDeleteModal(false);
          setAppToDelete(null);
        }}
        isLoading={isLoading}
        relatedApps={[]}
      />

      {/* Add Widget Form Modal */}
      {showAddWidgetForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Widget</h3>
            </div>
            <div className="modal-body">
              <label className="property-label">
                <span className="label-text">Widget Caption</span>
                <input
                  type="text"
                  className="property-input"
                  value={newWidgetCaption}
                  onChange={(e) => setNewWidgetCaption(e.target.value)}
                  placeholder="Enter widget caption"
                />
              </label>
              <label className="property-label">
                <span className="label-text">Absolute Path</span>
                <input
                  type="text"
                  className="property-input"
                  value={newWidgetPath}
                  onChange={(e) => setNewWidgetPath(e.target.value)}
                  placeholder="C:\path\to\widget\folder"
                />
              </label>
            </div>
            <div className="modal-footer">
              <button
                className="modal-button cancel-button"
                onClick={() => {
                  setShowAddWidgetForm(false);
                  setShowWidgetModal(false);
                  setNewWidgetCaption("");
                  setNewWidgetPath("");
                }}
              >
                Cancel
              </button>
              <button
                className="modal-button confirm-button"
                onClick={() => {
                  if (newWidgetCaption && newWidgetPath) {
                    setWidgets((prev) => {
                      const newWidgets = [
                        ...prev,
                        {
                          id: Date.now().toString(),
                          caption: newWidgetCaption,
                          path: newWidgetPath,
                        },
                      ];
                      localStorage.setItem(
                        "kirakiraWidgets",
                        JSON.stringify(newWidgets),
                      );
                      return newWidgets;
                    });
                    setShowAddWidgetForm(false);
                    setShowWidgetModal(false);
                    setNewWidgetCaption("");
                    setNewWidgetPath("");
                  }
                }}
                disabled={!newWidgetCaption || !newWidgetPath}
              >
                Add Widget
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
