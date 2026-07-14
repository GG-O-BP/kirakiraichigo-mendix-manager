import * as R from "ramda";
import { useMemo } from "react";
import useSWR from "swr";
import { invoke } from "@tauri-apps/api/core";
import { SWR_KEYS } from "../../lib/swr";

const createInputHash = (inputs) => JSON.stringify(inputs);

const fetchPropertyVisibility = (key) => {
  const { editorConfigContent, widgetDefinition, dynamicProperties, baseProperties } = JSON.parse(R.nth(2, key));

  return R.ifElse(
    () => R.or(R.isNil(editorConfigContent), R.isNil(widgetDefinition)),
    R.always({ visible_keys: null, group_counts: {} }),
    () =>
      R.pipe(
        () =>
          invoke("get_property_visibility_with_counts", {
            configContent: editorConfigContent,
            values: R.mergeRight(baseProperties, dynamicProperties),
            widgetDefinition,
          }),
        R.otherwise(
          R.pipe(
            R.tap((error) => console.error("Failed to get property visibility:", error)),
            R.always({ visible_keys: null, group_counts: {} }),
          ),
        ),
      )(),
  )(null);
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
