import * as R from "ramda";
import React, { useState, useMemo } from "react";
import "./styles/index.css";

import { TabButton, AppHeader } from "./components/common";
import { StudioProManager, WidgetManager, WidgetPreview } from "./components/tabs";
import { AppModals } from "./components/modals";

import { useAppInitialization, useContextValues } from "./hooks";
import {
  AppProvider,
  WidgetCollectionProvider,
  WidgetPreviewProvider,
  WidgetFormProvider,
  BuildDeployProvider,
  ModalProvider,
} from "./contexts";

const TAB_CONFIGURATIONS = [
  ["studio-pro", "Studio Pro Manager", StudioProManager],
  ["widget-manager", "Widget Manager", WidgetManager],
  ["widget-preview", "Widget Preview", WidgetPreview],
];

function App() {
  const { theme, versions, appsHook, widgetsHook, widgetPreviewHook, buildDeploy, modals } =
    useAppInitialization();

  const {
    appContextValue,
    widgetCollectionContextValue,
    widgetPreviewContextValue,
    widgetFormContextValue,
    buildDeployContextValue,
    modalContextValue,
  } = useContextValues({ appsHook, widgetsHook, widgetPreviewHook, buildDeploy, modals });

  const [activeTab, setActiveTab] = useState("studio-pro");

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
      handleUninstallClick: modals.uninstall.open,
      fetchVersionsFromDatagrid: versions.fetchVersionsFromDatagrid,
      downloadableVersions: versions.downloadableVersions,
      isLoadingDownloadableVersions: versions.isLoadingDownloadableVersions,
      handleDownloadVersion: modals.download.open,
      showOnlyDownloadableVersions: versions.showOnlyDownloadableVersions,
      setShowOnlyDownloadableVersions: versions.setShowOnlyDownloadableVersions,
      showLTSOnly: versions.showLTSOnly,
      setShowLTSOnly: versions.setShowLTSOnly,
      showMTSOnly: versions.showMTSOnly,
      setShowMTSOnly: versions.setShowMTSOnly,
      showBetaOnly: versions.showBetaOnly,
      setShowBetaOnly: versions.setShowBetaOnly,
    }),
    [versions, appsHook.apps, modals.uninstall.open, modals.download.open],
  );

  const createTabFromConfig = R.curry((config) => {
    const [id, label, Component] = config;
    const componentElement = R.cond([
      [R.equals("studio-pro"), () => React.createElement(Component, studioProManagerProps)],
      [R.equals("widget-manager"), () => React.createElement(Component, { versions: versions.versions })],
      [R.equals("widget-preview"), () => React.createElement(Component)],
      [R.T, () => null],
    ])(id);

    return { id, label, component: componentElement };
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
        <WidgetCollectionProvider value={widgetCollectionContextValue}>
          <WidgetPreviewProvider value={widgetPreviewContextValue}>
            <WidgetFormProvider value={widgetFormContextValue}>
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
                    uninstallModal={modals.uninstall}
                    appDeleteModal={modals.appDelete}
                    widgetModal={modals.widget}
                    widgetDeleteModal={modals.widgetDelete}
                    downloadModal={modals.download}
                    resultModal={modals.result}
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
            </WidgetFormProvider>
          </WidgetPreviewProvider>
        </WidgetCollectionProvider>
      </AppProvider>
    </ModalProvider>
  );
}

export default App;
