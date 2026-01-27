import * as R from "ramda";
import { useAtomValue, useSetAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { ConfirmModal } from "../../common";
import DownloadModal from "../DownloadModal";
import { useI18n } from "../../../i18n/useI18n";
import {
  useVersionsContext,
  useAppContext,
} from "../../../contexts";
import {
  showUninstallModalAtom,
  versionToUninstallAtom,
  relatedAppsAtom,
  closeUninstallModalAtom,
  showDownloadModalAtom,
  versionToDownloadAtom,
  closeDownloadModalAtom,
} from "../../../atoms";

function StudioProModals() {
  const { t } = useI18n();

  const showUninstallModal = useAtomValue(showUninstallModalAtom);
  const versionToUninstall = useAtomValue(versionToUninstallAtom);
  const relatedApps = useAtomValue(relatedAppsAtom);
  const closeUninstallModal = useSetAtom(closeUninstallModalAtom);
  const showDownloadModal = useAtomValue(showDownloadModalAtom);
  const versionToDownload = useAtomValue(versionToDownloadAtom);
  const closeDownloadModal = useSetAtom(closeDownloadModalAtom);

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
