import { invoke } from "@tauri-apps/api/core";
import { ConfirmModal } from "../common";
import WidgetModal from "./WidgetModal";
import BuildResultModal from "./BuildResultModal";
import DownloadModal from "./DownloadModal";
import { getVersionLoadingState } from "../../utils/functional";

/**
 * AppModals component - renders all modal dialogs for the app
 * Now receives explicit props instead of hook objects for better separation of concerns
 */
function AppModals({
  // Modal states
  modals,
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
    if (modals.versionToUninstall) {
      await handleUninstallStudioPro(
        modals.versionToUninstall,
        deleteApps,
        modals.relatedApps,
        {
          onDeleteApp: async (appPath) => {
            await invoke("delete_mendix_app", { appPath });
          },
          onComplete: () => {
            if (deleteApps) {
              loadApps();
            }
            modals.closeUninstallModal();
          },
        },
      );
    }
  };

  // Composed handler: Confirm widget delete
  const handleConfirmWidgetDelete = async () => {
    const success = await handleWidgetDelete(modals.widgetToDelete);
    if (success) {
      modals.closeWidgetDeleteModal();
    }
  };

  // Composed handler: Confirm app delete
  const handleConfirmAppDelete = async () => {
    if (modals.appToDelete) {
      setIsUninstalling(true);
      try {
        await handleDeleteApp(modals.appToDelete.path);
        setIsUninstalling(false);
        modals.closeAppDeleteModal();
      } catch (error) {
        alert(`Failed to delete app: ${error}`);
        setIsUninstalling(false);
        modals.closeAppDeleteModal();
      }
    }
  };

  // Composed handler: Add widget
  const handleConfirmAddWidget = () => {
    handleAddWidget(() => {
      modals.setShowAddWidgetForm(false);
      modals.setShowWidgetModal(false);
    });
  };
  return (
    <>
      <WidgetModal
        showWidgetModal={modals.showWidgetModal}
        showAddWidgetForm={modals.showAddWidgetForm}
        setShowWidgetModal={modals.setShowWidgetModal}
        setShowAddWidgetForm={modals.setShowAddWidgetForm}
        newWidgetCaption={newWidgetCaption}
        setNewWidgetCaption={setNewWidgetCaption}
        newWidgetPath={newWidgetPath}
        setNewWidgetPath={setNewWidgetPath}
        setWidgets={setWidgets}
      />

      <ConfirmModal
        isOpen={modals.showUninstallModal}
        title="🍓 Say Goodbye to Studio Pro?"
        message={
          modals.versionToUninstall
            ? `Are you really really sure you want to uninstall Studio Pro ${modals.versionToUninstall.version}? ✨\n\nOnce it's gone, there's no way to bring it back! Please think carefully, okay? 💝`
            : ""
        }
        onConfirm={() => handleConfirmUninstall(false)}
        onConfirmWithApps={
          modals.relatedApps.length > 0
            ? () => handleConfirmUninstall(true)
            : null
        }
        onCancel={modals.closeUninstallModal}
        isLoading={
          modals.versionToUninstall
            ? getVersionLoadingState(
                versionLoadingStates,
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
        isLoading={isUninstalling}
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
        buildResults={buildResults}
        setShowResultModal={modals.setShowResultModal}
        setBuildResults={setBuildResults}
      />

      <DownloadModal
        isOpen={modals.showDownloadModal}
        version={modals.versionToDownload}
        onDownload={handleModalDownload}
        onClose={modals.closeDownloadModal}
        onCancel={modals.closeDownloadModal}
        isLoading={
          modals.versionToDownload
            ? getVersionLoadingState(
                versionLoadingStates,
                modals.versionToDownload.version,
              ).isDownloading
            : false
        }
      />
    </>
  );
}

export default AppModals;
