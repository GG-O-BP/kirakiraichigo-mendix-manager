import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export const usePreviewBuild = () => {
  const [previewData, setPreviewData] = useState(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildError, setBuildError] = useState(null);
  const [packageManager, setPackageManager] = useState("bun");

  const handleRunPreview = useCallback(async (selectedWidget) => {
    if (!selectedWidget) return;

    setIsBuilding(true);
    setBuildError(null);

    try {
      const response = await invoke("build_widget_for_preview", {
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

  return {
    previewData,
    isBuilding,
    buildError,
    packageManager,
    setPackageManager,
    handleRunPreview,
  };
};
