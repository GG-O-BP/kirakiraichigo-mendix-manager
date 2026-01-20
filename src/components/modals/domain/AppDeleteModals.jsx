import { ConfirmModal } from "../../common";
import {
  useAppModalContext,
  useAppContext,
  useBuildDeployContext,
} from "../../../contexts";

/**
 * AppDeleteModals - Domain component for app deletion modal
 * Handles the confirmation dialog for deleting Mendix apps
 * Consumes domain-specific AppModalContext
 */
function AppDeleteModals() {
  const {
    showAppDeleteModal,
    appToDelete,
    closeAppDeleteModal,
  } = useAppModalContext();

  const { handleDeleteApp } = useAppContext();
  const { isUninstalling, setIsUninstalling } = useBuildDeployContext();

  const handleConfirmAppDelete = async () => {
    if (appToDelete) {
      setIsUninstalling(true);
      try {
        await handleDeleteApp(appToDelete.path);
        setIsUninstalling(false);
        closeAppDeleteModal();
      } catch (error) {
        alert(`Failed to delete app: ${error}`);
        setIsUninstalling(false);
        closeAppDeleteModal();
      }
    }
  };

  return (
    <ConfirmModal
      isOpen={showAppDeleteModal}
      title="🍓 Delete This App?"
      message={
        appToDelete
          ? `Do you really want to delete ${appToDelete.name}? 🥺\n\nI can't undo this once it's done! Are you absolutely sure? 💕`
          : ""
      }
      onConfirm={handleConfirmAppDelete}
      onCancel={closeAppDeleteModal}
      isLoading={isUninstalling}
      relatedApps={[]}
    />
  );
}

export default AppDeleteModals;
