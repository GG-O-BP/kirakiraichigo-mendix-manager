import * as R from "ramda";
import useSWR from "swr";
import { invoke } from "@tauri-apps/api/core";

const fetchAllDistExist = async (key) => {
  const [, selectedWidgets, widgets] = key;
  const selectedWidgetIds = Array.from(selectedWidgets);

  if (R.isEmpty(selectedWidgetIds)) {
    return false;
  }

  const selectedWidgetPaths = await invoke("extract_selected_widget_paths", {
    selectedIds: selectedWidgetIds,
    widgets,
  });

  if (R.isEmpty(selectedWidgetPaths)) {
    return false;
  }

  const results = await invoke("check_multiple_dist_exists", {
    widgetPaths: selectedWidgetPaths,
  });

  return R.all(R.identity, results);
};

export function useDistExistsCheck({ selectedWidgets, widgets }) {
  const selectedArray = Array.from(selectedWidgets);

  const { data: allDistExist = false } = useSWR(
    ["dist-exists-check", selectedArray, widgets],
    fetchAllDistExist,
    {
      revalidateOnFocus: false,
    },
  );

  return { allDistExist };
}
