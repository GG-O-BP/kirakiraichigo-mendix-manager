import * as R from "ramda";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { countAllSpecGroupsVisibleProperties } from "../../utils/data-processing/propertyCalculation";

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
      return;
    }

    const computeVisibleKeys = async () => {
      try {
        const combinedValues = R.mergeRight(baseProperties, dynamicProperties);
        const visibleKeys = await invoke("get_visible_property_keys", {
          configContent: editorConfigContent,
          values: combinedValues,
          widgetDefinition,
        });
        setVisiblePropertyKeys(visibleKeys);
      } catch (error) {
        console.error("Failed to get visible property keys:", error);
        setVisiblePropertyKeys(null);
      }
    };

    computeVisibleKeys();
  }, [editorConfigContent, widgetDefinition, dynamicProperties, baseProperties]);

  useEffect(() => {
    if (!widgetDefinition) {
      setGroupCounts({});
      return;
    }

    const propertyGroups = R.propOr([], "propertyGroups", widgetDefinition);
    if (R.isEmpty(propertyGroups)) {
      setGroupCounts({});
      return;
    }

    const calculateCounts = async () => {
      try {
        const results = await countAllSpecGroupsVisibleProperties(
          propertyGroups,
          visiblePropertyKeys,
        );
        const countsMap = R.pipe(
          R.map((item) => [item.group_path, item.count]),
          R.fromPairs,
        )(results);
        setGroupCounts(countsMap);
      } catch (error) {
        console.error("Failed to calculate group counts:", error);
        setGroupCounts({});
      }
    };

    calculateCounts();
  }, [widgetDefinition, visiblePropertyKeys]);

  return {
    visiblePropertyKeys,
    groupCounts,
  };
}
