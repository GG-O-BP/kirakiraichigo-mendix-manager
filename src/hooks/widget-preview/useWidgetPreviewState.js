import * as R from "ramda";
import useSWR from "swr";
import { invoke } from "@tauri-apps/api/core";
import { SWR_KEYS } from "../../lib/swr";

const fetchDistExists = async (key) => {
  const widgetPath = key[1];
  if (R.isNil(widgetPath)) {
    return false;
  }
  return invoke("check_dist_exists", { widgetPath });
};

export function useWidgetPreviewState(widgetPath) {
  const {
    data: distExists = false,
    mutate: checkDistExists,
  } = useSWR(
    R.isNil(widgetPath) ? null : SWR_KEYS.DIST_EXISTS(widgetPath),
    fetchDistExists,
  );

  return {
    distExists,
    checkDistExists: () => checkDistExists(),
  };
}
