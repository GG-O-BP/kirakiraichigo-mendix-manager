import * as R from "ramda";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function usePropertyVisibility({
  editorConfigContent,
  widgetDefinition,
  dynamicProperties,
  baseProperties = {},
}) {
  const [visiblePropertyKeys, setVisiblePropertyKeys] = useState(null);
  const [groupCounts, setGroupCounts] = useState({});

  useEffect(() => {
    if (R.or(R.isNil(editorConfigContent), R.isNil(widgetDefinition))) {
      setVisiblePropertyKeys(null);
      setGroupCounts({});
      return;
    }

    const computeVisibilityAndCounts = async () => {
      try {
        const combinedValues = R.mergeRight(baseProperties, dynamicProperties);
        const result = await invoke("get_property_visibility_with_counts", {
          configContent: editorConfigContent,
          values: combinedValues,
          widgetDefinition,
        });
        setVisiblePropertyKeys(R.prop("visible_keys", result));
        setGroupCounts(R.propOr({}, "group_counts", result));
      } catch (error) {
        console.error("Failed to get property visibility:", error);
        setVisiblePropertyKeys(null);
        setGroupCounts({});
      }
    };

    computeVisibilityAndCounts();
  }, [editorConfigContent, widgetDefinition, dynamicProperties, baseProperties]);

  return {
    visiblePropertyKeys,
    groupCounts,
  };
}
