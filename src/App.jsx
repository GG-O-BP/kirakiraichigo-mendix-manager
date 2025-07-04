import { useState, useCallback, useMemo, useEffect } from "react";
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
    return (item.label || item.version || "")
        .toLowerCase()
        .includes(searchLower);
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
                    {version.is_valid && (
                        <span className="version-badge lts">✓</span>
                    )}
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
                    {version.is_lts && (
                        <span className="version-badge lts">LTS</span>
                    )}
                    {version.is_mts && (
                        <span className="version-badge mts">MTS</span>
                    )}
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
                <span className="progress-text">
                    {Math.round(downloadProgress)}%
                </span>
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
        () =>
            searchTerm ? items.filter(createSearchFilter(searchTerm)) : items,
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
                                    <li
                                        key={app.name}
                                        className="related-app-item"
                                    >
                                        <span className="app-icon">📱</span>
                                        <span className="app-name">
                                            {app.name}
                                        </span>
                                        <span className="app-version">
                                            v{app.version}
                                        </span>
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
                    {onConfirmWithApps &&
                        relatedApps &&
                        relatedApps.length > 0 && (
                            <button
                                className="modal-button confirm-with-apps-button"
                                onClick={onConfirmWithApps}
                                disabled={isLoading}
                            >
                                {isLoading
                                    ? "Processing..."
                                    : "Uninstall + Delete Apps"}
                            </button>
                        )}
                </div>
            </div>
        </div>
    );
};

// Main App component
function App() {
    // State management using immutable updates
    const [state, setState] = useState({
        activeTab: "studio-pro",
        searches: {
            studioProSearch1: "",
            studioProSearch2: "",
            studioProSearch3: "",
            widgetManagerSearch1: "",
            widgetManagerSearch2: "",
            widgetPreviewSearch: "",
        },
        selectedDropdown: "option1",
        properties: {
            prop1: "",
            prop2: "",
            prop3: "",
            prop4: "Select...",
        },
        mendixVersions: [],
        mendixApps: [],
        selectedVersion: null,
        launchingVersion: null,
        uninstallingVersion: null,
        selectedProjects: [],
        modal: {
            isOpen: false,
            title: "",
            message: "",
            onConfirm: null,
            onConfirmWithApps: null,
            isLoading: false,
            relatedApps: [],
        },
    });

    // Fetch Mendix versions and apps on mount
    useEffect(() => {
        const fetchMendixVersions = async () => {
            try {
                const versions = await invoke("get_installed_mendix_versions");
                setState((prev) => ({
                    ...prev,
                    mendixVersions: versions,
                }));
            } catch (error) {
                console.error("Failed to fetch Mendix versions:", error);
            }
        };

        const fetchMendixApps = async () => {
            try {
                const apps = await invoke("get_installed_mendix_apps");
                setState((prev) => ({
                    ...prev,
                    mendixApps: apps,
                }));
            } catch (error) {
                console.error("Failed to fetch Mendix apps:", error);
            }
        };

        fetchMendixVersions();
        fetchMendixApps();
    }, []);

    // Memoized data
    const listData = useMemo(() => generateListData(20), []);
    const dropdownOptions = useMemo(
        () => [
            { value: "option1", label: "🍓 Berry Mode" },
            { value: "option2", label: "🌸 Sakura Mode" },
            { value: "option3", label: "🌙 Night Mode" },
        ],
        [],
    );

    // Pure update functions
    const updateSearch = useCallback((key, value) => {
        setState((prevState) => ({
            ...prevState,
            searches: {
                ...prevState.searches,
                [key]: value,
            },
        }));
    }, []);

    const updateProperty = useCallback((key, value) => {
        setState((prevState) => ({
            ...prevState,
            properties: {
                ...prevState.properties,
                [key]: value,
            },
        }));
    }, []);

    const setActiveTab = useCallback((tab) => {
        setState((prevState) => ({
            ...prevState,
            activeTab: tab,
        }));
    }, []);

    const setSelectedDropdown = useCallback((value) => {
        setState((prevState) => ({
            ...prevState,
            selectedDropdown: value,
        }));
    }, []);

    const handleLaunchStudioPro = useCallback(async (version) => {
        setState((prev) => ({
            ...prev,
            launchingVersion: version.version,
        }));

        try {
            await invoke("launch_studio_pro", {
                version: version.version,
            });

            // Reset launching state after a short delay
            setTimeout(() => {
                setState((prev) => ({
                    ...prev,
                    launchingVersion: null,
                }));
            }, 8000);
        } catch (error) {
            console.error("Failed to launch Studio Pro:", error);
            alert(`Failed to launch Studio Pro ${version.version}: ${error}`);
            setState((prev) => ({
                ...prev,
                launchingVersion: null,
            }));
        }
    }, []);

    const handleUninstallStudioPro = useCallback(async (version) => {
        // First, get related apps
        try {
            const relatedApps = await invoke("get_apps_by_version", {
                version: version.version,
            });

            const uninstallStudioProOnly = async () => {
                setState((prev) => ({
                    ...prev,
                    modal: { ...prev.modal, isLoading: true },
                    uninstallingVersion: version.version,
                }));

                try {
                    await invoke("uninstall_studio_pro", {
                        version: version.version,
                    });

                    // Start monitoring folder deletion
                    const monitorDeletion = setInterval(async () => {
                        try {
                            const folderExists = await invoke(
                                "check_version_folder_exists",
                                {
                                    version: version.version,
                                },
                            );

                            if (!folderExists) {
                                clearInterval(monitorDeletion);
                                // Refresh the versions list after folder is deleted
                                const versions = await invoke(
                                    "get_installed_mendix_versions",
                                );
                                setState((prev) => ({
                                    ...prev,
                                    mendixVersions: versions,
                                    uninstallingVersion: null,
                                    modal: {
                                        isOpen: false,
                                        title: "",
                                        message: "",
                                        onConfirm: null,
                                        onConfirmWithApps: null,
                                        isLoading: false,
                                        relatedApps: [],
                                    },
                                }));
                            }
                        } catch (error) {
                            console.error(
                                "Error monitoring folder deletion:",
                                error,
                            );
                        }
                    }, 1000); // Check every second

                    // Fallback timeout after 60 seconds
                    setTimeout(() => {
                        clearInterval(monitorDeletion);
                        setState((prev) => ({
                            ...prev,
                            uninstallingVersion: null,
                            modal: {
                                isOpen: false,
                                title: "",
                                message: "",
                                onConfirm: null,
                                onConfirmWithApps: null,
                                isLoading: false,
                                relatedApps: [],
                            },
                        }));
                    }, 60000);
                } catch (error) {
                    console.error("Failed to uninstall Studio Pro:", error);
                    alert(
                        `Failed to uninstall Studio Pro ${version.version}: ${error}`,
                    );
                    setState((prev) => ({
                        ...prev,
                        uninstallingVersion: null,
                        modal: {
                            isOpen: false,
                            title: "",
                            message: "",
                            onConfirm: null,
                            onConfirmWithApps: null,
                            isLoading: false,
                            relatedApps: [],
                        },
                    }));
                }
            };

            const uninstallStudioProWithApps = async () => {
                setState((prev) => ({
                    ...prev,
                    modal: { ...prev.modal, isLoading: true },
                    uninstallingVersion: version.version,
                }));

                try {
                    // First delete all related apps
                    for (const app of relatedApps) {
                        await invoke("delete_mendix_app", {
                            appPath: app.path,
                        });
                    }

                    // Then uninstall Studio Pro
                    await invoke("uninstall_studio_pro", {
                        version: version.version,
                    });

                    // Start monitoring folder deletion
                    const monitorDeletion = setInterval(async () => {
                        try {
                            const folderExists = await invoke(
                                "check_version_folder_exists",
                                {
                                    version: version.version,
                                },
                            );

                            if (!folderExists) {
                                clearInterval(monitorDeletion);
                                // Refresh both versions and apps lists
                                const versions = await invoke(
                                    "get_installed_mendix_versions",
                                );
                                const apps = await invoke(
                                    "get_installed_mendix_apps",
                                );
                                setState((prev) => ({
                                    ...prev,
                                    mendixVersions: versions,
                                    mendixApps: apps,
                                    uninstallingVersion: null,
                                    modal: {
                                        isOpen: false,
                                        title: "",
                                        message: "",
                                        onConfirm: null,
                                        onConfirmWithApps: null,
                                        isLoading: false,
                                        relatedApps: [],
                                    },
                                }));
                            }
                        } catch (error) {
                            console.error(
                                "Error monitoring folder deletion:",
                                error,
                            );
                        }
                    }, 1000); // Check every second

                    // Fallback timeout after 60 seconds
                    setTimeout(() => {
                        clearInterval(monitorDeletion);
                        setState((prev) => ({
                            ...prev,
                            uninstallingVersion: null,
                            modal: {
                                isOpen: false,
                                title: "",
                                message: "",
                                onConfirm: null,
                                onConfirmWithApps: null,
                                isLoading: false,
                                relatedApps: [],
                            },
                        }));
                    }, 60000);
                } catch (error) {
                    console.error(
                        "Failed to uninstall Studio Pro with apps:",
                        error,
                    );
                    alert(
                        `Failed to uninstall Studio Pro ${version.version} with apps: ${error}`,
                    );
                    setState((prev) => ({
                        ...prev,
                        uninstallingVersion: null,
                        modal: {
                            isOpen: false,
                            title: "",
                            message: "",
                            onConfirm: null,
                            onConfirmWithApps: null,
                            isLoading: false,
                            relatedApps: [],
                        },
                    }));
                }
            };

            setState((prev) => ({
                ...prev,
                modal: {
                    isOpen: true,
                    title: "Confirm Uninstall",
                    message: `Are you sure you want to uninstall Studio Pro ${version.version}?\n\nThis action cannot be undone.`,
                    onConfirm: uninstallStudioProOnly,
                    onConfirmWithApps:
                        relatedApps.length > 0
                            ? uninstallStudioProWithApps
                            : null,
                    isLoading: false,
                    relatedApps: relatedApps,
                },
            }));
        } catch (error) {
            console.error("Failed to get related apps:", error);
            alert(`Failed to get related apps: ${error}`);
        }
    }, []);

    const handleModalCancel = useCallback(() => {
        setState((prev) => ({
            ...prev,
            modal: {
                isOpen: false,
                title: "",
                message: "",
                onConfirm: null,
                onConfirmWithApps: null,
                isLoading: false,
                relatedApps: [],
            },
        }));
    }, []);

    const handleItemClick = useCallback((item) => {
        console.log("Clicked:", item);
    }, []);

    const refreshMendixVersions = useCallback(async () => {
        try {
            const versions = await invoke("get_installed_mendix_versions");
            setState((prev) => ({
                ...prev,
                mendixVersions: versions,
            }));
        } catch (error) {
            console.error("Failed to refresh Mendix versions:", error);
        }
    }, []);

    const handleVersionClick = useCallback((version) => {
        setState((prev) => ({
            ...prev,
            selectedVersion:
                prev.selectedVersion === version.version
                    ? null
                    : version.version,
        }));
    }, []);

    const sortedAndFilteredMendixApps = useMemo(() => {
        let filteredApps = state.mendixApps.filter((app) =>
            app.name
                .toLowerCase()
                .includes(state.searches.studioProSearch3.toLowerCase()),
        );

        if (state.selectedVersion) {
            // Sort apps: matching version first, then by last modified
            filteredApps.sort((a, b) => {
                const aMatches = a.version === state.selectedVersion;
                const bMatches = b.version === state.selectedVersion;

                if (aMatches && !bMatches) return -1;
                if (!aMatches && bMatches) return 1;

                // If both match or both don't match, sort by last modified
                if (a.last_modified && b.last_modified) {
                    return (
                        new Date(b.last_modified) - new Date(a.last_modified)
                    );
                }
                return 0;
            });
        } else {
            // Default sort by last modified
            filteredApps.sort((a, b) => {
                if (a.last_modified && b.last_modified) {
                    return (
                        new Date(b.last_modified) - new Date(a.last_modified)
                    );
                }
                return 0;
            });
        }

        return filteredApps;
    }, [
        state.mendixApps,
        state.searches.studioProSearch3,
        state.selectedVersion,
    ]);

    // Tab content renderers
    const renderStudioProManager = useCallback(
        () => (
            <div className="studio-pro-manager">
                <div className="list-container">
                    <SearchBox
                        placeholder="Search items..."
                        value={state.searches.studioProSearch1}
                        onChange={(value) =>
                            updateSearch("studioProSearch1", value)
                        }
                    />
                    <div className="list-area">
                        {listData
                            .filter(
                                createSearchFilter(
                                    state.searches.studioProSearch1,
                                ),
                            )
                            .map((item) => (
                                <ListItem
                                    key={item.id}
                                    item={item}
                                    onClick={handleItemClick}
                                />
                            ))}
                    </div>
                </div>
                <div className="list-container">
                    <SearchBox
                        placeholder="Search installed versions..."
                        value={state.searches.studioProSearch2}
                        onChange={(value) =>
                            updateSearch("studioProSearch2", value)
                        }
                    />
                    <div className="list-area">
                        {state.mendixVersions
                            .filter((version) =>
                                version.version
                                    .toLowerCase()
                                    .includes(
                                        state.searches.studioProSearch2.toLowerCase(),
                                    ),
                            )
                            .map((version) => (
                                <MendixVersionListItem
                                    key={version.version}
                                    version={version}
                                    onLaunch={handleLaunchStudioPro}
                                    onUninstall={handleUninstallStudioPro}
                                    isLaunching={
                                        state.launchingVersion ===
                                        version.version
                                    }
                                    isUninstalling={
                                        state.uninstallingVersion ===
                                        version.version
                                    }
                                    isSelected={
                                        state.selectedVersion ===
                                        version.version
                                    }
                                    onClick={() => handleVersionClick(version)}
                                />
                            ))}
                        {state.mendixVersions.length === 0 && (
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
                        value={state.searches.studioProSearch3}
                        onChange={(value) =>
                            updateSearch("studioProSearch3", value)
                        }
                    />
                    <div className="list-area">
                        {sortedAndFilteredMendixApps.map((app) => (
                            <MendixAppListItem
                                key={app.name}
                                app={app}
                                isDisabled={
                                    state.selectedVersion &&
                                    app.version !== state.selectedVersion
                                }
                                onClick={() => handleItemClick(app)}
                            />
                        ))}
                        {state.mendixApps.length === 0 && (
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
            state.searches,
            state.mendixVersions,
            state.selectedVersion,
            state.launchingVersion,
            sortedAndFilteredMendixApps,
            listData,
            updateSearch,
            handleLaunchStudioPro,
            handleVersionClick,
            handleItemClick,
        ],
    );

    const renderWidgetManager = useCallback(
        () => (
            <div className="widget-manager">
                <div className="list-container">
                    <Dropdown
                        value={state.selectedDropdown}
                        onChange={setSelectedDropdown}
                        options={dropdownOptions}
                    />
                    <SearchBox
                        placeholder="Find widgets..."
                        value={state.searches.widgetManagerSearch1}
                        onChange={(value) =>
                            updateSearch("widgetManagerSearch1", value)
                        }
                    />
                    <ListArea
                        items={listData}
                        searchTerm={state.searches.widgetManagerSearch1}
                        onItemClick={handleItemClick}
                    />
                </div>
                <div className="list-container">
                    <SearchBox
                        placeholder="Search widgets..."
                        value={state.searches.widgetManagerSearch2}
                        onChange={(value) =>
                            updateSearch("widgetManagerSearch2", value)
                        }
                    />
                    <ListArea
                        items={listData}
                        searchTerm={state.searches.widgetManagerSearch2}
                        onItemClick={handleItemClick}
                    />
                </div>
            </div>
        ),
        [
            state.searches,
            state.selectedDropdown,
            listData,
            dropdownOptions,
            updateSearch,
            setSelectedDropdown,
            handleItemClick,
        ],
    );

    const renderWidgetPreview = useCallback(
        () => (
            <div className="widget-preview">
                <div className="preview-left">
                    <SearchBox
                        placeholder="Search components..."
                        value={state.searches.widgetPreviewSearch}
                        onChange={(value) =>
                            updateSearch("widgetPreviewSearch", value)
                        }
                    />
                    <ListArea
                        items={listData}
                        searchTerm={state.searches.widgetPreviewSearch}
                        onItemClick={handleItemClick}
                    />
                </div>
                <div className="preview-middle">
                    <h3>🍓 Properties</h3>
                    <div className="property-section">
                        <PropertyInput
                            label="Berry Name"
                            type="text"
                            value={state.properties.prop1}
                            onChange={(value) => updateProperty("prop1", value)}
                        />
                        <PropertyInput
                            label="Berry Color"
                            type="text"
                            value={state.properties.prop2}
                            onChange={(value) => updateProperty("prop2", value)}
                        />
                        <PropertyInput
                            label="Description"
                            type="textarea"
                            value={state.properties.prop3}
                            onChange={(value) => updateProperty("prop3", value)}
                        />
                        <PropertyInput
                            label="Berry Type"
                            type="select"
                            value={state.properties.prop4}
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
            state.searches,
            state.properties,
            listData,
            updateSearch,
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
        () => tabs.find((tab) => tab.id === state.activeTab)?.renderer(),
        [tabs, state.activeTab],
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
                        isActive={state.activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id)}
                    />
                ))}
            </div>

            <div className="tab-content">{activeTabContent}</div>

            <ConfirmModal
                isOpen={state.modal.isOpen}
                title={state.modal.title}
                message={state.modal.message}
                onConfirm={state.modal.onConfirm}
                onConfirmWithApps={state.modal.onConfirmWithApps}
                onCancel={handleModalCancel}
                isLoading={state.modal.isLoading}
                relatedApps={state.modal.relatedApps}
            />
        </main>
    );
}

export default App;
