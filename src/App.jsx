import * as R from "ramda";
import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import catppuccinLogo from "./assets/catppuccin_circle.png";
import catppuccinLatteLogo from "./assets/catppuccin_latte_circle.png";
import "./styles/index.css";
import { flavors } from "@catppuccin/palette";

import {
  STORAGE_KEYS,
  ITEMS_PER_PAGE,
  loadFromStorage,
  saveToStorage,
  wrapAsync,
  arrayToSet,
  createWidget,
  invokeValidateRequired,
  updateProp,
  updateVersionLoadingStates,
  getVersionLoadingState,
  invokeValidateBuildDeploySelections,
  createBuildDeployParams,
  createCatastrophicErrorResult,
  invokeHasBuildFailures,
  createWidgetFilter,
  createAppFilter,
  hasItems,
} from "./utils/functional";

import { filterMendixApps, filterWidgets } from "./utils/dataProcessing";

import { TabButton, ConfirmModal } from "./components/common";
import {
  StudioProManager,
  WidgetManager,
  WidgetPreview,
} from "./components/tabs";
import {
  WidgetModal,
  BuildResultModal,
  DownloadModal,
} from "./components/modals";

const createInitialState = () => ({
  downloadableVersions: [],
  isLoadingDownloadableVersions: false,
  showOnlyDownloadableVersions: false,
  showLTSOnly: false,
  showMTSOnly: false,
  showBetaOnly: false,
  activeTab: "studio-pro",
  currentTheme: "kiraichi",
  versions: [],
  apps: [],
  widgets: [],
  filteredVersions: [],
  filteredApps: [],
  filteredWidgets: [],
  searchTerm: "",
  appSearchTerm: "",
  widgetSearchTerm: "",
  widgetPreviewSearch: "",
  selectedApps: new Set(),
  selectedWidgets: new Set(),
  selectedVersion: null,
  versionFilter: "all",
  isLaunching: false,
  isUninstalling: false,
  downloadProgress: {},
  currentPage: 1,
  hasMore: true,
  showUninstallModal: false,
  versionToUninstall: null,
  relatedApps: [],
  showAppDeleteModal: false,
  appToDelete: null,
  showWidgetModal: false,
  showAddWidgetForm: false,
  showResultModal: false,
  showDownloadModal: false,
  versionToDownload: null,
  showWidgetDeleteModal: false,
  widgetToDelete: null,
  newWidgetCaption: "",
  newWidgetPath: "",
  properties: {
    prop1: "",
    prop2: "",
    prop3: "",
    prop4: "Select...",
  },
  packageManager: "npm",
  isInstalling: false,
  isBuilding: false,
  buildResults: {
    successful: [],
    failed: [],
  },
});

function App() {
  const [state, setState] = useState(createInitialState);

  const currentCatppuccinLogo = ["latte", "kiraichi-light"].includes(
    state.currentTheme,
  )
    ? catppuccinLatteLogo
    : catppuccinLogo;

  const updateState = useCallback((updater) => setState(updater), []);
  const setStateProperty = useCallback(
    (lens, value) => updateState((prevState) => R.set(lens, value, prevState)),
    [updateState],
  );

  const applyTheme = useCallback((themeName) => {
    const root = document.documentElement;

    root.classList.remove(
      "theme-kiraichi",
      "theme-kiraichi-light",
      "theme-latte",
      "theme-frappe",
      "theme-macchiato",
      "theme-mocha",
    );

    if (themeName === "kiraichi" || themeName === "kiraichi-light") {
      root.classList.add(`theme-${themeName}`);
    } else {
      root.classList.add(`theme-${themeName}`);
      const flavor = flavors[themeName];

      if (flavor) {
        root.style.setProperty(
          "--catppuccin-rosewater",
          flavor.colors.rosewater.hex,
        );
        root.style.setProperty(
          "--catppuccin-flamingo",
          flavor.colors.flamingo.hex,
        );
        root.style.setProperty("--catppuccin-pink", flavor.colors.pink.hex);
        root.style.setProperty("--catppuccin-mauve", flavor.colors.mauve.hex);
        root.style.setProperty("--catppuccin-red", flavor.colors.red.hex);
        root.style.setProperty("--catppuccin-maroon", flavor.colors.maroon.hex);
        root.style.setProperty("--catppuccin-peach", flavor.colors.peach.hex);
        root.style.setProperty("--catppuccin-yellow", flavor.colors.yellow.hex);
        root.style.setProperty("--catppuccin-green", flavor.colors.green.hex);
        root.style.setProperty("--catppuccin-teal", flavor.colors.teal.hex);
        root.style.setProperty("--catppuccin-sky", flavor.colors.sky.hex);
        root.style.setProperty(
          "--catppuccin-sapphire",
          flavor.colors.sapphire.hex,
        );
        root.style.setProperty("--catppuccin-blue", flavor.colors.blue.hex);
        root.style.setProperty(
          "--catppuccin-lavender",
          flavor.colors.lavender.hex,
        );
        root.style.setProperty("--catppuccin-text", flavor.colors.text.hex);
        root.style.setProperty(
          "--catppuccin-subtext1",
          flavor.colors.subtext1.hex,
        );
        root.style.setProperty(
          "--catppuccin-subtext0",
          flavor.colors.subtext0.hex,
        );
        root.style.setProperty(
          "--catppuccin-overlay2",
          flavor.colors.overlay2.hex,
        );
        root.style.setProperty(
          "--catppuccin-overlay1",
          flavor.colors.overlay1.hex,
        );
        root.style.setProperty(
          "--catppuccin-overlay0",
          flavor.colors.overlay0.hex,
        );
        root.style.setProperty(
          "--catppuccin-surface2",
          flavor.colors.surface2.hex,
        );
        root.style.setProperty(
          "--catppuccin-surface1",
          flavor.colors.surface1.hex,
        );
        root.style.setProperty(
          "--catppuccin-surface0",
          flavor.colors.surface0.hex,
        );
        root.style.setProperty("--catppuccin-base", flavor.colors.base.hex);
        root.style.setProperty("--catppuccin-mantle", flavor.colors.mantle.hex);
        root.style.setProperty("--catppuccin-crust", flavor.colors.crust.hex);
      }
    }
  }, []);

  const handleThemeChange = useCallback(
    (event) => {
      const newTheme = event.target.value;
      setStateProperty(R.lensProp("currentTheme"), newTheme);
      saveToStorage(STORAGE_KEYS.THEME, newTheme).catch(console.error);
      applyTheme(newTheme);
    },
    [setStateProperty, applyTheme],
  );

  useEffect(() => {
    applyTheme(state.currentTheme);
  }, [applyTheme, state.currentTheme]);

  const fetchVersionsFromDatagrid = useCallback(async (page = 1) => {
    const isFirstPage = page === 1;

    const updateVersions = (newVersions, prevVersions) =>
      isFirstPage
        ? newVersions
        : R.concat(R.defaultTo([], prevVersions), newVersions);

    try {
      const processedPage = R.pipe(R.defaultTo(1), R.max(1))(page);

      setIsLoadingDownloadableVersions(true);

      const versions = await invoke("get_downloadable_versions_from_datagrid", {
        page: processedPage,
      });

      setDownloadableVersions((prevVersions) =>
        updateVersions(versions, prevVersions),
      );

      setIsLoadingDownloadableVersions(false);
      return versions;
    } catch (error) {
      console.error("Failed to fetch versions from datagrid:", error);
      setIsLoadingDownloadableVersions(false);
      return [];
    }
  }, []);

  const initialState = useMemo(createInitialState, []);

  const [activeTab, setActiveTab] = useState(initialState.activeTab);
  const [versions, setVersions] = useState(initialState.versions);
  const [apps, setApps] = useState(initialState.apps);
  const [widgets, setWidgets] = useState(initialState.widgets);
  const [downloadableVersions, setDownloadableVersions] = useState(
    initialState.downloadableVersions,
  );
  const [isLoadingDownloadableVersions, setIsLoadingDownloadableVersions] =
    useState(initialState.isLoadingDownloadableVersions);
  const [showOnlyDownloadableVersions, setShowOnlyDownloadableVersions] =
    useState(initialState.showOnlyDownloadableVersions);
  const [showLTSOnly, setShowLTSOnly] = useState(initialState.showLTSOnly);
  const [showMTSOnly, setShowMTSOnly] = useState(initialState.showMTSOnly);
  const [showBetaOnly, setShowBetaOnly] = useState(initialState.showBetaOnly);

  const [filteredVersions, setFilteredVersions] = useState(
    initialState.filteredVersions,
  );
  const [filteredApps, setFilteredApps] = useState(initialState.filteredApps);
  const [filteredWidgets, setFilteredWidgets] = useState(
    initialState.filteredWidgets,
  );

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

  const [selectedApps, setSelectedApps] = useState(initialState.selectedApps);
  const [selectedWidgets, setSelectedWidgets] = useState(
    initialState.selectedWidgets,
  );
  const [selectedVersion, setSelectedVersion] = useState(
    initialState.selectedVersion,
  );

  const [versionFilter, setVersionFilter] = useState(
    initialState.versionFilter,
  );
  const [isLaunching, setIsLaunching] = useState(initialState.isLaunching);
  const [isUninstalling, setIsUninstalling] = useState(
    initialState.isUninstalling,
  );
  const [versionLoadingStates, setVersionLoadingStates] = useState({});
  const [currentPage, setCurrentPage] = useState(initialState.currentPage);
  const [hasMore, setHasMore] = useState(initialState.hasMore);

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
  const [showDownloadModal, setShowDownloadModal] = useState(
    initialState.showDownloadModal,
  );
  const [versionToDownload, setVersionToDownload] = useState(
    initialState.versionToDownload,
  );
  const [showWidgetDeleteModal, setShowWidgetDeleteModal] = useState(
    initialState.showWidgetDeleteModal,
  );
  const [widgetToDelete, setWidgetToDelete] = useState(
    initialState.widgetToDelete,
  );
  const [inlineResults, setInlineResults] = useState(null);

  const [newWidgetCaption, setNewWidgetCaption] = useState(
    initialState.newWidgetCaption,
  );
  const [newWidgetPath, setNewWidgetPath] = useState(
    initialState.newWidgetPath,
  );
  const [properties, setProperties] = useState(initialState.properties);

  const [selectedWidgetForPreview, setSelectedWidgetForPreview] =
    useState(null);

  useEffect(() => {
    const saveWidgetsSequentially = async () => {
      if (widgets.length > 0) {
        try {
          const widgetOrder = widgets.map((w) => w.id);
          await saveToStorage(STORAGE_KEYS.WIDGET_ORDER, widgetOrder);
          await saveToStorage(STORAGE_KEYS.WIDGETS, widgets);
        } catch (error) {
          console.error("Failed to save widgets:", error);
        }
      }
    };
    saveWidgetsSequentially();
  }, [widgets]);

  const [packageManager, setPackageManager] = useState(
    initialState.packageManager,
  );
  const [isInstalling, setIsInstalling] = useState(initialState.isInstalling);
  const [isBuilding, setIsBuilding] = useState(initialState.isBuilding);
  const [buildResults, setBuildResults] = useState(initialState.buildResults);

  const loadVersions = useCallback(
    wrapAsync(
      (error) => console.error("Failed to load versions:", error),
      R.pipeWith(R.andThen, [
        () => invoke("get_installed_mendix_versions"),
        setVersions,
      ]),
    ),
    [],
  );

  const handleDownloadVersion = useCallback((version) => {
    if (!version || !version.version) {
      alert("❌ Invalid version data");
      return;
    }

    setVersionToDownload(version);
    setShowDownloadModal(true);
  }, []);

  const handleModalDownload = useCallback(
    async (version) => {
      const versionId = version.version;
      try {
        setVersionLoadingStates((prev) =>
          updateVersionLoadingStates(versionId, "download", true, prev),
        );

        const result = await invoke("download_and_install_mendix_version", {
          version: version.version,
        });

        await loadVersions();

        return result;
      } catch (error) {
        console.error("Error in download process:", error);
        throw error;
      } finally {
        setVersionLoadingStates((prev) =>
          updateVersionLoadingStates(versionId, "download", false, prev),
        );
      }
    },
    [loadVersions],
  );

  const handleDownloadModalClose = useCallback(() => {
    setShowDownloadModal(false);
    setVersionToDownload(null);
  }, []);

  const loadApps = useCallback(
    wrapAsync(
      (error) => console.error("Failed to load apps:", error),
      R.pipeWith(R.andThen, [
        () => invoke("get_installed_mendix_apps"),
        setApps,
      ]),
    ),
    [],
  );

  const loadWidgets = useCallback(async () => {
    try {
      const savedWidgets = await loadFromStorage(STORAGE_KEYS.WIDGETS, []);
      const savedOrder = await loadFromStorage(STORAGE_KEYS.WIDGET_ORDER, []);

      if (savedOrder.length > 0) {
        const orderedWidgets = R.pipe(
          R.map((id) => R.find(R.propEq(id, "id"), savedWidgets)),
          R.filter(R.identity),
          R.concat(
            R.__,
            R.filter((w) => !savedOrder.includes(w.id), savedWidgets),
          ),
        )(savedOrder);

        setWidgets(orderedWidgets);
      } else {
        setWidgets(savedWidgets);
      }
    } catch (error) {
      console.error("Failed to load widgets:", error);
      setWidgets([]);
    }
  }, []);

  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const stateLoaders = R.juxt([
          () => loadFromStorage(STORAGE_KEYS.THEME, "kiraichi"),
          () => loadFromStorage(STORAGE_KEYS.PACKAGE_MANAGER, "npm"),
          () => loadFromStorage(STORAGE_KEYS.SELECTED_APPS, []),
          () => loadFromStorage(STORAGE_KEYS.SELECTED_WIDGETS, []),
        ]);

        const [theme, pkgManager, selectedAppsArray, selectedWidgetsArray] =
          await Promise.all(stateLoaders());

        R.pipe(
          R.tap(() => setStateProperty(R.lensProp("currentTheme"), theme)),
          R.tap(() => applyTheme(theme)),
          R.tap(() => setPackageManager(pkgManager)),
          R.tap(() => setSelectedApps(arrayToSet(selectedAppsArray))),
          R.tap(() => setSelectedWidgets(arrayToSet(selectedWidgetsArray))),
        )();
      } catch (error) {
        console.error("Failed to load initial state:", error);
      }
    };

    loadInitialState();
  }, []);

  useEffect(() => {
    const loadInitialData = R.juxt([loadVersions, loadApps, loadWidgets]);
    loadInitialData();
  }, [loadVersions, loadApps, loadWidgets]);

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

  useEffect(() => {
    const processApps = async () => {
      try {
        const targetVersion = versionFilter === "all" ? null : versionFilter;
        const filtered = await filterMendixApps(
          apps,
          appSearchTerm || null,
          targetVersion,
          true,
        );
        setFilteredApps(filtered);
        setHasMore(filtered.length > ITEMS_PER_PAGE);
        setCurrentPage(1);
      } catch (error) {
        console.error("Failed to filter apps:", error);
        setFilteredApps(apps);
      }
    };

    if (apps && apps.length > 0) {
      processApps();
    } else {
      setFilteredApps([]);
    }
  }, [apps, versionFilter, appSearchTerm]);

  useEffect(() => {
    const processWidgets = async () => {
      try {
        const filtered = await filterWidgets(widgets, widgetSearchTerm || null);
        setFilteredWidgets(filtered);
      } catch (error) {
        console.error("Failed to filter widgets:", error);
        setFilteredWidgets(widgets);
      }
    };

    if (widgets && widgets.length > 0) {
      processWidgets();
    } else {
      setFilteredWidgets([]);
    }
  }, [widgets, widgetSearchTerm]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PACKAGE_MANAGER, packageManager).catch(
      console.error,
    );
  }, [packageManager]);

  const hasLoadedInitialVersions = useRef(false);

  useEffect(() => {
    if (hasLoadedInitialVersions.current) {
      return;
    }

    const loadInitialDownloadableVersions = async () => {
      try {
        hasLoadedInitialVersions.current = true;
        await fetchVersionsFromDatagrid(1);
      } catch (error) {
        console.error("Failed to load initial downloadable versions:", error);
        hasLoadedInitialVersions.current = false;
      }
    };

    loadInitialDownloadableVersions();
  }, [fetchVersionsFromDatagrid]);

  const handleAppClick = useCallback(
    R.pipe(R.prop("path"), (appPath) => {
      setSelectedApps((prev) => {
        const currentSet = new Set(prev);
        const newSet = new Set(currentSet);

        if (currentSet.has(appPath)) {
          newSet.delete(appPath);
        } else {
          newSet.add(appPath);
        }

        const newArray = Array.from(newSet);

        saveToStorage(STORAGE_KEYS.SELECTED_APPS, newArray).catch(
          console.error,
        );

        return newSet;
      });
    }),
    [],
  );

  const handleInstall = useCallback(async () => {
    if (!hasItems(selectedWidgets)) {
      alert("Please select at least one widget to install");
      return;
    }

    setIsInstalling(true);

    const widgetFilter = createWidgetFilter(selectedWidgets);
    const widgetsList = widgetFilter(widgets);

    const createInstallOperation = R.curry((widget) =>
      R.tryCatch(
        async () => {
          await invoke("run_package_manager_command", {
            packageManager,
            command: "install",
            workingDirectory: R.prop("path", widget),
          });
          return R.assoc("success", true, widget);
        },
        (error) => {
          alert(
            `Failed to install dependencies for ${R.prop("caption", widget)}: ${error}`,
          );
          return R.assoc("success", false, widget);
        },
      )(),
    );

    const executeInstallations = R.pipe(
      R.map(createInstallOperation),
      (promises) => Promise.all(promises),
    );

    await executeInstallations(widgetsList);

    setIsInstalling(false);
  }, [selectedWidgets, widgets, packageManager]);

  const handleBuildDeploy = useCallback(async () => {
    const validationError = invokeValidateBuildDeploySelections(
      selectedWidgets,
      selectedApps,
    );

    if (validationError) {
      alert(validationError);
      return;
    }

    const initializeBuildState = R.pipe(
      R.tap(() => setShowResultModal(false)),
      R.tap(() => setBuildResults({ successful: [], failed: [] })),
      R.tap(() => setIsBuilding(true)),
      R.always(null),
    );

    initializeBuildState();

    const widgetFilter = createWidgetFilter(selectedWidgets);
    const appFilter = createAppFilter(selectedApps);

    const widgetsList = widgetFilter(widgets);
    const appsList = appFilter(apps);

    const buildParams = createBuildDeployParams(
      widgetsList,
      appsList,
      packageManager,
    );

    const executeBuildDeploy = R.tryCatch(
      async () => await invoke("build_and_deploy_widgets", buildParams),
      createCatastrophicErrorResult,
    );

    const finalizeResults = R.pipe(
      R.tap((results) => setBuildResults(results)),
      R.tap((results) => setInlineResults(results)),
      R.tap(() => setIsBuilding(false)),
      R.when(
        invokeHasBuildFailures,
        R.tap(() => setShowResultModal(true)),
      ),
    );

    const results = await executeBuildDeploy();
    finalizeResults(results);
  }, [selectedWidgets, selectedApps, widgets, apps, packageManager]);

  const updateProperty = useCallback(
    R.curry((key, value) => setProperties(updateProp(key, value))),
    [],
  );

  const handleLaunchStudioPro = useCallback(
    async (version) => {
      const versionId = version.version;
      const loadingState = getVersionLoadingState(
        versionLoadingStates,
        versionId,
      );

      if (loadingState.isLaunching || loadingState.isUninstalling) {
        return;
      }

      setVersionLoadingStates((prev) =>
        updateVersionLoadingStates(versionId, "launch", true, prev),
      );

      try {
        await invoke("launch_studio_pro", {
          version: version.version,
        });
        setTimeout(() => {
          setVersionLoadingStates((prev) =>
            updateVersionLoadingStates(versionId, "launch", false, prev),
          );
        }, 60000);
      } catch (error) {
        alert(`Failed to launch Studio Pro: ${error}`);
        setVersionLoadingStates((prev) =>
          updateVersionLoadingStates(versionId, "launch", false, prev),
        );
      }
    },
    [versionLoadingStates],
  );

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

  const handleWidgetDeleteClick = useCallback((widget) => {
    setShowWidgetDeleteModal(true);
    setWidgetToDelete(widget);
  }, []);

  const handleConfirmWidgetDelete = useCallback(() => {
    if (widgetToDelete) {
      setWidgets((prevWidgets) => {
        const newWidgets = R.filter(
          R.pipe(R.prop("id"), R.complement(R.equals(widgetToDelete.id))),
          prevWidgets,
        );
        saveToStorage(STORAGE_KEYS.WIDGETS, newWidgets).catch(console.error);
        return newWidgets;
      });

      setSelectedWidgets((prevSelected) => {
        const newSet = new Set(prevSelected);
        newSet.delete(widgetToDelete.id);
        const newArray = Array.from(newSet);
        saveToStorage(STORAGE_KEYS.SELECTED_WIDGETS, newArray).catch(
          console.error,
        );
        return newSet;
      });

      setShowWidgetDeleteModal(false);
      setWidgetToDelete(null);
    }
  }, [widgetToDelete]);

  const handleCancelWidgetDelete = useCallback(() => {
    setShowWidgetDeleteModal(false);
    setWidgetToDelete(null);
  }, []);

  const handleUninstallStudioPro = useCallback(
    async (version, deleteApps = false, relatedAppsList = []) => {
      const versionId = version.version;
      setVersionLoadingStates((prev) =>
        updateVersionLoadingStates(versionId, "uninstall", true, prev),
      );

      const cleanupUninstallState = () => {
        setVersionLoadingStates((prev) =>
          updateVersionLoadingStates(versionId, "uninstall", false, prev),
        );
        setShowUninstallModal(false);
        setVersionToUninstall(null);
        setRelatedApps([]);
      };

      try {
        if (deleteApps && relatedAppsList.length > 0) {
          for (const app of relatedAppsList) {
            await invoke("delete_mendix_app", {
              appPath: app.path,
            });
          }
        }

        await invoke("uninstall_studio_pro", {
          version: version.version,
        });

        const monitorDeletion = setInterval(async () => {
          try {
            const folderExists = await invoke("check_version_folder_exists", {
              version: version.version,
            });

            if (!folderExists) {
              clearInterval(monitorDeletion);
              await loadVersions();
              if (deleteApps) {
                await loadApps();
              }
              cleanupUninstallState();
            }
          } catch (error) {}
        }, 1000);

        setTimeout(() => {
          clearInterval(monitorDeletion);
          cleanupUninstallState();
        }, 60000);
      } catch (error) {
        const errorMsg = deleteApps
          ? `Failed to uninstall Studio Pro ${version.version} with apps: ${error}`
          : `Failed to uninstall Studio Pro ${version.version}: ${error}`;
        alert(errorMsg);
        cleanupUninstallState();
      }
    },
    [loadVersions, loadApps],
  );

  const handleModalCancel = useCallback(
    R.pipe(
      () => setShowUninstallModal(false),
      () => setVersionToUninstall(null),
      () => setRelatedApps([]),
    ),
    [],
  );

  const handleVersionClick = useCallback((version) => {
    setSelectedVersion((prevSelected) => {
      if (prevSelected && prevSelected.version === version.version) {
        return null;
      }
      return version;
    });
  }, []);

  const studioProManagerKeys = [
    "searchTerm",
    "setSearchTerm",
    "versions",
    "filteredVersions",
    "selectedVersion",
    "handleVersionClick",
    "apps",
    "versionLoadingStates",
    "handleLaunchStudioPro",
    "handleUninstallClick",
    "fetchVersionsFromDatagrid",
    "downloadableVersions",
    "isLoadingDownloadableVersions",
    "handleDownloadVersion",
    "showOnlyDownloadableVersions",
    "setShowOnlyDownloadableVersions",
    "showLTSOnly",
    "setShowLTSOnly",
    "showMTSOnly",
    "setShowMTSOnly",
    "showBetaOnly",
    "setShowBetaOnly",
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
    "handleWidgetDeleteClick",
  ];

  const widgetPreviewKeys = [
    "widgetPreviewSearch",
    "setWidgetPreviewSearch",
    "properties",
    "updateProperty",
    "widgets",
    "filteredWidgets",
    "widgetSearchTerm",
    "setWidgetSearchTerm",
    "selectedWidgetForPreview",
    "setSelectedWidgetForPreview",
    "setWidgets",
    "setShowWidgetModal",
    "setShowAddWidgetForm",
    "setNewWidgetCaption",
    "setNewWidgetPath",
    "handleWidgetDeleteClick",
  ];

  const createTabPropsFromState = R.applySpec({
    studioProManager: R.pick(studioProManagerKeys),
    widgetManager: R.pipe(
      R.pick(widgetManagerKeys),
      R.assoc("ITEMS_PER_PAGE", ITEMS_PER_PAGE),
    ),
    widgetPreview: R.pick(widgetPreviewKeys),
  });

  const stateObject = {
    searchTerm,
    setSearchTerm,
    versions,
    filteredVersions,
    selectedVersion,
    handleVersionClick,
    apps,
    versionLoadingStates,
    handleLaunchStudioPro,
    handleUninstallClick,
    fetchVersionsFromDatagrid,
    downloadableVersions,
    isLoadingDownloadableVersions,
    handleDownloadVersion,
    showOnlyDownloadableVersions,
    setShowOnlyDownloadableVersions,
    showLTSOnly,
    setShowLTSOnly,
    showMTSOnly,
    setShowMTSOnly,
    showBetaOnly,
    setShowBetaOnly,
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
    selectedWidgetForPreview,
    setSelectedWidgetForPreview,
    inlineResults,
    setInlineResults,
    handleWidgetDeleteClick,
  };

  const createTabProps = useMemo(
    () => createTabPropsFromState(stateObject),
    [
      searchTerm,
      versions,
      filteredVersions,
      selectedVersion,
      handleVersionClick,
      apps,
      isLaunching,
      isUninstalling,
      handleLaunchStudioPro,
      handleUninstallClick,
      fetchVersionsFromDatagrid,
      downloadableVersions,
      isLoadingDownloadableVersions,
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
      selectedWidgetForPreview,
      inlineResults,
      showOnlyDownloadableVersions,
      setShowOnlyDownloadableVersions,
      showLTSOnly,
      setShowLTSOnly,
      showMTSOnly,
      setShowMTSOnly,
      showBetaOnly,
      setShowBetaOnly,
    ],
  );

  const tabConfigurations = [
    ["studio-pro", "Studio Pro Manager", StudioProManager, "studioProManager"],
    ["widget-manager", "Widget Manager", WidgetManager, "widgetManager"],
    ["widget-preview", "Widget Preview", WidgetPreview, "widgetPreview"],
  ];

  const createTabFromConfig = R.curry((props, config) => {
    const [id, label, Component, propsKey] = config;
    return {
      id,
      label,
      component: React.createElement(Component, R.prop(propsKey, props)),
    };
  });

  const tabs = useMemo(
    () => R.map(createTabFromConfig(createTabProps), tabConfigurations),
    [createTabProps],
  );

  const activeTabContent = useMemo(() => {
    const foundTab = tabs.find((tab) => tab.id === activeTab);
    return foundTab ? foundTab.component : null;
  }, [tabs, activeTab]);

  const renderTabButton = R.curry((activeTab, setActiveTab, tab) => (
    <TabButton
      key={R.prop("id", tab)}
      label={R.prop("label", tab)}
      isActive={R.equals(activeTab, R.prop("id", tab))}
      onClick={() => setActiveTab(R.prop("id", tab))}
    />
  ));

  const handleAddWidget = useCallback(() => {
    if (
      invokeValidateRequired(["caption", "path"], {
        caption: newWidgetCaption,
        path: newWidgetPath,
      })
    ) {
      const newWidget = createWidget(newWidgetCaption, newWidgetPath);
      const updatedWidgets = [...widgets, newWidget];

      saveToStorage(STORAGE_KEYS.WIDGETS, updatedWidgets)
        .then(() => {
          setWidgets(updatedWidgets);
          setShowAddWidgetForm(false);
          setShowWidgetModal(false);
          setNewWidgetCaption("");
          setNewWidgetPath("");
        })
        .catch(console.error);
    }
  }, [newWidgetCaption, newWidgetPath, widgets]);

  return (
    <main className="app-container">
      <div className="app-header">
        <h1 className="app-title">
          <span className="title-icon">🍓</span>
          Kirakira Ichigo Manager
          <span className="title-sparkle">✨</span>
        </h1>
        <div className="theme-selector">
          <div className="catppuccin-banner">
            <img
              src={currentCatppuccinLogo}
              alt="Catppuccin"
              className="catppuccin-logo"
            />
            <div className="catppuccin-info">
              <span className="catppuccin-attribution">
                Latte, Frappé, Macchiato, Mocha themes powered by
              </span>
              <a
                href="https://catppuccin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="catppuccin-link"
              >
                Catppuccin
              </a>
            </div>
          </div>
          <div className="theme-options">
            <label className="theme-option">
              <input
                type="radio"
                name="theme"
                value="kiraichi"
                checked={state.currentTheme === "kiraichi"}
                onChange={handleThemeChange}
              />
              <span>KiraIchi Dark</span>
            </label>
            <label className="theme-option strawberry-theme">
              <input
                type="radio"
                name="theme"
                value="kiraichi-light"
                checked={state.currentTheme === "kiraichi-light"}
                onChange={handleThemeChange}
              />
              <span>KiraIchi Light</span>
            </label>

            <label className="theme-option catppuccin-theme catppuccin-latte-theme">
              <input
                type="radio"
                name="theme"
                value="latte"
                checked={state.currentTheme === "latte"}
                onChange={handleThemeChange}
              />
              <span>Latte</span>
            </label>
            <label className="theme-option catppuccin-theme catppuccin-frappe-theme">
              <input
                type="radio"
                name="theme"
                value="frappe"
                checked={state.currentTheme === "frappe"}
                onChange={handleThemeChange}
              />
              <span>Frappé</span>
            </label>
            <label className="theme-option catppuccin-theme catppuccin-macchiato-theme">
              <input
                type="radio"
                name="theme"
                value="macchiato"
                checked={state.currentTheme === "macchiato"}
                onChange={handleThemeChange}
              />
              <span>Macchiato</span>
            </label>
            <label className="theme-option catppuccin-theme catppuccin-mocha-theme">
              <input
                type="radio"
                name="theme"
                value="mocha"
                checked={state.currentTheme === "mocha"}
                onChange={handleThemeChange}
              />
              <span>Mocha</span>
            </label>
          </div>
        </div>
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
        title="🍓 Say Goodbye to Studio Pro?"
        message={
          versionToUninstall
            ? `Are you really really sure you want to uninstall Studio Pro ${versionToUninstall.version}? ✨\n\nOnce it's gone, there's no way to bring it back! Please think carefully, okay? 💝`
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
        isLoading={
          versionToUninstall
            ? getVersionLoadingState(versionLoadingStates, versionToUninstall.version).isUninstalling
            : false
        }
        relatedApps={relatedApps}
      />

      <ConfirmModal
        isOpen={showAppDeleteModal}
        title="🍓 Delete This App?"
        message={
          appToDelete
            ? `Do you really want to delete ${appToDelete.name}? 🥺\n\nI can't undo this once it's done! Are you absolutely sure? 💕`
            : ""
        }
        onConfirm={async () => {
          if (appToDelete) {
            setIsUninstalling(true);
            try {
              await invoke("delete_mendix_app", { appPath: appToDelete.path });
              await loadApps();

              setSelectedApps((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(appToDelete.path)) {
                  newSet.delete(appToDelete.path);
                  const selectedAppsArray = Array.from(newSet);
                  saveToStorage(
                    STORAGE_KEYS.SELECTED_APPS,
                    selectedAppsArray,
                  ).catch(console.error);
                }
                return newSet;
              });

              setIsUninstalling(false);
              setShowAppDeleteModal(false);
              setAppToDelete(null);
            } catch (error) {
              alert(`Failed to delete app: ${error}`);
              setIsUninstalling(false);
              setShowAppDeleteModal(false);
              setAppToDelete(null);
            }
          }
        }}
        onCancel={() => {
          setShowAppDeleteModal(false);
          setAppToDelete(null);
        }}
        isLoading={isUninstalling}
        relatedApps={[]}
      />

      <ConfirmModal
        isOpen={showWidgetDeleteModal}
        title="🍓 Remove Widget from List?"
        message={
          widgetToDelete
            ? `Should I remove "${widgetToDelete.caption}" from your widget list? 🎀\n\nDon't worry! This only removes it from my list - your files will stay safe and sound! 🌟`
            : ""
        }
        onConfirm={handleConfirmWidgetDelete}
        onCancel={handleCancelWidgetDelete}
        isLoading={false}
        relatedApps={[]}
      />

      <BuildResultModal
        showResultModal={showResultModal}
        buildResults={buildResults}
        setShowResultModal={setShowResultModal}
        setBuildResults={setBuildResults}
      />

      <DownloadModal
        isOpen={showDownloadModal}
        version={versionToDownload}
        onDownload={handleModalDownload}
        onClose={handleDownloadModalClose}
        onCancel={handleDownloadModalClose}
        isLoading={
          versionToDownload
            ? getVersionLoadingState(
                versionLoadingStates,
                versionToDownload.version,
              ).isDownloading
            : false
        }
      />
    </main>
  );
}

export default App;
