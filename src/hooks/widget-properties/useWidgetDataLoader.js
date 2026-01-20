import * as R from "ramda";
import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { createEditorConfigHandler } from "../../utils/editorConfigParser";
import { initializePropertyValues } from "../../utils/data-processing/propertyCalculation";

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
        const [definition, initialValues, editorConfigResult] = await Promise.all([
          invoke("parse_widget_properties_as_spec", { widgetPath }),
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
  }, [selectedWidget, resetWidgetState]);

  return {
    widgetDefinition,
    dynamicProperties,
    editorConfigHandler,
    updateProperty,
  };
}
