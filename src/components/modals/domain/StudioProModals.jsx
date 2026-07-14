import * as R from "ramda";
import { useAtomValue, useSetAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { ConfirmModal } from "../../common";
import DownloadModal from "../DownloadModal";
import { useI18n } from "../../../i18n/useI18n";
import { useVersions, useApps } from "../../../hooks";
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
  } = useVersions();

  const { loadApps } = useApps();

  const handleConfirmUninstall = (deleteApps = false) =>
    R.when(
      R.isNotNil,
      (version) =>
        handleUninstallStudioPro(version, deleteApps, relatedApps, {
          onDeleteApp: async (appPath) => {
            await invoke("delete_mendix_app", { appPath });
          },
          onComplete: () => {
            R.when(R.identity, () => loadApps())(deleteApps);
            closeUninstallModal();
          },
        }),
    )(versionToUninstall);

  const uninstallTitle = R.pathOr(
    "Say Goodbye to Studio Pro?",
    ["modals", "studioPro", "uninstallTitle"],
    t,
  );

  const uninstallMessage = R.ifElse(
    R.isNil,
    R.always(""),
    (version) =>
      R.replace(
        "{version}",
        R.prop("version", version),
        R.pathOr(
          `Are you really really sure you want to uninstall Studio Pro ${R.prop("version", version)}?\n\nOnce it's gone, there's no way to bring it back! Please think carefully, okay?`,
          ["modals", "studioPro", "uninstallMessage"],
          t,
        ),
      ),
  )(versionToUninstall);

  return (
    <>
      <ConfirmModal
        isOpen={showUninstallModal}
        title={uninstallTitle}
        message={uninstallMessage}
        onConfirm={() => handleConfirmUninstall(false)}
        onConfirmWithApps={R.ifElse(
          R.isNotEmpty,
          R.always(() => handleConfirmUninstall(true)),
          R.always(null),
        )(relatedApps)}
        onCancel={closeUninstallModal}
        isLoading={R.ifElse(
          R.isNil,
          R.always(false),
          (version) => R.prop("isUninstalling", getLoadingStateSync(R.prop("version", version))),
        )(versionToUninstall)}
        relatedApps={relatedApps}
      />

      <DownloadModal
        isOpen={showDownloadModal}
        version={versionToDownload}
        onDownload={handleModalDownload}
        onClose={closeDownloadModal}
        onCancel={closeDownloadModal}
        isLoading={R.ifElse(
          R.isNil,
          R.always(false),
          (version) => R.prop("isDownloading", getLoadingStateSync(R.prop("version", version))),
        )(versionToDownload)}
      />
    </>
  );
}

export default StudioProModals;
