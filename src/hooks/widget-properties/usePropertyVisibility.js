import * as R from "ramda";
import { useMemo } from "react";
import useSWR from "swr";
import { invoke } from "@tauri-apps/api/core";
import { SWR_KEYS } from "../../lib/swr";

const createInputHash = (inputs) => JSON.stringify(inputs);

const fetchPropertyVisibility = async (key) => {
  const [, , inputHash] = key;
  const { editorConfigContent, widgetDefinition, dynamicProperties, baseProperties } = JSON.parse(inputHash);

  if (R.or(R.isNil(editorConfigContent), R.isNil(widgetDefinition))) {
    return { visible_keys: null, group_counts: {} };
  }

  try {
    const combinedValues = R.mergeRight(baseProperties, dynamicProperties);
    return await invoke("get_property_visibility_with_counts", {
      configContent: editorConfigContent,
      values: combinedValues,
      widgetDefinition,
    });
  } catch (error) {
    console.error("Failed to get property visibility:", error);
    return { visible_keys: null, group_counts: {} };
  }
};

export function usePropertyVisibility({
  editorConfigContent,
  widgetDefinition,
  dynamicProperties,
  baseProperties = {},
}) {
  const widgetId = R.propOr("unknown", "id", widgetDefinition);

  const inputHash = useMemo(
    () =>
      createInputHash({
        editorConfigContent,
        widgetDefinition,
        dynamicProperties,
        baseProperties,
      }),
    [editorConfigContent, widgetDefinition, dynamicProperties, baseProperties],
  );

  const { data = { visible_keys: null, group_counts: {} } } = useSWR(
    SWR_KEYS.PROPERTY_VISIBILITY(widgetId, inputHash),
    fetchPropertyVisibility,
    { keepPreviousData: true },
  );

  return {
    visiblePropertyKeys: R.prop("visible_keys", data),
    groupCounts: R.propOr({}, "group_counts", data),
  };
}
