import * as R from "ramda";
import { useCallback, useRef, useEffect } from "react";
import useSWR from "swr";
import { invoke } from "@tauri-apps/api/core";
import { SWR_KEYS } from "../../lib/swr";
import { useArrayPropertyOperations } from "./useArrayPropertyOperations";

const fetchWidgetData = async (key) => {
  const widgetPath = key[1];
  if (R.isNil(widgetPath)) {
    return null;
  }
  return invoke("load_widget_complete_data", { widgetPath });
};

export function useWidgetDataLoader(selectedWidget, externalState = {}) {
  const {
    dynamicProperties,
    setDynamicProperties,
  } = externalState;

  const widgetId = R.prop("id", selectedWidget);
  const widgetPath = R.prop("path", selectedWidget);

  const initializedWidgetsRef = useRef(new Set());

  const { data, isLoading, error } = useSWR(
    R.isNil(widgetPath) ? null : SWR_KEYS.WIDGET_DATA(widgetId),
    () => fetchWidgetData(["widget-data", widgetPath]),
    {
      revalidateOnFocus: false,
      keepPreviousData: false,
    },
  );

  useEffect(() => {
    if (data && widgetId && !initializedWidgetsRef.current.has(String(widgetId))) {
      setDynamicProperties(R.always(data.initial_values));
      initializedWidgetsRef.current.add(String(widgetId));
    }
  }, [data, widgetId, setDynamicProperties]);

  const widgetDefinition = R.prop("definition", data);
  const editorConfigContent = R.pipe(
    R.prop("editor_config"),
    R.ifElse(
      R.both(R.prop("found"), R.prop("content")),
      R.prop("content"),
      R.always(null),
    ),
  )(data || {});

  const updateProperty = useCallback(
    R.curry((propertyKey, value) =>
      setDynamicProperties(R.assoc(propertyKey, value))
    ),
    [setDynamicProperties]
  );

  const arrayOperations = useArrayPropertyOperations(dynamicProperties, setDynamicProperties);

  return {
    widgetDefinition,
    dynamicProperties,
    editorConfigContent,
    updateProperty,
    isLoading,
    error,
    ...arrayOperations,
  };
}
