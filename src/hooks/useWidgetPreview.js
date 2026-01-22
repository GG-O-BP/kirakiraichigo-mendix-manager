import * as R from "ramda";
import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { setProperty } from "../utils";

export function useWidgetPreview() {
  const [widgetPreviewSearch, setWidgetPreviewSearch] = useState("");
  const [selectedWidgetForPreview, setSelectedWidgetForPreview] = useState(null);
  const [properties, setProperties] = useState({});
  const [dynamicProperties, setDynamicProperties] = useState({});
  const [lastLoadedWidgetId, setLastLoadedWidgetId] = useState(null);
  const [widgetDefinition, setWidgetDefinition] = useState(null);
  const [editorConfigHandler, setEditorConfigHandler] = useState(null);

  const [previewData, setPreviewData] = useState(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildError, setBuildError] = useState(null);
  const [packageManager, setPackageManager] = useState("bun");
  const [distExists, setDistExists] = useState(false);

  const updateProperty = useCallback(
    R.curry((key, value) => setProperties(setProperty(key, value))),
    [],
  );

  const checkDistExists = useCallback(async (widgetPath) => {
    if (R.isNil(widgetPath)) {
      setDistExists(false);
      return;
    }
    const exists = await invoke("check_dist_exists", { widgetPath });
    setDistExists(exists);
  }, []);

  const handleBuildAndRun = useCallback(async (selectedWidget) => {
    if (R.isNil(selectedWidget)) return;

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
          (res) => setPreviewData({
            bundle: R.prop("bundle_content", res),
            css: R.prop("css_content", res),
            widgetName: R.prop("widget_name", res),
            widgetId: R.prop("widget_id", res),
          }),
        ),
        R.pipe(
          R.tap((res) => setBuildError(R.propOr("Build failed", "error", res))),
          R.tap(() => setPreviewData(null)),
        ),
      )(response);
    } catch (error) {
      console.error("[Widget Preview] Error:", error);
      setBuildError(String(error));
      setPreviewData(null);
    } finally {
      setIsBuilding(false);
    }
  }, [packageManager]);

  const handleRunOnly = useCallback(async (selectedWidget) => {
    if (R.isNil(selectedWidget)) return;

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
          (res) => setPreviewData({
            bundle: R.prop("bundle_content", res),
            css: R.prop("css_content", res),
            widgetName: R.prop("widget_name", res),
            widgetId: R.prop("widget_id", res),
          }),
        ),
        R.pipe(
          R.tap((res) => setBuildError(R.propOr("No build output found", "error", res))),
          R.tap(() => setPreviewData(null)),
        ),
      )(response);
    } catch (error) {
      console.error("[Widget Preview] Run Only Error:", error);
      setBuildError(String(error));
      setPreviewData(null);
    } finally {
      setIsBuilding(false);
    }
  }, []);

  return {
    widgetPreviewSearch,
    setWidgetPreviewSearch,
    selectedWidgetForPreview,
    setSelectedWidgetForPreview,
    properties,
    updateProperty,
    dynamicProperties,
    setDynamicProperties,
    lastLoadedWidgetId,
    setLastLoadedWidgetId,
    widgetDefinition,
    setWidgetDefinition,
    editorConfigHandler,
    setEditorConfigHandler,
    previewData,
    isBuilding,
    buildError,
    packageManager,
    setPackageManager,
    distExists,
    checkDistExists,
    handleBuildAndRun,
    handleRunOnly,
  };
}
