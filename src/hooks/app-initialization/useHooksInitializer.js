import { useTheme } from "../useTheme";
import { useVersions } from "../useVersions";
import { useApps } from "../useApps";
import { useWidgets } from "../useWidgets";
import { useWidgetPreview } from "../useWidgetPreview";
import { useBuildDeploy } from "../useBuildDeploy";
import { useUninstallModal } from "../useUninstallModal";
import { useAppDeleteModal } from "../useAppDeleteModal";
import { useWidgetModal } from "../useWidgetModal";
import { useWidgetDeleteModal } from "../useWidgetDeleteModal";
import { useDownloadModal } from "../useDownloadModal";
import { useResultModal } from "../useResultModal";

export function useHooksInitializer() {
  const theme = useTheme();
  const versions = useVersions();
  const appsHook = useApps();
  const widgetsHook = useWidgets();
  const widgetPreviewHook = useWidgetPreview();

  const uninstallModal = useUninstallModal();
  const appDeleteModal = useAppDeleteModal();
  const widgetModal = useWidgetModal();
  const widgetDeleteModal = useWidgetDeleteModal();
  const downloadModal = useDownloadModal();
  const resultModal = useResultModal();

  const buildDeploy = useBuildDeploy({
    onShowResultModal: resultModal.setShowModal,
  });

  return {
    theme,
    versions,
    appsHook,
    widgetsHook,
    widgetPreviewHook,
    buildDeploy,
    modals: {
      uninstall: uninstallModal,
      appDelete: appDeleteModal,
      widget: widgetModal,
      widgetDelete: widgetDeleteModal,
      download: downloadModal,
      result: resultModal,
    },
  };
}
