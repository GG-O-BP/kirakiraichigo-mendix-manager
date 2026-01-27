import * as R from "ramda";
import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useWidgetPreviewBuild({
  selectedWidgetForPreview,
  packageManager,
  setIsBuilding,
  setBuildError,
}) {
  const [previewDataByWidgetId, setPreviewDataByWidgetId] = useState({});

  const previewData = R.ifElse(
    R.isNil,
    R.always(null),
    (widgetId) => R.propOr(null, String(widgetId), previewDataByWidgetId),
  )(selectedWidgetForPreview);

  const handleBuildAndRun = useCallback(async (selectedWidget) => {
    if (R.isNil(selectedWidget)) return;

    const widgetId = R.prop("id", selectedWidget);
    setIsBuilding(true);
    setBuildError(null);

    try {
      const response = await invoke("build_and_run_preview", {
        widgetPath: R.prop("path", selectedWidget),
        packageManager: packageManager,
      });

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
    } catch (error) {
      console.error("[Widget Preview] Error:", error);
      setBuildError(String(error));
      setPreviewDataByWidgetId((cache) =>
        R.assoc(String(widgetId), null, cache),
      );
    } finally {
      setIsBuilding(false);
    }
  }, [packageManager, setIsBuilding, setBuildError]);

  const handleRunOnly = useCallback(async (selectedWidget) => {
    if (R.isNil(selectedWidget)) return;

    const widgetId = R.prop("id", selectedWidget);
    setIsBuilding(true);
    setBuildError(null);

    try {
      const response = await invoke("run_widget_preview_only", {
        widgetPath: R.prop("path", selectedWidget),
      });

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
          R.tap((res) => setBuildError(R.propOr("No build output found", "error", res))),
          R.tap(() => setPreviewDataByWidgetId((cache) =>
            R.assoc(String(widgetId), null, cache),
          )),
        ),
      )(response);
    } catch (error) {
      console.error("[Widget Preview] Run Only Error:", error);
      setBuildError(String(error));
      setPreviewDataByWidgetId((cache) =>
        R.assoc(String(widgetId), null, cache),
      );
    } finally {
      setIsBuilding(false);
    }
  }, [setIsBuilding, setBuildError]);

  return {
    previewData,
    handleBuildAndRun,
    handleRunOnly,
  };
}
