import StudioProModals from "./domain/StudioProModals";
import AppDeleteModals from "./domain/AppDeleteModals";
import WidgetModals from "./domain/WidgetModals";
import BuildResultModals from "./domain/BuildResultModals";

/**
 * AppModals component - composition component that renders all modal dialogs
 * Delegates to domain-specific modal components for better separation of concerns
 */
function AppModals({
  // Individual modal hooks
  uninstallModal,
  appDeleteModal,
  widgetModal,
  widgetDeleteModal,
  downloadModal,
  resultModal,
  // Version loading states
  versionLoadingStates,
  // Version handlers
  handleUninstallStudioPro,
  handleModalDownload,
  // App handlers
  handleDeleteApp,
  loadApps,
  // Widget handlers
  handleWidgetDelete,
  newWidgetCaption,
  setNewWidgetCaption,
  newWidgetPath,
  setNewWidgetPath,
  setWidgets,
  handleAddWidget,
  // Build/Deploy state
  isUninstalling,
  setIsUninstalling,
  buildResults,
  setBuildResults,
}) {
  return (
    <>
      <StudioProModals
        uninstallModal={uninstallModal}
        downloadModal={downloadModal}
        versionLoadingStates={versionLoadingStates}
        handleUninstallStudioPro={handleUninstallStudioPro}
        handleModalDownload={handleModalDownload}
        loadApps={loadApps}
      />

      <AppDeleteModals
        appDeleteModal={appDeleteModal}
        handleDeleteApp={handleDeleteApp}
        isUninstalling={isUninstalling}
        setIsUninstalling={setIsUninstalling}
      />

      <WidgetModals
        widgetModal={widgetModal}
        widgetDeleteModal={widgetDeleteModal}
        newWidgetCaption={newWidgetCaption}
        setNewWidgetCaption={setNewWidgetCaption}
        newWidgetPath={newWidgetPath}
        setNewWidgetPath={setNewWidgetPath}
        setWidgets={setWidgets}
        handleAddWidget={handleAddWidget}
        handleWidgetDelete={handleWidgetDelete}
      />

      <BuildResultModals
        resultModal={resultModal}
        buildResults={buildResults}
        setBuildResults={setBuildResults}
      />
    </>
  );
}

export default AppModals;
