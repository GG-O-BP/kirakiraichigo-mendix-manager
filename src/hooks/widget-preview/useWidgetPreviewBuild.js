import * as R from "ramda";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import useSWRMutation from "swr/mutation";
import { invoke } from "@tauri-apps/api/core";
import {
  previewDataCacheAtom,
  buildErrorAtom,
  currentPreviewDataAtom,
  setPreviewDataAtom,
} from "../../atoms";

const buildAndRunPreview = async (_, { arg }) => {
  const { widgetPath, packageManager } = arg;
  return invoke("build_and_run_preview", { widgetPath, packageManager });
};

const runPreviewOnly = async (_, { arg }) => {
  const { widgetPath } = arg;
  return invoke("run_widget_preview_only", { widgetPath });
};

export function useWidgetPreviewBuild({ selectedWidgetForPreview, packageManager }) {
  const previewData = useAtomValue(currentPreviewDataAtom);
  const setPreviewData = useSetAtom(setPreviewDataAtom);
  const [buildError, setBuildError] = useAtom(buildErrorAtom);

  const { trigger: triggerBuild, isMutating: isBuildingPreview } = useSWRMutation(
    "widget-preview-build",
    buildAndRunPreview,
  );

  const { trigger: triggerRun, isMutating: isRunningPreview } = useSWRMutation(
    "widget-preview-run",
    runPreviewOnly,
  );

  const processResponse = (widgetId, response) => {
    R.ifElse(
      R.prop("success"),
      R.pipe(
        R.tap(() => setBuildError(null)),
        (res) => setPreviewData({
          widgetId,
          data: {
            bundle: R.prop("bundle_content", res),
            css: R.prop("css_content", res),
            widgetName: R.prop("widget_name", res),
            widgetId: R.prop("widget_id", res),
          },
        }),
      ),
      R.pipe(
        R.tap((res) => setBuildError(R.propOr("Build failed", "error", res))),
        R.tap(() => setPreviewData({ widgetId, data: null })),
      ),
    )(response);
  };

  const handleBuildAndRun = async (selectedWidget) => {
    if (R.isNil(selectedWidget)) return;

    const widgetId = R.prop("id", selectedWidget);
    setBuildError(null);

    try {
      const response = await triggerBuild({
        widgetPath: R.prop("path", selectedWidget),
        packageManager,
      });
      processResponse(widgetId, response);
    } catch (error) {
      console.error("[Widget Preview] Error:", error);
      setBuildError(String(error));
      setPreviewData({ widgetId, data: null });
    }
  };

  const handleRunOnly = async (selectedWidget) => {
    if (R.isNil(selectedWidget)) return;

    const widgetId = R.prop("id", selectedWidget);
    setBuildError(null);

    try {
      const response = await triggerRun({
        widgetPath: R.prop("path", selectedWidget),
      });
      processResponse(widgetId, response);
    } catch (error) {
      console.error("[Widget Preview] Run Only Error:", error);
      setBuildError(String(error));
      setPreviewData({ widgetId, data: null });
    }
  };

  return {
    previewData,
    handleBuildAndRun,
    handleRunOnly,
    isBuilding: isBuildingPreview || isRunningPreview,
    buildError,
  };
}
