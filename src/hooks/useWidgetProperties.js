import * as R from "ramda";
import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { createEditorConfigHandler } from "../utils/editorConfigParser";
import { initializePropertyValues, countAllWidgetGroupsVisibleProperties } from "../utils/dataProcessing";

export const useWidgetProperties = (selectedWidget, baseProperties = {}) => {
  const [widgetDefinition, setWidgetDefinition] = useState(null);
  const [dynamicProperties, setDynamicProperties] = useState({});
  const [editorConfigHandler, setEditorConfigHandler] = useState(null);
  const [visiblePropertyKeys, setVisiblePropertyKeys] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [groupCounts, setGroupCounts] = useState({});

  const toggleGroup = useCallback((category) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [category]: !R.propOr(true, category, prev),
    }));
  }, []);

  const resetWidgetPropertiesState = useCallback(() => {
    setWidgetDefinition(null);
    setDynamicProperties({});
    setEditorConfigHandler(null);
    setVisiblePropertyKeys(null);
    setGroupCounts({});
  }, []);

  // Load widget data when selection changes
  useEffect(() => {
    if (!selectedWidget) {
      resetWidgetPropertiesState();
      return;
    }

    const widgetPath = R.prop("path", selectedWidget);

    const loadWidgetData = async () => {
      try {
        const [definition, initialValues, editorConfigResult] = await Promise.all([
          invoke("parse_widget_properties", { widgetPath }),
          initializePropertyValues(widgetPath),
          invoke("read_editor_config", { widgetPath }),
        ]);

        setWidgetDefinition(definition);
        setDynamicProperties(initialValues);

        if (editorConfigResult.found && editorConfigResult.content) {
          const handler = createEditorConfigHandler(editorConfigResult.content);
          setEditorConfigHandler(handler);
        } else {
          setEditorConfigHandler(null);
        }
      } catch (error) {
        console.error("Failed to load widget data:", error);
        setWidgetDefinition(null);
        setDynamicProperties({});
        setEditorConfigHandler(null);
      }
    };

    loadWidgetData();
  }, [selectedWidget, resetWidgetPropertiesState]);

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

    const propertyGroups = R.propOr([], "property_groups", widgetDefinition);
    if (R.isEmpty(propertyGroups)) {
      setGroupCounts({});
      return;
    }

    const calculateCounts = async () => {
      try {
        const results = await countAllWidgetGroupsVisibleProperties(
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

  const updateProperty = useCallback(
    R.curry((propertyKey, value) =>
      setDynamicProperties(R.assoc(propertyKey, value))
    ),
    []
  );

  const combinedProperties = R.mergeRight(baseProperties, dynamicProperties);

  return {
    widgetDefinition,
    dynamicProperties,
    updateProperty,
    visiblePropertyKeys,
    groupCounts,
    expandedGroups,
    toggleGroup,
    combinedProperties,
  };
};

export default useWidgetProperties;
