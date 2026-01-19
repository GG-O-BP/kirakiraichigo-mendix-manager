import * as R from "ramda";
import React, { useState, useMemo, useEffect } from "react";
import "./styles/index.css";

import { ITEMS_PER_PAGE } from "./utils";

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
  useWidgetPreview,
  useBuildDeploy,
  useUninstallModal,
  useAppDeleteModal,
  useWidgetModal,
  useWidgetDeleteModal,
  useDownloadModal,
  useResultModal,
} from "./hooks";

import {
  AppProvider,
  WidgetProvider,
  BuildDeployProvider,
  ModalProvider,
} from "./contexts";

const TAB_CONFIGURATIONS = [
  ["studio-pro", "Studio Pro Manager", StudioProManager],
  ["widget-manager", "Widget Manager", WidgetManager],
  ["widget-preview", "Widget Preview", WidgetPreview],
];

function App() {
  const theme = useTheme();
  const versions = useVersions();
  const appsHook = useApps();
  const widgetsHook = useWidgets();
  const widgetPreviewHook = useWidgetPreview();

  // Individual modal hooks
  const uninstallModal = useUninstallModal();
  const appDeleteModal = useAppDeleteModal();
  const widgetModal = useWidgetModal();
  const widgetDeleteModal = useWidgetDeleteModal();
  const downloadModal = useDownloadModal();
  const resultModal = useResultModal();

  const buildDeploy = useBuildDeploy({
    onShowResultModal: resultModal.setShowModal,
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

  // Context values
  const appContextValue = useMemo(
    () => ({
      apps: appsHook.apps,
      filteredApps: appsHook.filteredApps,
      selectedApps: appsHook.selectedApps,
      appSearchTerm: appsHook.appSearchTerm,
      setAppSearchTerm: appsHook.setAppSearchTerm,
      versionFilter: appsHook.versionFilter,
      setVersionFilter: appsHook.setVersionFilter,
      handleAppClick: appsHook.handleAppClick,
      handleDeleteApp: appsHook.handleDeleteApp,
      loadApps: appsHook.loadApps,
      currentPage: appsHook.currentPage,
      setCurrentPage: appsHook.setCurrentPage,
      hasMore: appsHook.hasMore,
      ITEMS_PER_PAGE,
    }),
    [appsHook],
  );

  const widgetContextValue = useMemo(
    () => ({
      widgets: widgetsHook.widgets,
      setWidgets: widgetsHook.setWidgets,
      filteredWidgets: widgetsHook.filteredWidgets,
      selectedWidgets: widgetsHook.selectedWidgets,
      setSelectedWidgets: widgetsHook.setSelectedWidgets,
      widgetSearchTerm: widgetsHook.widgetSearchTerm,
      setWidgetSearchTerm: widgetsHook.setWidgetSearchTerm,
      newWidgetCaption: widgetsHook.newWidgetCaption,
      setNewWidgetCaption: widgetsHook.setNewWidgetCaption,
      newWidgetPath: widgetsHook.newWidgetPath,
      setNewWidgetPath: widgetsHook.setNewWidgetPath,
      handleAddWidget: widgetsHook.handleAddWidget,
      handleWidgetDelete: widgetsHook.handleWidgetDelete,
      // Widget Preview
      selectedWidgetForPreview: widgetPreviewHook.selectedWidgetForPreview,
      setSelectedWidgetForPreview: widgetPreviewHook.setSelectedWidgetForPreview,
      properties: widgetPreviewHook.properties,
      updateProperty: widgetPreviewHook.updateProperty,
      widgetPreviewSearch: widgetPreviewHook.widgetPreviewSearch,
      setWidgetPreviewSearch: widgetPreviewHook.setWidgetPreviewSearch,
    }),
    [widgetsHook, widgetPreviewHook],
  );

  const buildDeployContextValue = useMemo(
    () => ({
      packageManager: buildDeploy.packageManager,
      setPackageManager: buildDeploy.setPackageManager,
      isInstalling: buildDeploy.isInstalling,
      isBuilding: buildDeploy.isBuilding,
      // Wrap handlers to pass current state automatically
      handleInstall: () =>
        buildDeploy.handleInstall({
          selectedWidgets: widgetsHook.selectedWidgets,
          widgets: widgetsHook.widgets,
        }),
      handleBuildDeploy: () =>
        buildDeploy.handleBuildDeploy({
          selectedWidgets: widgetsHook.selectedWidgets,
          selectedApps: appsHook.selectedApps,
          widgets: widgetsHook.widgets,
          apps: appsHook.apps,
        }),
      buildResults: buildDeploy.buildResults,
      setBuildResults: buildDeploy.setBuildResults,
      inlineResults: buildDeploy.inlineResults,
      setInlineResults: buildDeploy.setInlineResults,
      isUninstalling: buildDeploy.isUninstalling,
      setIsUninstalling: buildDeploy.setIsUninstalling,
    }),
    [buildDeploy, widgetsHook.selectedWidgets, widgetsHook.widgets, appsHook.selectedApps, appsHook.apps],
  );

  const modalContextValue = useMemo(
    () => ({
      // Uninstall Modal
      showUninstallModal: uninstallModal.showModal,
      versionToUninstall: uninstallModal.versionToUninstall,
      relatedApps: uninstallModal.relatedApps,
      setRelatedApps: uninstallModal.setRelatedApps,
      openUninstallModal: uninstallModal.open,
      closeUninstallModal: uninstallModal.close,
      // App Delete Modal
      showAppDeleteModal: appDeleteModal.showModal,
      appToDelete: appDeleteModal.appToDelete,
      openAppDeleteModal: appDeleteModal.open,
      closeAppDeleteModal: appDeleteModal.close,
      // Widget Modal
      showWidgetModal: widgetModal.showModal,
      showAddWidgetForm: widgetModal.showAddForm,
      setShowWidgetModal: widgetModal.setShowModal,
      setShowAddWidgetForm: widgetModal.setShowAddForm,
      // Widget Delete Modal
      showWidgetDeleteModal: widgetDeleteModal.showModal,
      widgetToDelete: widgetDeleteModal.widgetToDelete,
      openWidgetDeleteModal: widgetDeleteModal.open,
      closeWidgetDeleteModal: widgetDeleteModal.close,
      handleWidgetDeleteClick: widgetDeleteModal.open,
      // Download Modal
      showDownloadModal: downloadModal.showModal,
      versionToDownload: downloadModal.versionToDownload,
      openDownloadModal: downloadModal.open,
      closeDownloadModal: downloadModal.close,
      // Result Modal
      showResultModal: resultModal.showModal,
      setShowResultModal: resultModal.setShowModal,
    }),
    [uninstallModal, appDeleteModal, widgetModal, widgetDeleteModal, downloadModal, resultModal],
  );

  // StudioProManager still uses props for now (more complex state)
  const studioProManagerProps = useMemo(
    () => ({
      searchTerm: versions.searchTerm,
      setSearchTerm: versions.setSearchTerm,
      versions: versions.versions,
      filteredVersions: versions.filteredVersions,
      selectedVersion: versions.selectedVersion,
      handleVersionClick: versions.handleVersionClick,
      apps: appsHook.apps,
      versionLoadingStates: versions.versionLoadingStates,
      handleLaunchStudioPro: versions.handleLaunchStudioPro,
      handleUninstallClick: uninstallModal.open,
      fetchVersionsFromDatagrid: versions.fetchVersionsFromDatagrid,
      downloadableVersions: versions.downloadableVersions,
      isLoadingDownloadableVersions: versions.isLoadingDownloadableVersions,
      handleDownloadVersion: downloadModal.open,
      showOnlyDownloadableVersions: versions.showOnlyDownloadableVersions,
      setShowOnlyDownloadableVersions: versions.setShowOnlyDownloadableVersions,
      showLTSOnly: versions.showLTSOnly,
      setShowLTSOnly: versions.setShowLTSOnly,
      showMTSOnly: versions.showMTSOnly,
      setShowMTSOnly: versions.setShowMTSOnly,
      showBetaOnly: versions.showBetaOnly,
      setShowBetaOnly: versions.setShowBetaOnly,
    }),
    [versions, appsHook.apps, uninstallModal.open, downloadModal.open],
  );

  const createTabFromConfig = R.curry((config) => {
    const [id, label, Component] = config;
    const componentElement = R.cond([
      [R.equals("studio-pro"), () => React.createElement(Component, studioProManagerProps)],
      [R.equals("widget-manager"), () => React.createElement(Component, { versions: versions.versions })],
      [R.equals("widget-preview"), () => React.createElement(Component)],
      [R.T, () => null],
    ])(id);

    return {
      id,
      label,
      component: componentElement,
    };
  });

  const tabs = useMemo(
    () => R.map(createTabFromConfig, TAB_CONFIGURATIONS),
    [studioProManagerProps, versions.versions],
  );

  const activeTabContent = useMemo(
    () =>
      R.pipe(
        R.find(R.propEq(activeTab, "id")),
        R.ifElse(R.isNil, R.always(null), R.prop("component")),
      )(tabs),
    [tabs, activeTab],
  );

  const renderTabButton = R.curry((activeTab, setActiveTab, tab) => (
    <TabButton
      key={R.prop("id", tab)}
      label={R.prop("label", tab)}
      isActive={R.equals(activeTab, R.prop("id", tab))}
      onClick={() => setActiveTab(R.prop("id", tab))}
    />
  ));

  return (
    <ModalProvider value={modalContextValue}>
      <AppProvider value={appContextValue}>
        <WidgetProvider value={widgetContextValue}>
          <BuildDeployProvider value={buildDeployContextValue}>
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
                uninstallModal={uninstallModal}
                appDeleteModal={appDeleteModal}
                widgetModal={widgetModal}
                widgetDeleteModal={widgetDeleteModal}
                downloadModal={downloadModal}
                resultModal={resultModal}
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
          </BuildDeployProvider>
        </WidgetProvider>
      </AppProvider>
    </ModalProvider>
  );
}

export default App;
