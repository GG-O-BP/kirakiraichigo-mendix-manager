import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

// Import components
import { TabButton, ConfirmModal, generateListData } from "./components/common";
import {
  StudioProManager,
  WidgetManager,
  WidgetPreview,
} from "./components/tabs";
import { WidgetModal, BuildResultModal } from "./components/modals";

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

  // Package manager states
  const [packageManager, setPackageManager] = useState("npm");
  const [isInstalling, setIsInstalling] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [buildResults, setBuildResults] = useState({
    successful: [],
    failed: [],
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

    // Load package manager preference from localStorage
    const savedPackageManager = localStorage.getItem("kirakiraPackageManager");
    if (savedPackageManager) {
      setPackageManager(savedPackageManager);
      console.log("Loaded package manager preference:", savedPackageManager);
    }
  }, [loadVersions, loadApps]);

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

  // Save package manager preference to localStorage
  useEffect(() => {
    localStorage.setItem("kirakiraPackageManager", packageManager);
    console.log("Saved package manager preference:", packageManager);
  }, [packageManager]);

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

  const handleInstall = useCallback(async () => {
    if (selectedWidgets.size === 0) {
      alert("Please select at least one widget to install");
      return;
    }

    setIsInstalling(true);
    console.log(
      `Starting install for ${selectedWidgets.size} widgets with ${packageManager}`,
    );

    const widgetsList = widgets.filter((w) => selectedWidgets.has(w.id));

    for (const widget of widgetsList) {
      try {
        console.log(
          `Installing dependencies for ${widget.caption} at ${widget.path}`,
        );
        await invoke("run_package_manager_command", {
          packageManager,
          command: "install",
          workingDirectory: widget.path,
        });
        console.log(
          `Successfully installed dependencies for ${widget.caption}`,
        );
      } catch (error) {
        console.error(
          `Failed to install dependencies for ${widget.caption}:`,
          error,
        );
        alert(`Failed to install dependencies for ${widget.caption}: ${error}`);
      }
    }

    setIsInstalling(false);
    console.log("Install process completed");
  }, [selectedWidgets, widgets, packageManager]);

  const handleBuildDeploy = useCallback(async () => {
    if (selectedWidgets.size === 0) {
      alert("Please select at least one widget to build");
      return;
    }

    if (selectedApps.size === 0) {
      alert("Please select at least one app to deploy to");
      return;
    }

    setIsBuilding(true);
    console.log(
      `Starting build+deploy for ${selectedWidgets.size} widgets to ${selectedApps.size} apps`,
    );

    const results = {
      successful: [],
      failed: [],
    };

    const widgetsList = widgets.filter((w) => selectedWidgets.has(w.id));
    const appsList = apps.filter((a) => selectedApps.has(a.path));

    for (const widget of widgetsList) {
      try {
        console.log(`Building ${widget.caption} at ${widget.path}`);

        // Run build command
        await invoke("run_package_manager_command", {
          packageManager,
          command: "run build",
          workingDirectory: widget.path,
        });

        console.log(
          `Build successful for ${widget.caption}, deploying to apps...`,
        );

        // Copy to selected apps
        const appPaths = appsList.map((app) => app.path);
        const deployedApps = await invoke("copy_widget_to_apps", {
          widgetPath: widget.path,
          appPaths: appPaths,
        });

        results.successful.push({
          widget: widget.caption,
          apps: appsList.map((app) => app.name),
        });

        console.log(
          `Successfully deployed ${widget.caption} to ${deployedApps.length} apps`,
        );
      } catch (error) {
        console.error(`Failed to build/deploy ${widget.caption}:`, error);
        results.failed.push({
          widget: widget.caption,
          error: error.toString(),
        });
      }
    }

    setBuildResults(results);
    setIsBuilding(false);
    setShowResultModal(true);
    console.log("Build+deploy process completed", results);
  }, [selectedWidgets, selectedApps, widgets, apps, packageManager]);

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

  // Tab configuration
  const tabs = useMemo(
    () => [
      {
        id: "studio-pro",
        label: "Studio Pro Manager",
        component: (
          <StudioProManager
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            versions={versions}
            filteredVersions={filteredVersions}
            selectedVersion={selectedVersion}
            handleVersionClick={handleVersionClick}
            apps={apps}
            listData={listData}
            isLoading={isLoading}
            handleLaunchStudioPro={handleLaunchStudioPro}
            handleUninstallClick={handleUninstallClick}
            handleItemClick={handleItemClick}
          />
        ),
      },
      {
        id: "widget-manager",
        label: "Widget Manager",
        component: (
          <WidgetManager
            versionFilter={versionFilter}
            setVersionFilter={setVersionFilter}
            versions={versions}
            appSearchTerm={appSearchTerm}
            setAppSearchTerm={setAppSearchTerm}
            filteredApps={filteredApps}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            hasMore={hasMore}
            ITEMS_PER_PAGE={ITEMS_PER_PAGE}
            selectedApps={selectedApps}
            handleAppClick={handleAppClick}
            packageManager={packageManager}
            setPackageManager={setPackageManager}
            handleInstall={handleInstall}
            handleBuildDeploy={handleBuildDeploy}
            isInstalling={isInstalling}
            isBuilding={isBuilding}
            selectedWidgets={selectedWidgets}
            setSelectedWidgets={setSelectedWidgets}
            widgets={widgets}
            filteredWidgets={filteredWidgets}
            widgetSearchTerm={widgetSearchTerm}
            setWidgetSearchTerm={setWidgetSearchTerm}
            setShowWidgetModal={setShowWidgetModal}
            setShowAddWidgetForm={setShowAddWidgetForm}
            setNewWidgetCaption={setNewWidgetCaption}
            setNewWidgetPath={setNewWidgetPath}
            setWidgets={setWidgets}
          />
        ),
      },
      {
        id: "widget-preview",
        label: "Widget Preview",
        component: (
          <WidgetPreview
            widgetPreviewSearch={widgetPreviewSearch}
            setWidgetPreviewSearch={setWidgetPreviewSearch}
            listData={listData}
            handleItemClick={handleItemClick}
            properties={properties}
            updateProperty={updateProperty}
          />
        ),
      },
    ],
    [
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
    ],
  );

  const activeTabContent = useMemo(
    () => tabs.find((tab) => tab.id === activeTab)?.component,
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
