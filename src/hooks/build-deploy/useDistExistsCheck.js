import * as R from "ramda";
import useSWR from "swr";
import { invoke } from "@tauri-apps/api/core";

const fetchAllDistExist = (key) => {
  const selectedWidgetIds = Array.from(R.nth(1, key));
  const widgets = R.nth(2, key);

  return R.ifElse(
    R.isEmpty,
    R.always(false),
    () =>
      R.pipe(
        () =>
          invoke("extract_selected_widget_paths", {
            selectedIds: selectedWidgetIds,
            widgets,
          }),
        R.andThen(
          R.ifElse(
            R.isEmpty,
            R.always(false),
            (selectedWidgetPaths) =>
              R.pipe(
                () =>
                  invoke("check_multiple_dist_exists", {
                    widgetPaths: selectedWidgetPaths,
                  }),
                R.andThen(R.all(R.identity)),
              )(),
          ),
        ),
      )(),
  )(selectedWidgetIds);
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
