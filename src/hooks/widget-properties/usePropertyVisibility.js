import * as R from "ramda";
import { useState, useEffect } from "react";
import { countAllSpecGroupsVisibleProperties } from "../../utils/dataProcessing";

/**
 * usePropertyVisibility - Calculates visible property keys and group counts
 * @param {Object} params - Parameters object
 * @param {Object|null} params.editorConfigHandler - Editor config handler
 * @param {Object|null} params.widgetDefinition - Widget definition
 * @param {Object} params.dynamicProperties - Dynamic property values
 * @param {Object} params.baseProperties - Base property values
 */
export function usePropertyVisibility({
  editorConfigHandler,
  widgetDefinition,
  dynamicProperties,
  baseProperties = {},
}) {
  const [visiblePropertyKeys, setVisiblePropertyKeys] = useState(null);
  const [groupCounts, setGroupCounts] = useState({});

  // Calculate visible property keys based on editor config
  useEffect(() => {
    if (!editorConfigHandler || !editorConfigHandler.isAvailable || !widgetDefinition) {
      setVisiblePropertyKeys(null);
      return;
    }

    const combinedValues = R.mergeRight(baseProperties, dynamicProperties);
    const visibleKeys = editorConfigHandler.getVisiblePropertyKeys(
      combinedValues,
      widgetDefinition,
    );
    setVisiblePropertyKeys(visibleKeys);
  }, [editorConfigHandler, widgetDefinition, dynamicProperties, baseProperties]);

  // Calculate group counts when widgetDefinition or visiblePropertyKeys change
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

export default usePropertyVisibility;
