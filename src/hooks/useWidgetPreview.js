import {
  useWidgetPreviewState,
  useWidgetPreviewSelection,
  useWidgetPreviewBuild,
} from "./widget-preview";

export function useWidgetPreview({ packageManagerPersistence }) {
  const state = useWidgetPreviewState();
  const selection = useWidgetPreviewSelection();
  const { packageManager, setPackageManager } = packageManagerPersistence;

  const build = useWidgetPreviewBuild({
    selectedWidgetForPreview: selection.selectedWidgetForPreview,
    packageManager,
    setIsBuilding: state.setIsBuilding,
    setBuildError: state.setBuildError,
  });

  return {
    ...state,
    ...selection,
    ...build,
    packageManager,
    setPackageManager,
  };
}
