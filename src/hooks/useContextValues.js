import { useMemo } from "react";
import { ITEMS_PER_PAGE } from "../utils";

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
      currentPage: appsHook.currentPage,
      setCurrentPage: appsHook.setCurrentPage,
      hasMore: appsHook.hasMore,
      ITEMS_PER_PAGE,
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
    [
      buildDeploy,
      widgetsHook.selectedWidgets,
      widgetsHook.widgets,
      appsHook.selectedApps,
      appsHook.apps,
    ],
  );

  const modalContextValue = useMemo(
    () => ({
      showUninstallModal: modals.uninstall.showModal,
      versionToUninstall: modals.uninstall.versionToUninstall,
      relatedApps: modals.uninstall.relatedApps,
      setRelatedApps: modals.uninstall.setRelatedApps,
      openUninstallModal: modals.uninstall.open,
      closeUninstallModal: modals.uninstall.close,
      showAppDeleteModal: modals.appDelete.showModal,
      appToDelete: modals.appDelete.appToDelete,
      openAppDeleteModal: modals.appDelete.open,
      closeAppDeleteModal: modals.appDelete.close,
      showWidgetModal: modals.widget.showModal,
      showAddWidgetForm: modals.widget.showAddForm,
      setShowWidgetModal: modals.widget.setShowModal,
      setShowAddWidgetForm: modals.widget.setShowAddForm,
      showWidgetDeleteModal: modals.widgetDelete.showModal,
      widgetToDelete: modals.widgetDelete.widgetToDelete,
      openWidgetDeleteModal: modals.widgetDelete.open,
      closeWidgetDeleteModal: modals.widgetDelete.close,
      handleWidgetDeleteClick: modals.widgetDelete.open,
      showDownloadModal: modals.download.showModal,
      versionToDownload: modals.download.versionToDownload,
      openDownloadModal: modals.download.open,
      closeDownloadModal: modals.download.close,
      showResultModal: modals.result.showModal,
      setShowResultModal: modals.result.setShowModal,
    }),
    [modals],
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
    modalContextValue,
    versionsContextValue,
  };
}
