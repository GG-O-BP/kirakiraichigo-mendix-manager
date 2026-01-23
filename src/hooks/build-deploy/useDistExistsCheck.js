import * as R from "ramda";
import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useDistExistsCheck({ selectedWidgets, widgets }) {
  const [allDistExist, setAllDistExist] = useState(false);

  const checkDistExists = useCallback(async () => {
    if (R.equals(0, selectedWidgets.size)) {
      setAllDistExist(false);
      return;
    }

    const selectedWidgetIds = Array.from(selectedWidgets);
    const selectedWidgetPaths = R.pipe(
      R.filter((widget) => R.includes(R.prop("id", widget), selectedWidgetIds)),
      R.pluck("path"),
    )(widgets);

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
