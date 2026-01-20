import { useMemo } from "react";

export function useContextValues({
  appsHook,
  widgetsHook,
  widgetPreviewHook,
  buildDeploy,
  modals,
  versions,
}) {
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
    }),
    [appsHook],
  );

  const widgetCollectionContextValue = useMemo(
    () => ({
      widgets: widgetsHook.widgets,
      setWidgets: widgetsHook.setWidgets,
      filteredWidgets: widgetsHook.filteredWidgets,
      selectedWidgets: widgetsHook.selectedWidgets,
      setSelectedWidgets: widgetsHook.setSelectedWidgets,
      widgetSearchTerm: widgetsHook.widgetSearchTerm,
      setWidgetSearchTerm: widgetsHook.setWidgetSearchTerm,
      handleAddWidget: widgetsHook.handleAddWidget,
      handleWidgetDelete: widgetsHook.handleWidgetDelete,
    }),
    [widgetsHook],
  );

  const widgetPreviewContextValue = useMemo(
    () => ({
      selectedWidgetForPreview: widgetPreviewHook.selectedWidgetForPreview,
      setSelectedWidgetForPreview:
        widgetPreviewHook.setSelectedWidgetForPreview,
      properties: widgetPreviewHook.properties,
      updateProperty: widgetPreviewHook.updateProperty,
      widgetPreviewSearch: widgetPreviewHook.widgetPreviewSearch,
      setWidgetPreviewSearch: widgetPreviewHook.setWidgetPreviewSearch,
    }),
    [widgetPreviewHook],
  );

  const widgetFormContextValue = useMemo(
    () => ({
      newWidgetCaption: widgetsHook.newWidgetCaption,
      setNewWidgetCaption: widgetsHook.setNewWidgetCaption,
      newWidgetPath: widgetsHook.newWidgetPath,
      setNewWidgetPath: widgetsHook.setNewWidgetPath,
    }),
    [
      widgetsHook.newWidgetCaption,
      widgetsHook.setNewWidgetCaption,
      widgetsHook.newWidgetPath,
      widgetsHook.setNewWidgetPath,
    ],
  );

  const buildDeployContextValue = useMemo(
    () => ({
      packageManager: buildDeploy.packageManager,
      setPackageManager: buildDeploy.setPackageManager,
      isInstalling: buildDeploy.isInstalling,
      isBuilding: buildDeploy.isBuilding,
      handleInstall: buildDeploy.handleInstall,
      handleBuildDeploy: buildDeploy.handleBuildDeploy,
      buildResults: buildDeploy.buildResults,
      setBuildResults: buildDeploy.setBuildResults,
      inlineResults: buildDeploy.inlineResults,
      setInlineResults: buildDeploy.setInlineResults,
      isUninstalling: buildDeploy.isUninstalling,
      setIsUninstalling: buildDeploy.setIsUninstalling,
    }),
    [buildDeploy],
  );

  const studioProModalContextValue = useMemo(
    () => ({
      showUninstallModal: modals.uninstall.showModal,
      versionToUninstall: modals.uninstall.versionToUninstall,
      relatedApps: modals.uninstall.relatedApps,
      setRelatedApps: modals.uninstall.setRelatedApps,
      openUninstallModal: modals.uninstall.open,
      closeUninstallModal: modals.uninstall.close,
      showDownloadModal: modals.download.showModal,
      versionToDownload: modals.download.versionToDownload,
      openDownloadModal: modals.download.open,
      closeDownloadModal: modals.download.close,
    }),
    [modals.uninstall, modals.download],
  );

  const appModalContextValue = useMemo(
    () => ({
      showAppDeleteModal: modals.appDelete.showModal,
      appToDelete: modals.appDelete.appToDelete,
      openAppDeleteModal: modals.appDelete.open,
      closeAppDeleteModal: modals.appDelete.close,
    }),
    [modals.appDelete],
  );

  const widgetModalContextValue = useMemo(
    () => ({
      showWidgetModal: modals.widget.showModal,
      showAddWidgetForm: modals.widget.showAddForm,
      setShowWidgetModal: modals.widget.setShowModal,
      setShowAddWidgetForm: modals.widget.setShowAddForm,
      showWidgetDeleteModal: modals.widgetDelete.showModal,
      widgetToDelete: modals.widgetDelete.widgetToDelete,
      openWidgetDeleteModal: modals.widgetDelete.open,
      closeWidgetDeleteModal: modals.widgetDelete.close,
      handleWidgetDeleteClick: modals.widgetDelete.open,
    }),
    [modals.widget, modals.widgetDelete],
  );

  const buildModalContextValue = useMemo(
    () => ({
      showResultModal: modals.result.showModal,
      setShowResultModal: modals.result.setShowModal,
    }),
    [modals.result],
  );

  const combinedModalContextValue = useMemo(
    () => ({
      ...studioProModalContextValue,
      ...appModalContextValue,
      ...widgetModalContextValue,
      ...buildModalContextValue,
    }),
    [studioProModalContextValue, appModalContextValue, widgetModalContextValue, buildModalContextValue],
  );

  const versionsContextValue = useMemo(
    () => ({
      searchTerm: versions.searchTerm,
      setSearchTerm: versions.setSearchTerm,
      versions: versions.versions,
      filteredVersions: versions.filteredVersions,
      selectedVersion: versions.selectedVersion,
      handleVersionClick: versions.handleVersionClick,
      versionLoadingStates: versions.versionLoadingStates,
      handleLaunchStudioPro: versions.handleLaunchStudioPro,
      handleUninstallStudioPro: versions.handleUninstallStudioPro,
      fetchVersionsFromDatagrid: versions.fetchVersionsFromDatagrid,
      downloadableVersions: versions.downloadableVersions,
      isLoadingDownloadableVersions: versions.isLoadingDownloadableVersions,
      handleModalDownload: versions.handleModalDownload,
      showOnlyDownloadableVersions: versions.showOnlyDownloadableVersions,
      setShowOnlyDownloadableVersions: versions.setShowOnlyDownloadableVersions,
      showLTSOnly: versions.showLTSOnly,
      setShowLTSOnly: versions.setShowLTSOnly,
      showMTSOnly: versions.showMTSOnly,
      setShowMTSOnly: versions.setShowMTSOnly,
      showBetaOnly: versions.showBetaOnly,
      setShowBetaOnly: versions.setShowBetaOnly,
    }),
    [versions],
  );

  return {
    appContextValue,
    widgetCollectionContextValue,
    widgetPreviewContextValue,
    widgetFormContextValue,
    buildDeployContextValue,
    modalContextValue: combinedModalContextValue,
    versionsContextValue,
    studioProModalContextValue,
    appModalContextValue,
    widgetModalContextValue,
    buildModalContextValue,
  };
}
