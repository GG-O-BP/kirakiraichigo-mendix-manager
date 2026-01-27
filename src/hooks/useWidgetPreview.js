import * as R from "ramda";
import {
  useWidgetPreviewState,
  useWidgetPreviewSelection,
  useWidgetPreviewBuild,
} from "./widget-preview";

export function useWidgetPreview({ packageManagerPersistence, widgets = [] }) {
  const selection = useWidgetPreviewSelection();
  const { packageManager, setPackageManager } = packageManagerPersistence;

  const selectedWidget = R.find(
    R.propEq(selection.selectedWidgetForPreview, "id"),
    widgets,
  );
  const widgetPath = R.prop("path", selectedWidget);

  const state = useWidgetPreviewState(widgetPath);

  const build = useWidgetPreviewBuild({
    selectedWidgetForPreview: selection.selectedWidgetForPreview,
    packageManager,
  });

  return {
    ...state,
    ...selection,
    ...build,
    packageManager,
    setPackageManager,
  };
}
