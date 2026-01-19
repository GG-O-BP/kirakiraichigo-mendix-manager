import * as R from "ramda";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./styles/index.css";

import {
  STORAGE_KEYS,
  ITEMS_PER_PAGE,
  saveToStorage,
  getVersionLoadingState,
  updateVersionLoadingStates,
} from "./utils/functional";

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

import {
  useTheme,
  useVersions,
  useApps,
  useWidgets,
  useModals,
  useBuildDeploy,
} from "./hooks";

const STUDIO_PRO_MANAGER_PROP_KEYS = [
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

const WIDGET_MANAGER_PROP_KEYS = [
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

const WIDGET_PREVIEW_PROP_KEYS = [
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

function App() {
  const theme = useTheme();
  const versions = useVersions();
  const appsHook = useApps();
  const widgetsHook = useWidgets();
  const modals = useModals();
  const buildDeploy = useBuildDeploy({
    selectedWidgets: widgetsHook.selectedWidgets,
    selectedApps: appsHook.selectedApps,
    widgets: widgetsHook.widgets,
    apps: appsHook.apps,
    setShowResultModal: modals.setShowResultModal,
  });

  const [activeTab, setActiveTab] = useState("studio-pro");

  // Load initial data
  useEffect(() => {
    const loadInitialData = R.juxt([
      versions.loadVersions,
      appsHook.loadApps,
      widgetsHook.loadWidgets,
    ]);
    loadInitialData();
  }, [versions.loadVersions, appsHook.loadApps, widgetsHook.loadWidgets]);

  // Handle uninstall click - combines versions and modals
  const handleUninstallClick = useCallback(
    (version) => modals.openUninstallModal(version),
    [modals.openUninstallModal],
  );

  // Handle widget delete click
  const handleWidgetDeleteClick = useCallback(
    (widget) => modals.openWidgetDeleteModal(widget),
    [modals.openWidgetDeleteModal],
  );

  // Handle download version - opens download modal
  const handleDownloadVersion = useCallback(
    (version) => modals.openDownloadModal(version),
    [modals.openDownloadModal],
  );

  // Handle uninstall Studio Pro
  const handleUninstallStudioPro = useCallback(
    async (version, deleteApps = false, relatedAppsList = []) => {
      const versionId = version.version;
      versions.setVersionLoadingStates((prev) =>
        updateVersionLoadingStates(versionId, "uninstall", true, prev),
      );

      const cleanupUninstallState = () => {
        versions.setVersionLoadingStates((prev) =>
          updateVersionLoadingStates(versionId, "uninstall", false, prev),
        );
        modals.closeUninstallModal();
      };

      try {
        if (deleteApps && relatedAppsList.length > 0) {
          for (const app of relatedAppsList) {
            await invoke("delete_mendix_app", {
              appPath: app.path,
            });
          }
        }

        const result = await invoke("uninstall_studio_pro_and_wait", {
          version: version.version,
          timeoutSeconds: 60,
        });

        await versions.loadVersions();
        if (deleteApps) {
          await appsHook.loadApps();
        }

        if (result.timed_out) {
          console.warn(
            `Uninstall of Studio Pro ${version.version} timed out, but may still complete`,
          );
        }

        cleanupUninstallState();
      } catch (error) {
        const errorMsg = deleteApps
          ? `Failed to uninstall Studio Pro ${version.version} with apps: ${error}`
          : `Failed to uninstall Studio Pro ${version.version}: ${error}`;
        alert(errorMsg);
        cleanupUninstallState();
      }
    },
    [versions.loadVersions, appsHook.loadApps, versions.setVersionLoadingStates, modals.closeUninstallModal],
  );

  // Handle confirm widget delete
  const handleConfirmWidgetDelete = useCallback(async () => {
    const success = await widgetsHook.handleWidgetDelete(modals.widgetToDelete);
    if (success) {
      modals.closeWidgetDeleteModal();
    }
  }, [widgetsHook.handleWidgetDelete, modals.widgetToDelete, modals.closeWidgetDeleteModal]);

  // Handle app delete
  const handleConfirmAppDelete = useCallback(async () => {
    if (modals.appToDelete) {
      buildDeploy.setIsUninstalling(true);
      try {
        await invoke("delete_mendix_app", { appPath: modals.appToDelete.path });
        await appsHook.loadApps();

        appsHook.setSelectedApps((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(modals.appToDelete.path)) {
            newSet.delete(modals.appToDelete.path);
            const selectedAppsArray = Array.from(newSet);
            saveToStorage(STORAGE_KEYS.SELECTED_APPS, selectedAppsArray).catch(
              console.error,
            );
          }
          return newSet;
        });

        buildDeploy.setIsUninstalling(false);
        modals.closeAppDeleteModal();
      } catch (error) {
        alert(`Failed to delete app: ${error}`);
        buildDeploy.setIsUninstalling(false);
        modals.closeAppDeleteModal();
      }
    }
  }, [modals.appToDelete, appsHook.loadApps, appsHook.setSelectedApps, buildDeploy.setIsUninstalling, modals.closeAppDeleteModal]);

  // Handle add widget
  const handleAddWidget = useCallback(() => {
    widgetsHook.handleAddWidget(() => {
      modals.setShowAddWidgetForm(false);
      modals.setShowWidgetModal(false);
    });
  }, [widgetsHook.handleAddWidget, modals.setShowAddWidgetForm, modals.setShowWidgetModal]);

  // Create state object for tab props
  const stateObject = useMemo(
    () => ({
      // Versions
      searchTerm: versions.searchTerm,
      setSearchTerm: versions.setSearchTerm,
      versions: versions.versions,
      filteredVersions: versions.filteredVersions,
      selectedVersion: versions.selectedVersion,
      handleVersionClick: versions.handleVersionClick,
      versionLoadingStates: versions.versionLoadingStates,
      handleLaunchStudioPro: versions.handleLaunchStudioPro,
      fetchVersionsFromDatagrid: versions.fetchVersionsFromDatagrid,
      downloadableVersions: versions.downloadableVersions,
      isLoadingDownloadableVersions: versions.isLoadingDownloadableVersions,
      showOnlyDownloadableVersions: versions.showOnlyDownloadableVersions,
      setShowOnlyDownloadableVersions: versions.setShowOnlyDownloadableVersions,
      showLTSOnly: versions.showLTSOnly,
      setShowLTSOnly: versions.setShowLTSOnly,
      showMTSOnly: versions.showMTSOnly,
      setShowMTSOnly: versions.setShowMTSOnly,
      showBetaOnly: versions.showBetaOnly,
      setShowBetaOnly: versions.setShowBetaOnly,

      // Apps
      apps: appsHook.apps,
      versionFilter: appsHook.versionFilter,
      setVersionFilter: appsHook.setVersionFilter,
      appSearchTerm: appsHook.appSearchTerm,
      setAppSearchTerm: appsHook.setAppSearchTerm,
      filteredApps: appsHook.filteredApps,
      currentPage: appsHook.currentPage,
      setCurrentPage: appsHook.setCurrentPage,
      hasMore: appsHook.hasMore,
      selectedApps: appsHook.selectedApps,
      handleAppClick: appsHook.handleAppClick,

      // Widgets
      widgets: widgetsHook.widgets,
      setWidgets: widgetsHook.setWidgets,
      filteredWidgets: widgetsHook.filteredWidgets,
      widgetSearchTerm: widgetsHook.widgetSearchTerm,
      setWidgetSearchTerm: widgetsHook.setWidgetSearchTerm,
      widgetPreviewSearch: widgetsHook.widgetPreviewSearch,
      setWidgetPreviewSearch: widgetsHook.setWidgetPreviewSearch,
      selectedWidgets: widgetsHook.selectedWidgets,
      setSelectedWidgets: widgetsHook.setSelectedWidgets,
      selectedWidgetForPreview: widgetsHook.selectedWidgetForPreview,
      setSelectedWidgetForPreview: widgetsHook.setSelectedWidgetForPreview,
      setNewWidgetCaption: widgetsHook.setNewWidgetCaption,
      setNewWidgetPath: widgetsHook.setNewWidgetPath,
      properties: widgetsHook.properties,
      updateProperty: widgetsHook.updateProperty,

      // Modals
      setShowWidgetModal: modals.setShowWidgetModal,
      setShowAddWidgetForm: modals.setShowAddWidgetForm,

      // Build/Deploy
      packageManager: buildDeploy.packageManager,
      setPackageManager: buildDeploy.setPackageManager,
      handleInstall: buildDeploy.handleInstall,
      handleBuildDeploy: buildDeploy.handleBuildDeploy,
      isInstalling: buildDeploy.isInstalling,
      isBuilding: buildDeploy.isBuilding,
      inlineResults: buildDeploy.inlineResults,
      setInlineResults: buildDeploy.setInlineResults,

      // Handlers
      handleUninstallClick,
      handleDownloadVersion,
      handleWidgetDeleteClick,
    }),
    [
      versions,
      appsHook,
      widgetsHook,
      modals.setShowWidgetModal,
      modals.setShowAddWidgetForm,
      buildDeploy,
      handleUninstallClick,
      handleDownloadVersion,
      handleWidgetDeleteClick,
    ],
  );

  const createTabPropsFromState = R.applySpec({
    studioProManager: R.pick(STUDIO_PRO_MANAGER_PROP_KEYS),
    widgetManager: R.pipe(
      R.pick(WIDGET_MANAGER_PROP_KEYS),
      R.assoc("ITEMS_PER_PAGE", ITEMS_PER_PAGE),
    ),
    widgetPreview: R.pick(WIDGET_PREVIEW_PROP_KEYS),
  });

  const createTabProps = useMemo(
    () => createTabPropsFromState(stateObject),
    [stateObject],
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
              src={theme.currentLogo}
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
                checked={theme.currentTheme === "kiraichi"}
                onChange={theme.handleThemeChange}
              />
              <span>KiraIchi Dark</span>
            </label>
            <label className="theme-option strawberry-theme">
              <input
                type="radio"
                name="theme"
                value="kiraichi-light"
                checked={theme.currentTheme === "kiraichi-light"}
                onChange={theme.handleThemeChange}
              />
              <span>KiraIchi Light</span>
            </label>
            <label className="theme-option catppuccin-theme catppuccin-latte-theme">
              <input
                type="radio"
                name="theme"
                value="latte"
                checked={theme.currentTheme === "latte"}
                onChange={theme.handleThemeChange}
              />
              <span>Latte</span>
            </label>
            <label className="theme-option catppuccin-theme catppuccin-frappe-theme">
              <input
                type="radio"
                name="theme"
                value="frappe"
                checked={theme.currentTheme === "frappe"}
                onChange={theme.handleThemeChange}
              />
              <span>Frappé</span>
            </label>
            <label className="theme-option catppuccin-theme catppuccin-macchiato-theme">
              <input
                type="radio"
                name="theme"
                value="macchiato"
                checked={theme.currentTheme === "macchiato"}
                onChange={theme.handleThemeChange}
              />
              <span>Macchiato</span>
            </label>
            <label className="theme-option catppuccin-theme catppuccin-mocha-theme">
              <input
                type="radio"
                name="theme"
                value="mocha"
                checked={theme.currentTheme === "mocha"}
                onChange={theme.handleThemeChange}
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
        showWidgetModal={modals.showWidgetModal}
        showAddWidgetForm={modals.showAddWidgetForm}
        setShowWidgetModal={modals.setShowWidgetModal}
        setShowAddWidgetForm={modals.setShowAddWidgetForm}
        newWidgetCaption={widgetsHook.newWidgetCaption}
        setNewWidgetCaption={widgetsHook.setNewWidgetCaption}
        newWidgetPath={widgetsHook.newWidgetPath}
        setNewWidgetPath={widgetsHook.setNewWidgetPath}
        setWidgets={widgetsHook.setWidgets}
      />

      <ConfirmModal
        isOpen={modals.showUninstallModal}
        title="🍓 Say Goodbye to Studio Pro?"
        message={
          modals.versionToUninstall
            ? `Are you really really sure you want to uninstall Studio Pro ${modals.versionToUninstall.version}? ✨\n\nOnce it's gone, there's no way to bring it back! Please think carefully, okay? 💝`
            : ""
        }
        onConfirm={async () => {
          if (modals.versionToUninstall) {
            await handleUninstallStudioPro(
              modals.versionToUninstall,
              false,
              modals.relatedApps,
            );
          }
        }}
        onConfirmWithApps={
          modals.relatedApps.length > 0
            ? async () => {
                if (modals.versionToUninstall) {
                  await handleUninstallStudioPro(
                    modals.versionToUninstall,
                    true,
                    modals.relatedApps,
                  );
                }
              }
            : null
        }
        onCancel={modals.closeUninstallModal}
        isLoading={
          modals.versionToUninstall
            ? getVersionLoadingState(
                versions.versionLoadingStates,
                modals.versionToUninstall.version,
              ).isUninstalling
            : false
        }
        relatedApps={modals.relatedApps}
      />

      <ConfirmModal
        isOpen={modals.showAppDeleteModal}
        title="🍓 Delete This App?"
        message={
          modals.appToDelete
            ? `Do you really want to delete ${modals.appToDelete.name}? 🥺\n\nI can't undo this once it's done! Are you absolutely sure? 💕`
            : ""
        }
        onConfirm={handleConfirmAppDelete}
        onCancel={modals.closeAppDeleteModal}
        isLoading={buildDeploy.isUninstalling}
        relatedApps={[]}
      />

      <ConfirmModal
        isOpen={modals.showWidgetDeleteModal}
        title="🍓 Remove Widget from List?"
        message={
          modals.widgetToDelete
            ? `Should I remove "${modals.widgetToDelete.caption}" from your widget list? 🎀\n\nDon't worry! This only removes it from my list - your files will stay safe and sound! 🌟`
            : ""
        }
        onConfirm={handleConfirmWidgetDelete}
        onCancel={modals.closeWidgetDeleteModal}
        isLoading={false}
        relatedApps={[]}
      />

      <BuildResultModal
        showResultModal={modals.showResultModal}
        buildResults={buildDeploy.buildResults}
        setShowResultModal={modals.setShowResultModal}
        setBuildResults={buildDeploy.setBuildResults}
      />

      <DownloadModal
        isOpen={modals.showDownloadModal}
        version={modals.versionToDownload}
        onDownload={versions.handleModalDownload}
        onClose={modals.closeDownloadModal}
        onCancel={modals.closeDownloadModal}
        isLoading={
          modals.versionToDownload
            ? getVersionLoadingState(
                versions.versionLoadingStates,
                modals.versionToDownload.version,
              ).isDownloading
            : false
        }
      />
    </main>
  );
}

export default App;
