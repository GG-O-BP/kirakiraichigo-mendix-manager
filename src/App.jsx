import * as R from "ramda";
import React, { useState, useMemo, useEffect } from "react";
import "./styles/index.css";

import { ITEMS_PER_PAGE } from "./utils/functional";

import { TabButton, AppHeader } from "./components/common";
import {
  StudioProManager,
  WidgetManager,
  WidgetPreview,
} from "./components/tabs";
import { AppModals } from "./components/modals";

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

const TAB_CONFIGURATIONS = [
  ["studio-pro", "Studio Pro Manager", StudioProManager, "studioProManager"],
  ["widget-manager", "Widget Manager", WidgetManager, "widgetManager"],
  ["widget-preview", "Widget Preview", WidgetPreview, "widgetPreview"],
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

      // Modal open handlers (directly from useModals)
      handleUninstallClick: modals.openUninstallModal,
      handleDownloadVersion: modals.openDownloadModal,
      handleWidgetDeleteClick: modals.openWidgetDeleteModal,
    }),
    [
      versions,
      appsHook,
      widgetsHook,
      modals.setShowWidgetModal,
      modals.setShowAddWidgetForm,
      modals.openUninstallModal,
      modals.openDownloadModal,
      modals.openWidgetDeleteModal,
      buildDeploy,
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

  const createTabFromConfig = R.curry((props, config) => {
    const [id, label, Component, propsKey] = config;
    return {
      id,
      label,
      component: React.createElement(Component, R.prop(propsKey, props)),
    };
  });

  const tabs = useMemo(
    () => R.map(createTabFromConfig(createTabProps), TAB_CONFIGURATIONS),
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
      <AppHeader
        currentTheme={theme.currentTheme}
        currentLogo={theme.currentLogo}
        handleThemeChange={theme.handleThemeChange}
      />

      <div className="tabs">
        {R.map(renderTabButton(activeTab, setActiveTab), tabs)}
      </div>

      <div className="tab-content">{activeTabContent}</div>

      <AppModals
        modals={modals}
        versionLoadingStates={versions.versionLoadingStates}
        handleUninstallStudioPro={versions.handleUninstallStudioPro}
        handleDeleteApp={appsHook.handleDeleteApp}
        loadApps={appsHook.loadApps}
        handleWidgetDelete={widgetsHook.handleWidgetDelete}
        newWidgetCaption={widgetsHook.newWidgetCaption}
        setNewWidgetCaption={widgetsHook.setNewWidgetCaption}
        newWidgetPath={widgetsHook.newWidgetPath}
        setNewWidgetPath={widgetsHook.setNewWidgetPath}
        setWidgets={widgetsHook.setWidgets}
        handleAddWidget={widgetsHook.handleAddWidget}
        isUninstalling={buildDeploy.isUninstalling}
        setIsUninstalling={buildDeploy.setIsUninstalling}
        buildResults={buildDeploy.buildResults}
        setBuildResults={buildDeploy.setBuildResults}
        handleModalDownload={versions.handleModalDownload}
      />
    </main>
  );
}

export default App;
