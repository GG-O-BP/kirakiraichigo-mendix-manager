import * as R from "ramda";
import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

// Import functional utilities
import {
  STORAGE_KEYS,
  PACKAGE_MANAGERS,
  ITEMS_PER_PAGE,
  generateListData,
  loadFromStorage,
  saveToStorage,
  wrapAsync,
  arrayToSet,
  setToArray,
  toggleInSet,
  createWidget,
  filterAppsByVersionAndSearch,
  hasMorePages,
  createTab,
  findActiveTab,
  validateRequired,
  updateProp,
} from "./utils/functional";

// Import components
import { TabButton, ConfirmModal } from "./components/common";
import {
  StudioProManager,
  WidgetManager,
  WidgetPreview,
} from "./components/tabs";
import { WidgetModal, BuildResultModal } from "./components/modals";

// Initial state factory
const createInitialState = () => ({
  // Tab state
  activeTab: "studio-pro",

  // Core data
  versions: [],
  apps: [],
  widgets: loadFromStorage(STORAGE_KEYS.WIDGETS, []),

  // Filtered data
  filteredVersions: [],
  filteredApps: [],
  filteredWidgets: [],

  // Search terms
  searchTerm: "",
  appSearchTerm: "",
  widgetSearchTerm: "",
  widgetPreviewSearch: "",

  // Selections
  selectedApps: arrayToSet(loadFromStorage(STORAGE_KEYS.SELECTED_APPS, [])),
  selectedWidgets: arrayToSet(
    loadFromStorage(STORAGE_KEYS.SELECTED_WIDGETS, []),
  ),
  selectedVersion: null,
  selectedApp: null,

  // UI states
  versionFilter: "all",
  isLoading: false,
  downloadProgress: {},
  currentPage: 1,
  hasMore: true,

  // Modal states
  showUninstallModal: false,
  versionToUninstall: null,
  relatedApps: [],
  showAppDeleteModal: false,
  appToDelete: null,
  showWidgetModal: false,
  showAddWidgetForm: false,
  showResultModal: false,

  // Form states
  newWidgetCaption: "",
  newWidgetPath: "",
  properties: {
    prop1: "",
    prop2: "",
    prop3: "",
    prop4: "Select...",
  },

  // Package manager
  packageManager: loadFromStorage(STORAGE_KEYS.PACKAGE_MANAGER, "npm"),
  isInstalling: false,
  isBuilding: false,
  buildResults: {
    successful: [],
    failed: [],
  },
});

// Main App component with functional approach
function App() {
  // Initialize state using factory
  const initialState = useMemo(createInitialState, []);

  // Core state
  const [activeTab, setActiveTab] = useState(initialState.activeTab);
  const [versions, setVersions] = useState(initialState.versions);
  const [apps, setApps] = useState(initialState.apps);
  const [widgets, setWidgets] = useState(initialState.widgets);

  // Filtered state
  const [filteredVersions, setFilteredVersions] = useState(
    initialState.filteredVersions,
  );
  const [filteredApps, setFilteredApps] = useState(initialState.filteredApps);
  const [filteredWidgets, setFilteredWidgets] = useState(
    initialState.filteredWidgets,
  );

  // Search state
  const [searchTerm, setSearchTerm] = useState(initialState.searchTerm);
  const [appSearchTerm, setAppSearchTerm] = useState(
    initialState.appSearchTerm,
  );
  const [widgetSearchTerm, setWidgetSearchTerm] = useState(
    initialState.widgetSearchTerm,
  );
  const [widgetPreviewSearch, setWidgetPreviewSearch] = useState(
    initialState.widgetPreviewSearch,
  );

  // Selection state
  const [selectedApps, setSelectedApps] = useState(initialState.selectedApps);
  const [selectedWidgets, setSelectedWidgets] = useState(
    initialState.selectedWidgets,
  );
  const [selectedVersion, setSelectedVersion] = useState(
    initialState.selectedVersion,
  );
  const [selectedApp, setSelectedApp] = useState(initialState.selectedApp);

  // UI state
  const [versionFilter, setVersionFilter] = useState(
    initialState.versionFilter,
  );
  const [isLoading, setIsLoading] = useState(initialState.isLoading);
  const [downloadProgress, setDownloadProgress] = useState(
    initialState.downloadProgress,
  );
  const [currentPage, setCurrentPage] = useState(initialState.currentPage);
  const [hasMore, setHasMore] = useState(initialState.hasMore);

  // Modal state
  const [showUninstallModal, setShowUninstallModal] = useState(
    initialState.showUninstallModal,
  );
  const [versionToUninstall, setVersionToUninstall] = useState(
    initialState.versionToUninstall,
  );
  const [relatedApps, setRelatedApps] = useState(initialState.relatedApps);
  const [showAppDeleteModal, setShowAppDeleteModal] = useState(
    initialState.showAppDeleteModal,
  );
  const [appToDelete, setAppToDelete] = useState(initialState.appToDelete);
  const [showWidgetModal, setShowWidgetModal] = useState(
    initialState.showWidgetModal,
  );
  const [showAddWidgetForm, setShowAddWidgetForm] = useState(
    initialState.showAddWidgetForm,
  );
  const [showResultModal, setShowResultModal] = useState(
    initialState.showResultModal,
  );
  const [inlineResults, setInlineResults] = useState(null);

  // Form state
  const [newWidgetCaption, setNewWidgetCaption] = useState(
    initialState.newWidgetCaption,
  );
  const [newWidgetPath, setNewWidgetPath] = useState(
    initialState.newWidgetPath,
  );
  const [properties, setProperties] = useState(initialState.properties);

  // Package manager state
  const [packageManager, setPackageManager] = useState(
    initialState.packageManager,
  );
  const [isInstalling, setIsInstalling] = useState(initialState.isInstalling);
  const [isBuilding, setIsBuilding] = useState(initialState.isBuilding);
  const [buildResults, setBuildResults] = useState(initialState.buildResults);

  // Refs
  const listRef = useRef(null);
  const unlisten = useRef(null);

  // Error handler for data loading
  const handleLoadError = R.curry((type, error) => {
    // Error handling without console logging
  });

  // Data loaders with error handling
  const loadVersions = useCallback(
    wrapAsync(
      handleLoadError("versions"),
      R.pipeWith(R.andThen, [
        () => invoke("get_installed_mendix_versions"),
        setVersions,
      ]),
    ),
    [],
  );

  const loadApps = useCallback(
    wrapAsync(
      handleLoadError("apps"),
      R.pipeWith(R.andThen, [
        () => invoke("get_installed_mendix_apps"),
        setApps,
      ]),
    ),
    [],
  );

  // Load widgets from storage
  const loadWidgets = useCallback(() => {
    R.pipe(() => loadFromStorage(STORAGE_KEYS.WIDGETS, []), setWidgets)();
  }, []);

  // Initial data loading effect
  useEffect(() => {
    const loadInitialData = R.juxt([loadVersions, loadApps, loadWidgets]);
    loadInitialData();
  }, [loadVersions, loadApps, loadWidgets]);

  // Filter versions based on search term
  useEffect(() => {
    R.pipe(
      R.ifElse(
        () => R.isEmpty(searchTerm),
        R.identity,
        R.filter(
          R.pipe(
            R.prop("version"),
            R.toLower,
            R.includes(R.toLower(searchTerm)),
          ),
        ),
      ),
      setFilteredVersions,
    )(versions);
  }, [versions, searchTerm]);

  // Filter apps based on version filter and search term
  useEffect(() => {
    R.pipe(
      filterAppsByVersionAndSearch(versionFilter, appSearchTerm),
      R.tap(R.pipe(R.length, (len) => setHasMore(len > ITEMS_PER_PAGE))),
      R.tap(() => setCurrentPage(1)),
      setFilteredApps,
    )(apps);
  }, [apps, versionFilter, appSearchTerm]);

  // Filter widgets based on search term
  useEffect(() => {
    R.pipe(
      R.ifElse(
        () => R.isEmpty(widgetSearchTerm),
        R.identity,
        R.filter(
          R.pipe(
            R.prop("caption"),
            R.toLower,
            R.includes(R.toLower(widgetSearchTerm)),
          ),
        ),
      ),
      setFilteredWidgets,
    )(widgets);
  }, [widgets, widgetSearchTerm]);

  // Save package manager preference to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PACKAGE_MANAGER)(packageManager);
  }, [packageManager]);

  // Toggle app selection
  const handleAppClick = useCallback(
    R.pipe(R.prop("path"), (appPath) =>
      setSelectedApps((prev) =>
        R.pipe(
          toggleInSet(appPath),
          R.tap(R.pipe(setToArray, saveToStorage(STORAGE_KEYS.SELECTED_APPS))),
        )(prev),
      ),
    ),
    [],
  );

  // Install handler with functional approach
  const handleInstall = useCallback(
    R.pipe(
      () => selectedWidgets.size,
      R.ifElse(
        R.equals(0),
        () => alert("Please select at least one widget to install"),
        async () => {
          setIsInstalling(true);

          const widgetsList = R.filter(
            (w) => selectedWidgets.has(w.id),
            widgets,
          );

          const installWidget = async (widget) => {
            try {
              await invoke("run_package_manager_command", {
                packageManager,
                command: "install",
                workingDirectory: widget.path,
              });
              return R.assoc("success", true, widget);
            } catch (error) {
              alert(
                `Failed to install dependencies for ${widget.caption}: ${error}`,
              );
              return R.assoc("success", false, widget);
            }
          };

          await R.pipe(R.map(installWidget), (promises) =>
            Promise.all(promises),
          )(widgetsList);

          setIsInstalling(false);
        },
      ),
    ),
    [selectedWidgets, widgets, packageManager],
  );

  // Build and deploy handler with functional approach
  const handleBuildDeploy = useCallback(async () => {
    const validateSelections = R.cond([
      [
        () => selectedWidgets.size === 0,
        () => "Please select at least one widget to build",
      ],
      [
        () => selectedApps.size === 0,
        () => "Please select at least one app to deploy to",
      ],
      [R.T, R.always(null)],
    ]);

    const validationError = validateSelections();
    if (validationError) {
      alert(validationError);
      return;
    }

    // Initialize state with pure functional composition
    const initializeBuildState = R.pipe(
      R.tap(() => setShowResultModal(false)),
      R.tap(() => setBuildResults({ successful: [], failed: [] })),
      R.tap(() => setIsBuilding(true)),
      R.always(null),
    );

    initializeBuildState();

    const widgetsList = R.filter((w) => selectedWidgets.has(w.id), widgets);
    const appsList = R.filter((a) => selectedApps.has(a.path), apps);
    const appPaths = R.map(R.prop("path"), appsList);
    const appNames = R.map(R.prop("name"), appsList);

    const buildAndDeployWidget = async (widget) => {
      try {
        await invoke("run_package_manager_command", {
          packageManager,
          command: "run build",
          workingDirectory: widget.path,
        });

        const deployedApps = await invoke("copy_widget_to_apps", {
          widgetPath: widget.path,
          appPaths: appPaths,
        });

        return {
          success: true,
          widget: widget.caption,
          apps: appNames,
        };
      } catch (error) {
        return {
          success: false,
          widget: widget.caption,
          error: error.toString(),
        };
      }
    };

    const processResults = R.pipe(
      R.map(buildAndDeployWidget),
      (promises) => Promise.all(promises),
      R.andThen(R.partition(R.prop("success"))),
      R.andThen(([successful, failed]) => ({
        successful: R.map(R.omit(["success"]), successful),
        failed: R.map(R.omit(["success"]), failed),
      })),
    );

    const results = await processResults(widgetsList);

    // Modal should only show when there are failures - pure functional approach
    const shouldShowModal = R.pipe(R.prop("failed"), R.complement(R.isEmpty));

    // Finalize with strict functional composition
    const finalizeResults = R.pipe(
      R.tap(() => setBuildResults(results)),
      R.tap(() => setInlineResults(results)),
      R.tap(() => setIsBuilding(false)),
      R.when(
        () => shouldShowModal(results),
        R.tap(() => setShowResultModal(true)),
      ),
      R.always(results),
    );

    finalizeResults(results);
  }, [selectedWidgets, selectedApps, widgets, apps, packageManager]);

  // Memoized data
  const listData = useMemo(() => generateListData(20), []);

  // Property update with functional approach
  const updateProperty = useCallback(
    R.curry((key, value) => setProperties(updateProp(key, value))),
    [],
  );

  // Launch Studio Pro handler
  const handleLaunchStudioPro = useCallback(
    async (version) => {
      if (isLoading) return; // Prevent multiple launches

      setIsLoading(true);
      try {
        await invoke("launch_studio_pro", {
          version: version.version,
        });
        setTimeout(() => setIsLoading(false), 8000);
      } catch (error) {
        alert(`Failed to launch Studio Pro: ${error}`);
        setIsLoading(false);
      }
    },
    [isLoading],
  );

  // Uninstall click handler
  const handleUninstallClick = useCallback(
    wrapAsync(
      R.pipe((error) => alert(`Failed to get related apps: ${error}`)),
      async (version) => {
        const relatedApps = await invoke("get_apps_by_version", {
          version: version.version,
        });
        setShowUninstallModal(true);
        setVersionToUninstall(version);
        setRelatedApps(relatedApps);
      },
    ),
    [],
  );

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
            // Handle error silently
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
        alert(errorMsg);
        setIsLoading(false);
        setShowUninstallModal(false);
        setVersionToUninstall(null);
        setRelatedApps([]);
      }
    },
    [loadVersions, loadApps],
  );

  // Modal cancel handler
  const handleModalCancel = useCallback(
    R.pipe(
      () => setShowUninstallModal(false),
      () => setVersionToUninstall(null),
      () => setRelatedApps([]),
    ),
    [],
  );

  // Item click handler
  const handleItemClick = useCallback((item) => {
    // Handle item click without logging
  }, []);

  // Version click handler
  const handleVersionClick = useCallback(
    R.pipe(R.prop("version"), (version) =>
      setSelectedVersion(
        R.ifElse(R.equals(version), R.always(null), R.always(version)),
      ),
    ),
    [],
  );

  // Define prop keys for each tab component
  const studioProManagerKeys = [
    "searchTerm",
    "setSearchTerm",
    "versions",
    "filteredVersions",
    "selectedVersion",
    "handleVersionClick",
    "apps",
    "listData",
    "isLoading",
    "handleLaunchStudioPro",
    "handleUninstallClick",
    "handleItemClick",
  ];

  const widgetManagerKeys = [
    "versionFilter",
    "setVersionFilter",
    "versions",
    "appSearchTerm",
    "setAppSearchTerm",
    "filteredApps",
    "currentPage",
    "setCurrentPage",
    "hasMore",
    "selectedApps",
    "handleAppClick",
    "packageManager",
    "setPackageManager",
    "handleInstall",
    "handleBuildDeploy",
    "isInstalling",
    "isBuilding",
    "selectedWidgets",
    "setSelectedWidgets",
    "widgets",
    "filteredWidgets",
    "widgetSearchTerm",
    "setWidgetSearchTerm",
    "setShowWidgetModal",
    "setShowAddWidgetForm",
    "setNewWidgetCaption",
    "setNewWidgetPath",
    "setWidgets",
    "inlineResults",
    "setInlineResults",
  ];

  const widgetPreviewKeys = [
    "widgetPreviewSearch",
    "setWidgetPreviewSearch",
    "listData",
    "handleItemClick",
    "properties",
    "updateProperty",
  ];

  // Create tab props generator using simple functional composition
  const createTabPropsFromState = R.applySpec({
    studioProManager: R.pick(studioProManagerKeys),
    widgetManager: R.pipe(
      R.pick(widgetManagerKeys),
      R.assoc("ITEMS_PER_PAGE", ITEMS_PER_PAGE),
    ),
    widgetPreview: R.pick(widgetPreviewKeys),
  });

  // Create state object for tab props generation
  const stateObject = {
    searchTerm,
    setSearchTerm,
    versions,
    filteredVersions,
    selectedVersion,
    handleVersionClick,
    apps,
    listData,
    isLoading,
    handleLaunchStudioPro,
    handleUninstallClick,
    handleItemClick,
    versionFilter,
    setVersionFilter,
    appSearchTerm,
    setAppSearchTerm,
    filteredApps,
    currentPage,
    setCurrentPage,
    hasMore,
    selectedApps,
    handleAppClick,
    packageManager,
    setPackageManager,
    handleInstall,
    handleBuildDeploy,
    isInstalling,
    isBuilding,
    selectedWidgets,
    setSelectedWidgets,
    widgets,
    filteredWidgets,
    widgetSearchTerm,
    setWidgetSearchTerm,
    setShowWidgetModal,
    setShowAddWidgetForm,
    setNewWidgetCaption,
    setNewWidgetPath,
    setWidgets,
    widgetPreviewSearch,
    setWidgetPreviewSearch,
    properties,
    updateProperty,
    inlineResults,
    setInlineResults,
  };

  // Tab configuration with functional approach
  const createTabProps = useMemo(
    () => createTabPropsFromState(stateObject),
    // List all dependencies explicitly to avoid any memoization issues
    [
      searchTerm,
      versions,
      filteredVersions,
      selectedVersion,
      handleVersionClick,
      apps,
      listData,
      isLoading,
      handleLaunchStudioPro,
      handleUninstallClick,
      handleItemClick,
      versionFilter,
      filteredApps,
      currentPage,
      hasMore,
      selectedApps,
      handleAppClick,
      packageManager,
      handleInstall,
      handleBuildDeploy,
      isInstalling,
      isBuilding,
      selectedWidgets,
      widgets,
      filteredWidgets,
      widgetSearchTerm,
      widgetPreviewSearch,
      properties,
      updateProperty,
      inlineResults,
    ],
  );

  // Tab configurations
  const tabConfigurations = [
    ["studio-pro", "Studio Pro Manager", StudioProManager, "studioProManager"],
    ["widget-manager", "Widget Manager", WidgetManager, "widgetManager"],
    ["widget-preview", "Widget Preview", WidgetPreview, "widgetPreview"],
  ];

  // Create tab from configuration
  const createTabFromConfig = R.curry((props, config) => {
    const [id, label, Component, propsKey] = config;
    return {
      id,
      label,
      component: React.createElement(Component, R.prop(propsKey, props)),
    };
  });

  // Create tabs using functional approach
  const tabs = useMemo(
    () => R.map(createTabFromConfig(createTabProps), tabConfigurations),
    [createTabProps],
  );

  // Get active tab content with functional approach
  const activeTabContent = useMemo(() => {
    // Try native find first to ensure it works
    const foundTab = tabs.find((tab) => tab.id === activeTab);

    return foundTab ? foundTab.component : null;
  }, [tabs, activeTab]);

  // Render tab button
  const renderTabButton = R.curry((activeTab, setActiveTab, tab) => (
    <TabButton
      key={R.prop("id", tab)}
      label={R.prop("label", tab)}
      isActive={R.equals(activeTab, R.prop("id", tab))}
      onClick={() => setActiveTab(R.prop("id", tab))}
    />
  ));

  // Widget selection handler
  const handleWidgetSelection = useCallback(
    R.curry((widgetId) =>
      setSelectedWidgets((prev) =>
        R.pipe(
          () => toggleInSet(widgetId, prev),
          R.tap(
            R.pipe(setToArray, saveToStorage(STORAGE_KEYS.SELECTED_WIDGETS)),
          ),
        )(),
      ),
    ),
    [],
  );

  // Add widget handler
  const handleAddWidget = useCallback(() => {
    if (
      validateRequired(["caption", "path"], {
        caption: newWidgetCaption,
        path: newWidgetPath,
      })
    ) {
      R.pipe(
        () => createWidget(newWidgetCaption, newWidgetPath),
        (newWidget) => [...widgets, newWidget],
        R.tap(saveToStorage(STORAGE_KEYS.WIDGETS)),
        setWidgets,
        R.tap(() => {
          setShowAddWidgetForm(false);
          setShowWidgetModal(false);
          setNewWidgetCaption("");
          setNewWidgetPath("");
        }),
      )();
    }
  }, [newWidgetCaption, newWidgetPath, widgets]);

  // Remove widget handler
  const handleRemoveWidget = useCallback(
    R.curry((widgetId) =>
      R.pipe(
        () => widgets,
        R.filter(R.complement(R.propEq("id", widgetId))),
        R.tap(saveToStorage(STORAGE_KEYS.WIDGETS)),
        setWidgets,
        R.tap(() =>
          setSelectedWidgets((prev) =>
            R.pipe(
              () => toggleInSet(widgetId, prev),
              R.tap(
                R.pipe(
                  setToArray,
                  saveToStorage(STORAGE_KEYS.SELECTED_WIDGETS),
                ),
              ),
            )(),
          ),
        ),
      )(),
    ),
    [widgets],
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
        {R.map(renderTabButton(activeTab, setActiveTab), tabs)}
      </div>

      <div className="tab-content">{activeTabContent}</div>

      <WidgetModal
        showWidgetModal={showWidgetModal}
        showAddWidgetForm={showAddWidgetForm}
        setShowWidgetModal={setShowWidgetModal}
        setShowAddWidgetForm={setShowAddWidgetForm}
        newWidgetCaption={newWidgetCaption}
        setNewWidgetCaption={setNewWidgetCaption}
        newWidgetPath={newWidgetPath}
        setNewWidgetPath={setNewWidgetPath}
        setWidgets={setWidgets}
      />

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

      <BuildResultModal
        showResultModal={showResultModal}
        buildResults={buildResults}
        setShowResultModal={setShowResultModal}
        setBuildResults={setBuildResults}
      />
    </main>
  );
}

export default App;
