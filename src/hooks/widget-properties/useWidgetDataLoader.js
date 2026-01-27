import * as R from "ramda";
import { useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useArrayPropertyOperations } from "./useArrayPropertyOperations";

export function useWidgetDataLoader(selectedWidget, externalState = {}) {
  const {
    dynamicProperties,
    setDynamicProperties,
    lastLoadedWidgetId,
    setLastLoadedWidgetId,
    widgetDefinition,
    setWidgetDefinition,
    editorConfigContent,
    setEditorConfigContent,
  } = externalState;

  const resetWidgetState = useCallback(() => {
    setWidgetDefinition(null);
    setEditorConfigContent(null);
  }, [setWidgetDefinition, setEditorConfigContent]);

  const updateProperty = useCallback(
    R.curry((propertyKey, value) =>
      setDynamicProperties(R.assoc(propertyKey, value))
    ),
    [setDynamicProperties]
  );

  const arrayOperations = useArrayPropertyOperations(setDynamicProperties);

  useEffect(() => {
    if (R.isNil(selectedWidget)) {
      resetWidgetState();
      setLastLoadedWidgetId(null);
      return;
    }

    const widgetId = R.prop("id", selectedWidget);
    const widgetPath = R.prop("path", selectedWidget);

    if (R.equals(widgetId, lastLoadedWidgetId)) {
      return;
    }

    const hasCachedData = R.both(
      R.complement(R.isEmpty),
      R.always(R.complement(R.isNil)(widgetDefinition)),
    )(dynamicProperties);
    if (hasCachedData) {
      setLastLoadedWidgetId(widgetId);
      return;
    }

    const loadWidgetData = async () => {
      try {
        const { definition, initial_values, editor_config } = await invoke(
          "load_widget_complete_data",
          { widgetPath }
        );

        setWidgetDefinition(definition);
        setDynamicProperties(R.always(initial_values));
        setLastLoadedWidgetId(widgetId);

        R.ifElse(
          R.both(R.prop("found"), R.prop("content")),
          R.pipe(R.prop("content"), setEditorConfigContent),
          R.always(setEditorConfigContent(null))
        )(editor_config);
      } catch (error) {
        console.error("Failed to load widget data:", error);
        resetWidgetState();
      }
    };

    loadWidgetData();
  }, [selectedWidget, resetWidgetState, setDynamicProperties, lastLoadedWidgetId, setLastLoadedWidgetId, setWidgetDefinition, setEditorConfigContent, dynamicProperties, widgetDefinition]);

  return {
    widgetDefinition,
    dynamicProperties,
    editorConfigContent,
    updateProperty,
    ...arrayOperations,
  };
}
