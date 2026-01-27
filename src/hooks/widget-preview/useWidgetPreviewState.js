import * as R from "ramda";
import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useWidgetPreviewState() {
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildError, setBuildError] = useState(null);
  const [distExists, setDistExists] = useState(false);

  const checkDistExists = useCallback(async (widgetPath) => {
    if (R.isNil(widgetPath)) {
      setDistExists(false);
      return;
    }
    const exists = await invoke("check_dist_exists", { widgetPath });
    setDistExists(exists);
  }, []);

  return {
    isBuilding,
    setIsBuilding,
    buildError,
    setBuildError,
    distExists,
    checkDistExists,
  };
}
