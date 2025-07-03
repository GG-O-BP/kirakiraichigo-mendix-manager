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
        studioProVersions: [],
        installedVersions: [],
        installingVersion: null,
        downloadProgress: 0,
        selectedProjects: [],
        versionsPagination: {
            offset: 0,
            limit: 10,
            hasMore: true,
            isLoading: false,
            totalCount: 0,
        },
    });

    // Fetch Studio Pro versions on mount
    useEffect(() => {
        const fetchInitialVersions = async () => {
            try {
                setState((prev) => ({
                    ...prev,
                    versionsPagination: {
                        ...prev.versionsPagination,
                        isLoading: true,
                    },
                }));

                const response = await invoke(
                    "fetch_studio_pro_versions_paginated",
                    {
                        offset: 0,
                        limit: 10,
                    },
                );
                const installed = await invoke("get_installed_versions");

                setState((prev) => ({
                    ...prev,
                    studioProVersions: response.versions,
                    installedVersions: installed,
                    versionsPagination: {
                        offset: response.next_offset || 0,
                        limit: 10,
                        hasMore: response.has_more,
                        isLoading: false,
                        totalCount: response.total_count,
                    },
                }));
            } catch (error) {
                console.error("Failed to fetch versions:", error);
                setState((prev) => ({
                    ...prev,
                    versionsPagination: {
                        ...prev.versionsPagination,
                        isLoading: false,
                    },
                }));
            }
        };

        fetchInitialVersions();
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

    const loadMoreVersions = useCallback(async () => {
        if (
            state.versionsPagination.isLoading ||
            !state.versionsPagination.hasMore
        ) {
            return;
        }

        setState((prev) => ({
            ...prev,
            versionsPagination: {
                ...prev.versionsPagination,
                isLoading: true,
            },
        }));

        try {
            const response = await invoke(
                "fetch_studio_pro_versions_paginated",
                {
                    offset: state.versionsPagination.offset,
                    limit: state.versionsPagination.limit,
                },
            );

            setState((prev) => ({
                ...prev,
                studioProVersions: [
                    ...prev.studioProVersions,
                    ...response.versions,
                ],
                versionsPagination: {
                    offset:
                        response.next_offset || prev.versionsPagination.offset,
                    limit: prev.versionsPagination.limit,
                    hasMore: response.has_more,
                    isLoading: false,
                    totalCount: response.total_count,
                },
            }));
        } catch (error) {
            console.error("Failed to load more versions:", error);
            setState((prev) => ({
                ...prev,
                versionsPagination: {
                    ...prev.versionsPagination,
                    isLoading: false,
                },
            }));
        }
    }, [state.versionsPagination]);

    const handleInstallVersion = useCallback(async (version) => {
        setState((prev) => ({
            ...prev,
            installingVersion: version.version,
            downloadProgress: 0,
        }));

        try {
            await invoke("download_and_install_studio_pro", {
                version: version.version,
                downloadUrl: version.download_url,
            });

            // Refresh installed versions
            const installed = await invoke("get_installed_versions");
            setState((prev) => ({
                ...prev,
                installedVersions: installed,
                installingVersion: null,
                downloadProgress: 0,
            }));
        } catch (error) {
            console.error("Installation failed:", error);
            setState((prev) => ({
                ...prev,
                installingVersion: null,
                downloadProgress: 0,
            }));
        }
    }, []);

    const handleItemClick = useCallback((item) => {
        console.log("Clicked:", item);
    }, []);

    const handleScrollVersionsList = useCallback(
        (event) => {
            const element = event.target;
            const threshold = 100; // pixels from bottom to trigger load
            const isNearBottom =
                element.scrollHeight -
                    element.scrollTop -
                    element.clientHeight <
                threshold;

            if (
                isNearBottom &&
                state.versionsPagination.hasMore &&
                !state.versionsPagination.isLoading
            ) {
                loadMoreVersions();
            }
        },
        [state.versionsPagination, loadMoreVersions],
    );

    // Tab content renderers
    const renderStudioProManager = useCallback(
        () => (
            <div className="studio-pro-manager">
                <div className="list-container">
                    <SearchBox
                        placeholder="Search versions..."
                        value={state.searches.studioProSearch1}
                        onChange={(value) =>
                            updateSearch("studioProSearch1", value)
                        }
                    />
                    <div
                        className="list-area"
                        onScroll={handleScrollVersionsList}
                    >
                        {state.studioProVersions
                            .filter(
                                createSearchFilter(
                                    state.searches.studioProSearch1,
                                ),
                            )
                            .map((version) => (
                                <VersionListItem
                                    key={version.version}
                                    version={version}
                                    onInstall={handleInstallVersion}
                                    isInstalling={
                                        state.installingVersion ===
                                        version.version
                                    }
                                    downloadProgress={state.downloadProgress}
                                />
                            ))}
                        {state.versionsPagination.isLoading && (
                            <div className="loading-indicator">
                                <span className="loading-icon">🍓</span>
                                <span>Loading more versions...</span>
                            </div>
                        )}
                        {!state.versionsPagination.hasMore &&
                            state.studioProVersions.length > 0 && (
                                <div className="end-indicator">
                                    <span>✨ All versions loaded ✨</span>
                                </div>
                            )}
                    </div>
                </div>
                <div className="list-container">
                    <SearchBox
                        placeholder="Installed versions..."
                        value={state.searches.studioProSearch2}
                        onChange={(value) =>
                            updateSearch("studioProSearch2", value)
                        }
                    />
                    <div className="list-area">
                        {state.installedVersions
                            .filter(
                                createSearchFilter(
                                    state.searches.studioProSearch2,
                                ),
                            )
                            .map((version) => (
                                <div key={version} className="list-item">
                                    <span className="item-icon">✅</span>
                                    <span className="item-label">
                                        {version}
                                    </span>
                                    <span className="item-sparkle">·</span>
                                </div>
                            ))}
                    </div>
                </div>
                <div className="list-container narrow">
                    <SearchBox
                        placeholder="Recent projects..."
                        value={state.searches.studioProSearch3}
                        onChange={(value) =>
                            updateSearch("studioProSearch3", value)
                        }
                    />
                    <ListArea
                        items={listData}
                        searchTerm={state.searches.studioProSearch3}
                        onItemClick={handleItemClick}
                    />
                </div>
            </div>
        ),
        [
            state.searches,
            state.studioProVersions,
            state.installedVersions,
            state.installingVersion,
            state.downloadProgress,
            listData,
            updateSearch,
            handleInstallVersion,
            handleItemClick,
            handleScrollVersionsList,
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
        </main>
    );
}

export default App;
