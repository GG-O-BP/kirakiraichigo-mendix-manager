import * as R from "ramda";
import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useDistExistsCheck({ selectedWidgets, widgets }) {
  const [allDistExist, setAllDistExist] = useState(false);

  const checkDistExists = useCallback(async () => {
    const selectedWidgetIds = Array.from(selectedWidgets);

    if (R.isEmpty(selectedWidgetIds)) {
      setAllDistExist(false);
      return;
    }

    const selectedWidgetPaths = await invoke("extract_selected_widget_paths", {
      selectedIds: selectedWidgetIds,
      widgets,
    });

    if (R.isEmpty(selectedWidgetPaths)) {
      setAllDistExist(false);
      return;
    }

    const results = await invoke("check_multiple_dist_exists", {
      widgetPaths: selectedWidgetPaths,
    });

    setAllDistExist(R.all(R.identity, results));
  }, [selectedWidgets, widgets]);

  useEffect(() => {
    checkDistExists();
  }, [checkDistExists]);

  return { allDistExist };
}
