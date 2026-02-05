import * as R from "ramda";
import { useAtomValue, useSetAtom } from "jotai";
import { ConfirmModal } from "../../common";
import { useI18n } from "../../../i18n/useI18n";
import { useApps, useBuildDeploy } from "../../../hooks";
import {
  showAppDeleteModalAtom,
  appToDeleteAtom,
  closeAppDeleteModalAtom,
} from "../../../atoms";

function AppDeleteModals() {
  const { t } = useI18n();

  const showAppDeleteModal = useAtomValue(showAppDeleteModalAtom);
  const appToDelete = useAtomValue(appToDeleteAtom);
  const closeAppDeleteModal = useSetAtom(closeAppDeleteModalAtom);

  const { handleDeleteApp } = useApps();
  const { isUninstalling, setIsUninstalling } = useBuildDeploy();

  const handleConfirmAppDelete = async () => {
    if (appToDelete) {
      setIsUninstalling(true);
      try {
        await handleDeleteApp(appToDelete.path);
        setIsUninstalling(false);
        closeAppDeleteModal();
      } catch (error) {
        alert(
          R.pathOr(
            `Failed to delete app: ${error}`,
            ["modals", "appDelete", "deleteFailed"],
            t,
          ).replace("{error}", error),
        );
        setIsUninstalling(false);
        closeAppDeleteModal();
      }
    }
  };

  const deleteTitle = R.pathOr(
    "Delete This App?",
    ["modals", "appDelete", "title"],
    t,
  );

  const deleteMessage = appToDelete
    ? R.pathOr(
        `Do you really want to delete ${appToDelete.name}?\n\nI can't undo this once it's done! Are you absolutely sure?`,
        ["modals", "appDelete", "message"],
        t,
      ).replace("{name}", appToDelete.name)
    : "";

  return (
    <ConfirmModal
      isOpen={showAppDeleteModal}
      title={deleteTitle}
      message={deleteMessage}
      onConfirm={handleConfirmAppDelete}
      onCancel={closeAppDeleteModal}
      isLoading={isUninstalling}
      relatedApps={[]}
    />
  );
}

export default AppDeleteModals;
