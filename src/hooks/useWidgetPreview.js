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

  const { selectedWidgetForPreview } = selection;

  const selectedWidget = R.find(
    R.propEq(selectedWidgetForPreview, "id"),
    widgets,
  );
  const widgetPath = R.prop("path", selectedWidget);

  const state = useWidgetPreviewState(widgetPath);

  const build = useWidgetPreviewBuild({
    selectedWidgetForPreview,
    packageManager,
  });

  return R.mergeAll([
    state,
    selection,
    build,
    { packageManager, setPackageManager },
  ]);
}
