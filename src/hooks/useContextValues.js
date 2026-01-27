import { useMemo } from "react";

export function useContextValues({
  appsHook,
  widgetsHook,
  widgetPreviewHook,
  buildDeploy,
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
      isAppSelected: appsHook.isAppSelected,
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
      toggleWidgetSelection: widgetsHook.toggleWidgetSelection,
      isWidgetSelected: widgetsHook.isWidgetSelected,
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
      dynamicProperties: widgetPreviewHook.dynamicProperties,
      setDynamicProperties: widgetPreviewHook.setDynamicProperties,
      lastLoadedWidgetId: widgetPreviewHook.lastLoadedWidgetId,
      setLastLoadedWidgetId: widgetPreviewHook.setLastLoadedWidgetId,
      widgetDefinition: widgetPreviewHook.widgetDefinition,
      setWidgetDefinition: widgetPreviewHook.setWidgetDefinition,
      editorConfigContent: widgetPreviewHook.editorConfigContent,
      setEditorConfigContent: widgetPreviewHook.setEditorConfigContent,
      previewData: widgetPreviewHook.previewData,
      isBuilding: widgetPreviewHook.isBuilding,
      buildError: widgetPreviewHook.buildError,
      packageManager: widgetPreviewHook.packageManager,
      setPackageManager: widgetPreviewHook.setPackageManager,
      distExists: widgetPreviewHook.distExists,
      checkDistExists: widgetPreviewHook.checkDistExists,
      handleBuildAndRun: widgetPreviewHook.handleBuildAndRun,
      handleRunOnly: widgetPreviewHook.handleRunOnly,
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
      isDeploying: buildDeploy.isDeploying,
      handleInstall: buildDeploy.handleInstall,
      handleBuildDeploy: buildDeploy.handleBuildDeploy,
      handleDeployOnly: buildDeploy.handleDeployOnly,
      buildResults: buildDeploy.buildResults,
      setBuildResults: buildDeploy.setBuildResults,
      inlineResults: buildDeploy.inlineResults,
      setInlineResults: buildDeploy.setInlineResults,
      isUninstalling: buildDeploy.isUninstalling,
      setIsUninstalling: buildDeploy.setIsUninstalling,
      lastOperationType: buildDeploy.lastOperationType,
    }),
    [buildDeploy],
  );

  const versionsContextValue = useMemo(
    () => ({
      searchTerm: versions.searchTerm,
      setSearchTerm: versions.setSearchTerm,
      appSearchTerm: versions.appSearchTerm,
      setAppSearchTerm: versions.setAppSearchTerm,
      versions: versions.versions,
      filteredVersions: versions.filteredVersions,
      selectedVersion: versions.selectedVersion,
      handleVersionClick: versions.handleVersionClick,
      getLoadingStateSync: versions.getLoadingStateSync,
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
    versionsContextValue,
  };
}
