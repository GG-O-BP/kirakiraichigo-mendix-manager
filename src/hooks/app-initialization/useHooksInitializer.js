import { useSetAtom } from "jotai";
import { useTheme } from "../useTheme";
import { useVersions } from "../useVersions";
import { useApps } from "../useApps";
import { useWidgets } from "../useWidgets";
import { useWidgetPreview } from "../useWidgetPreview";
import { useBuildDeploy } from "../useBuildDeploy";
import { usePackageManagerPersistence } from "../build-deploy/usePackageManagerPersistence";
import { showResultModalAtom } from "../../atoms";

export function useHooksInitializer() {
  const theme = useTheme();
  const versions = useVersions();
  const appsHook = useApps();
  const widgetsHook = useWidgets();
  const packageManagerPersistence = usePackageManagerPersistence();
  const widgetPreviewHook = useWidgetPreview({
    packageManagerPersistence,
    widgets: widgetsHook.widgets,
  });

  const setShowResultModal = useSetAtom(showResultModalAtom);

  const buildDeploy = useBuildDeploy({
    onShowResultModal: setShowResultModal,
    packageManagerPersistence,
  });

  return {
    theme,
    versions,
    appsHook,
    widgetsHook,
    widgetPreviewHook,
    buildDeploy,
  };
}
