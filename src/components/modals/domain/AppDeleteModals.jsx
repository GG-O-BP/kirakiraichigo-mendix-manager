import { ConfirmModal } from "../../common";

/**
 * AppDeleteModals - Domain component for app deletion modal
 * Handles the confirmation dialog for deleting Mendix apps
 */
function AppDeleteModals({
  appDeleteModal,
  handleDeleteApp,
  isUninstalling,
  setIsUninstalling,
}) {
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

  return (
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
  );
}

export default AppDeleteModals;
