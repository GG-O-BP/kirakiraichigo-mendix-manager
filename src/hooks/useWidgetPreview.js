import * as R from "ramda";
import { useAtomValue } from "jotai";
import {
  useWidgetPreviewState,
  useWidgetPreviewSelection,
  useWidgetPreviewBuild,
} from "./widget-preview";
import { usePackageManagerPersistence } from "./build-deploy/usePackageManagerPersistence";
import { itemsAtomFamily } from "../atoms/collection";

export function useWidgetPreview() {
  const selection = useWidgetPreviewSelection();
  const { packageManager, setPackageManager } = usePackageManagerPersistence();
  const widgets = useAtomValue(itemsAtomFamily("widgets"));

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
