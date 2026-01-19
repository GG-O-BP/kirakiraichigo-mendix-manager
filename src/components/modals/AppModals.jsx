import { invoke } from "@tauri-apps/api/core";
import { ConfirmModal } from "../common";
import WidgetModal from "./WidgetModal";
import BuildResultModal from "./BuildResultModal";
import DownloadModal from "./DownloadModal";
import { getVersionLoadingState } from "../../utils";

/**
 * AppModals component - renders all modal dialogs for the app
 * Receives individual modal hooks for better separation of concerns
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
  // Composed handler: Uninstall Studio Pro with optional app deletion
  const handleConfirmUninstall = async (deleteApps = false) => {
    if (uninstallModal.versionToUninstall) {
      await handleUninstallStudioPro(
        uninstallModal.versionToUninstall,
        deleteApps,
        uninstallModal.relatedApps,
        {
          onDeleteApp: async (appPath) => {
            await invoke("delete_mendix_app", { appPath });
          },
          onComplete: () => {
            if (deleteApps) {
              loadApps();
            }
            uninstallModal.close();
          },
        },
      );
    }
  };

  // Composed handler: Confirm widget delete
  const handleConfirmWidgetDelete = async () => {
    const success = await handleWidgetDelete(widgetDeleteModal.widgetToDelete);
    if (success) {
      widgetDeleteModal.close();
    }
  };

  // Composed handler: Confirm app delete
  const handleConfirmAppDelete = async () => {
    if (appDeleteModal.appToDelete) {
      setIsUninstalling(true);
      try {
        await handleDeleteApp(appDeleteModal.appToDelete.path);
        setIsUninstalling(false);
        appDeleteModal.close();
      } catch (error) {
        alert(`Failed to delete app: ${error}`);
        setIsUninstalling(false);
        appDeleteModal.close();
      }
    }
  };

  // Composed handler: Add widget
  const handleConfirmAddWidget = () => {
    handleAddWidget(() => {
      widgetModal.setShowAddForm(false);
      widgetModal.setShowModal(false);
    });
  };

  return (
    <>
      <WidgetModal
        showWidgetModal={widgetModal.showModal}
        showAddWidgetForm={widgetModal.showAddForm}
        setShowWidgetModal={widgetModal.setShowModal}
        setShowAddWidgetForm={widgetModal.setShowAddForm}
        newWidgetCaption={newWidgetCaption}
        setNewWidgetCaption={setNewWidgetCaption}
        newWidgetPath={newWidgetPath}
        setNewWidgetPath={setNewWidgetPath}
        setWidgets={setWidgets}
      />

      <ConfirmModal
        isOpen={uninstallModal.showModal}
        title="🍓 Say Goodbye to Studio Pro?"
        message={
          uninstallModal.versionToUninstall
            ? `Are you really really sure you want to uninstall Studio Pro ${uninstallModal.versionToUninstall.version}? ✨\n\nOnce it's gone, there's no way to bring it back! Please think carefully, okay? 💝`
            : ""
        }
        onConfirm={() => handleConfirmUninstall(false)}
        onConfirmWithApps={
          uninstallModal.relatedApps.length > 0
            ? () => handleConfirmUninstall(true)
            : null
        }
        onCancel={uninstallModal.close}
        isLoading={
          uninstallModal.versionToUninstall
            ? getVersionLoadingState(
                versionLoadingStates,
                uninstallModal.versionToUninstall.version,
              ).isUninstalling
            : false
        }
        relatedApps={uninstallModal.relatedApps}
      />

      <ConfirmModal
        isOpen={appDeleteModal.showModal}
        title="🍓 Delete This App?"
        message={
          appDeleteModal.appToDelete
            ? `Do you really want to delete ${appDeleteModal.appToDelete.name}? 🥺\n\nI can't undo this once it's done! Are you absolutely sure? 💕`
            : ""
        }
        onConfirm={handleConfirmAppDelete}
        onCancel={appDeleteModal.close}
        isLoading={isUninstalling}
        relatedApps={[]}
      />

      <ConfirmModal
        isOpen={widgetDeleteModal.showModal}
        title="🍓 Remove Widget from List?"
        message={
          widgetDeleteModal.widgetToDelete
            ? `Should I remove "${widgetDeleteModal.widgetToDelete.caption}" from your widget list? 🎀\n\nDon't worry! This only removes it from my list - your files will stay safe and sound! 🌟`
            : ""
        }
        onConfirm={handleConfirmWidgetDelete}
        onCancel={widgetDeleteModal.close}
        isLoading={false}
        relatedApps={[]}
      />

      <BuildResultModal
        showResultModal={resultModal.showModal}
        buildResults={buildResults}
        setShowResultModal={resultModal.setShowModal}
        setBuildResults={setBuildResults}
      />

      <DownloadModal
        isOpen={downloadModal.showModal}
        version={downloadModal.versionToDownload}
        onDownload={handleModalDownload}
        onClose={downloadModal.close}
        onCancel={downloadModal.close}
        isLoading={
          downloadModal.versionToDownload
            ? getVersionLoadingState(
                versionLoadingStates,
                downloadModal.versionToDownload.version,
              ).isDownloading
            : false
        }
      />
    </>
  );
}

export default AppModals;
