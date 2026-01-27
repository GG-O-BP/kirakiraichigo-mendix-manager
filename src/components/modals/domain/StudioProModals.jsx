import * as R from "ramda";
import { invoke } from "@tauri-apps/api/core";
import { ConfirmModal } from "../../common";
import DownloadModal from "../DownloadModal";
import { useI18n } from "../../../i18n/useI18n";
import {
  useStudioProModalContext,
  useVersionsContext,
  useAppContext,
} from "../../../contexts";

function StudioProModals() {
  const { t } = useI18n();
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
    getLoadingStateSync,
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

  const uninstallTitle = R.pathOr(
    "Say Goodbye to Studio Pro?",
    ["modals", "studioPro", "uninstallTitle"],
    t,
  );

  const uninstallMessage = versionToUninstall
    ? R.pathOr(
        `Are you really really sure you want to uninstall Studio Pro ${versionToUninstall.version}?\n\nOnce it's gone, there's no way to bring it back! Please think carefully, okay?`,
        ["modals", "studioPro", "uninstallMessage"],
        t,
      ).replace("{version}", versionToUninstall.version)
    : "";

  return (
    <>
      <ConfirmModal
        isOpen={showUninstallModal}
        title={uninstallTitle}
        message={uninstallMessage}
        onConfirm={() => handleConfirmUninstall(false)}
        onConfirmWithApps={
          relatedApps.length > 0
            ? () => handleConfirmUninstall(true)
            : null
        }
        onCancel={closeUninstallModal}
        isLoading={
          versionToUninstall
            ? getLoadingStateSync(versionToUninstall.version).isUninstalling
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
            ? getLoadingStateSync(versionToDownload.version).isDownloading
            : false
        }
      />
    </>
  );
}

export default StudioProModals;
