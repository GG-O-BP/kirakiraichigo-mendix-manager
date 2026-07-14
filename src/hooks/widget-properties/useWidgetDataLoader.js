import * as R from "ramda";
import { useCallback, useRef, useEffect } from "react";
import useSWR from "swr";
import { invoke } from "@tauri-apps/api/core";
import { SWR_KEYS } from "../../lib/swr";
import { useArrayPropertyOperations } from "./useArrayPropertyOperations";

const fetchWidgetData = (key) =>
  R.ifElse(
    R.isNil,
    R.always(null),
    (widgetPath) => invoke("load_widget_complete_data", { widgetPath }),
  )(R.nth(1, key));

export function useWidgetDataLoader(selectedWidget, externalState = {}) {
  const {
    dynamicProperties,
    setDynamicProperties,
  } = externalState;

  const widgetId = R.prop("id", selectedWidget);
  const widgetPath = R.prop("path", selectedWidget);

  const initializedWidgetsRef = useRef(new Set());

  const { data, isLoading, error } = useSWR(
    R.ifElse(
      R.isNil,
      R.always(null),
      () => SWR_KEYS.WIDGET_DATA(widgetId),
    )(widgetPath),
    () => fetchWidgetData(["widget-data", widgetPath]),
    {
      revalidateOnFocus: false,
      keepPreviousData: false,
    },
  );

  useEffect(() => {
    R.when(
      R.allPass([
        () => R.isNotNil(data),
        () => R.isNotNil(widgetId),
        () => R.not(initializedWidgetsRef.current.has(String(widgetId))),
      ]),
      () => {
        setDynamicProperties(R.always(R.prop("initial_values", data)));
        initializedWidgetsRef.current.add(String(widgetId));
      },
    )(null);
  }, [data, widgetId, setDynamicProperties]);

  const widgetDefinition = R.prop("definition", data);
  const editorConfigContent = R.pipe(
    R.prop("editor_config"),
    R.ifElse(
      R.both(R.prop("found"), R.prop("content")),
      R.prop("content"),
      R.always(null),
    ),
  )(R.defaultTo({}, data));

  const updateProperty = useCallback(
    R.curry((propertyKey, value) =>
      setDynamicProperties(R.assoc(propertyKey, value))
    ),
    [setDynamicProperties]
  );

  const arrayOperations = useArrayPropertyOperations(dynamicProperties, setDynamicProperties);

  return R.mergeRight(
    {
      widgetDefinition,
      dynamicProperties,
      editorConfigContent,
      updateProperty,
      isLoading,
      error,
    },
    arrayOperations,
  );
}
