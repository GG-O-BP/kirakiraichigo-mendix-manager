import * as R from "ramda";
import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { createEditorConfigHandler } from "../../utils/editorConfigParser";

export function useWidgetDataLoader(selectedWidget) {
  const [widgetDefinition, setWidgetDefinition] = useState(null);
  const [dynamicProperties, setDynamicProperties] = useState({});
  const [editorConfigHandler, setEditorConfigHandler] = useState(null);

  const resetWidgetState = useCallback(() => {
    setWidgetDefinition(null);
    setDynamicProperties({});
    setEditorConfigHandler(null);
  }, []);

  const updateProperty = useCallback(
    R.curry((propertyKey, value) =>
      setDynamicProperties(R.assoc(propertyKey, value))
    ),
    []
  );

  useEffect(() => {
    if (!selectedWidget) {
      resetWidgetState();
      return;
    }

    const widgetPath = R.prop("path", selectedWidget);

    const loadWidgetData = async () => {
      try {
        const { definition, initial_values, editor_config } = await invoke(
          "load_widget_complete_data",
          { widgetPath }
        );

        setWidgetDefinition(definition);
        setDynamicProperties(initial_values);

        R.ifElse(
          R.both(R.prop("found"), R.prop("content")),
          R.pipe(
            R.prop("content"),
            createEditorConfigHandler,
            setEditorConfigHandler
          ),
          R.always(setEditorConfigHandler(null))
        )(editor_config);
      } catch (error) {
        console.error("Failed to load widget data:", error);
        resetWidgetState();
      }
    };

    loadWidgetData();
  }, [selectedWidget, resetWidgetState]);

  return {
    widgetDefinition,
    dynamicProperties,
    editorConfigHandler,
    updateProperty,
  };
}
