import { invoke } from "@tauri-apps/api/core";
import { ConfirmModal } from "../../common";
import DownloadModal from "../DownloadModal";
import { getVersionLoadingState } from "../../../utils";

/**
 * StudioProModals - Domain component for Studio Pro version modals
 * Handles uninstall confirmation and download modals
 */
function StudioProModals({
  uninstallModal,
  downloadModal,
  versionLoadingStates,
  handleUninstallStudioPro,
  handleModalDownload,
  loadApps,
}) {
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

  return (
    <>
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

export default StudioProModals;
