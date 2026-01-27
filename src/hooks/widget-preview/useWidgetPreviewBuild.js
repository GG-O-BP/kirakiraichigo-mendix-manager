import * as R from "ramda";
import { useState } from "react";
import useSWRMutation from "swr/mutation";
import { invoke } from "@tauri-apps/api/core";

const buildAndRunPreview = async (_, { arg }) => {
  const { widgetPath, packageManager } = arg;
  return invoke("build_and_run_preview", { widgetPath, packageManager });
};

const runPreviewOnly = async (_, { arg }) => {
  const { widgetPath } = arg;
  return invoke("run_widget_preview_only", { widgetPath });
};

export function useWidgetPreviewBuild({ selectedWidgetForPreview, packageManager }) {
  const [previewDataByWidgetId, setPreviewDataByWidgetId] = useState({});
  const [buildError, setBuildError] = useState(null);

  const previewData = R.ifElse(
    R.isNil,
    R.always(null),
    (widgetId) => R.propOr(null, String(widgetId), previewDataByWidgetId),
  )(selectedWidgetForPreview);

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
        (res) => setPreviewDataByWidgetId((cache) =>
          R.assoc(String(widgetId), {
            bundle: R.prop("bundle_content", res),
            css: R.prop("css_content", res),
            widgetName: R.prop("widget_name", res),
            widgetId: R.prop("widget_id", res),
          }, cache),
        ),
      ),
      R.pipe(
        R.tap((res) => setBuildError(R.propOr("Build failed", "error", res))),
        R.tap(() => setPreviewDataByWidgetId((cache) =>
          R.assoc(String(widgetId), null, cache),
        )),
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
      setPreviewDataByWidgetId((cache) =>
        R.assoc(String(widgetId), null, cache),
      );
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
      setPreviewDataByWidgetId((cache) =>
        R.assoc(String(widgetId), null, cache),
      );
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
