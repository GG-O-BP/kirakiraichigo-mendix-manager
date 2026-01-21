import { invoke } from "@tauri-apps/api/core";
import { ConfirmModal } from "../../common";
import DownloadModal from "../DownloadModal";
import { getVersionLoadingState } from "../../../utils";
import {
  useStudioProModalContext,
  useVersionsContext,
  useAppContext,
} from "../../../contexts";

function StudioProModals() {
  const {
    showUninstallModal,
    versionToUninstall,
    relatedApps,
    closeUninstallModal,
    showDownloadModal,
    versionToDownload,
    closeDownloadModal,
  } = useStudioProModalContext();

  const {
    versionLoadingStates,
    handleUninstallStudioPro,
    handleModalDownload,
  } = useVersionsContext();

  const { loadApps } = useAppContext();

  const handleConfirmUninstall = async (deleteApps = false) => {
    if (versionToUninstall) {
      await handleUninstallStudioPro(
        versionToUninstall,
        deleteApps,
        relatedApps,
        {
          onDeleteApp: async (appPath) => {
            await invoke("delete_mendix_app", { appPath });
          },
          onComplete: () => {
            if (deleteApps) {
              loadApps();
            }
            closeUninstallModal();
          },
        },
      );
    }
  };

  return (
    <>
      <ConfirmModal
        isOpen={showUninstallModal}
        title="🍓 Say Goodbye to Studio Pro?"
        message={
          versionToUninstall
            ? `Are you really really sure you want to uninstall Studio Pro ${versionToUninstall.version}? ✨\n\nOnce it's gone, there's no way to bring it back! Please think carefully, okay? 💝`
            : ""
        }
        onConfirm={() => handleConfirmUninstall(false)}
        onConfirmWithApps={
          relatedApps.length > 0
            ? () => handleConfirmUninstall(true)
            : null
        }
        onCancel={closeUninstallModal}
        isLoading={
          versionToUninstall
            ? getVersionLoadingState(
                versionLoadingStates,
                versionToUninstall.version,
              ).isUninstalling
            : false
        }
        relatedApps={relatedApps}
      />

      <DownloadModal
        isOpen={showDownloadModal}
        version={versionToDownload}
        onDownload={handleModalDownload}
        onClose={closeDownloadModal}
        onCancel={closeDownloadModal}
        isLoading={
          versionToDownload
            ? getVersionLoadingState(
                versionLoadingStates,
                versionToDownload.version,
              ).isDownloading
            : false
        }
      />
    </>
  );
}

export default StudioProModals;
