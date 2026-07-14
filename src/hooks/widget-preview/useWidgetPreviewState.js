import * as R from "ramda";
import useSWR from "swr";
import { invoke } from "@tauri-apps/api/core";
import { SWR_KEYS } from "../../lib/swr";

const fetchDistExists = (key) =>
  R.ifElse(
    R.isNil,
    R.always(false),
    (widgetPath) => invoke("check_dist_exists", { widgetPath }),
  )(R.nth(1, key));

export function useWidgetPreviewState(widgetPath) {
  const {
    data: distExists = false,
    mutate: checkDistExists,
  } = useSWR(
    R.ifElse(
      R.isNil,
      R.always(null),
      (path) => SWR_KEYS.DIST_EXISTS(path),
    )(widgetPath),
    fetchDistExists,
  );

  return {
    distExists,
    checkDistExists: () => checkDistExists(),
  };
}
