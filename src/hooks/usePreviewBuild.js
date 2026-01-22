import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export const usePreviewBuild = () => {
  const [previewData, setPreviewData] = useState(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildError, setBuildError] = useState(null);
  const [packageManager, setPackageManager] = useState("bun");
  const [distExists, setDistExists] = useState(false);

  const checkDistExists = useCallback(async (widgetPath) => {
    if (!widgetPath) {
      setDistExists(false);
      return;
    }
    const exists = await invoke("check_dist_exists", { widgetPath });
    setDistExists(exists);
  }, []);

  const handleBuildAndRun = useCallback(async (selectedWidget) => {
    if (!selectedWidget) return;

    setIsBuilding(true);
    setBuildError(null);

    try {
      const response = await invoke("build_and_run_preview", {
        widgetPath: selectedWidget.path,
        packageManager: packageManager,
      });

      if (response.success) {
        setPreviewData({
          bundle: response.bundle_content,
          css: response.css_content,
          widgetName: response.widget_name,
          widgetId: response.widget_id,
        });
        setBuildError(null);
      } else {
        setBuildError(response.error || "Build failed");
        setPreviewData(null);
      }
    } catch (error) {
      console.error("[Widget Preview] Error:", error);
      setBuildError(String(error));
      setPreviewData(null);
    } finally {
      setIsBuilding(false);
    }
  }, [packageManager]);

  const handleRunOnly = useCallback(async (selectedWidget) => {
    if (!selectedWidget) return;

    setIsBuilding(true);
    setBuildError(null);

    try {
      const response = await invoke("run_widget_preview_only", {
        widgetPath: selectedWidget.path,
      });

      if (response.success) {
        setPreviewData({
          bundle: response.bundle_content,
          css: response.css_content,
          widgetName: response.widget_name,
          widgetId: response.widget_id,
        });
        setBuildError(null);
      } else {
        setBuildError(response.error || "No build output found");
        setPreviewData(null);
      }
    } catch (error) {
      console.error("[Widget Preview] Run Only Error:", error);
      setBuildError(String(error));
      setPreviewData(null);
    } finally {
      setIsBuilding(false);
    }
  }, []);

  return {
    previewData,
    isBuilding,
    buildError,
    packageManager,
    setPackageManager,
    handleBuildAndRun,
    handleRunOnly,
    distExists,
    checkDistExists,
  };
};
