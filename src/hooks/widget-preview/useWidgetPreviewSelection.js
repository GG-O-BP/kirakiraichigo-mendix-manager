import * as R from "ramda";
import { useState, useCallback, useRef } from "react";
import { setProperty } from "../../utils";

export function useWidgetPreviewSelection() {
  const [selectedWidgetForPreview, setSelectedWidgetForPreviewInternal] = useState(null);
  const [properties, setProperties] = useState({});
  const [dynamicProperties, setDynamicPropertiesInternal] = useState({});
  const [lastLoadedWidgetId, setLastLoadedWidgetId] = useState(null);
  const [widgetDefinition, setWidgetDefinitionInternal] = useState(null);
  const [editorConfigHandler, setEditorConfigHandlerInternal] = useState(null);

  const [dynamicPropertiesCache, setDynamicPropertiesCache] = useState({});
  const [widgetDefinitionCache, setWidgetDefinitionCache] = useState({});
  const [editorConfigHandlerCache, setEditorConfigHandlerCache] = useState({});

  const currentWidgetIdRef = useRef(null);
  const dynamicPropertiesRef = useRef(dynamicProperties);
  const widgetDefinitionRef = useRef(widgetDefinition);
  const editorConfigHandlerRef = useRef(editorConfigHandler);

  dynamicPropertiesRef.current = dynamicProperties;
  widgetDefinitionRef.current = widgetDefinition;
  editorConfigHandlerRef.current = editorConfigHandler;

  const dynamicPropertiesCacheRef = useRef(dynamicPropertiesCache);
  const widgetDefinitionCacheRef = useRef(widgetDefinitionCache);
  const editorConfigHandlerCacheRef = useRef(editorConfigHandlerCache);

  dynamicPropertiesCacheRef.current = dynamicPropertiesCache;
  widgetDefinitionCacheRef.current = widgetDefinitionCache;
  editorConfigHandlerCacheRef.current = editorConfigHandlerCache;

  const setSelectedWidgetForPreview = useCallback((newWidgetId) => {
    const prevWidgetId = currentWidgetIdRef.current;

    R.when(
      R.complement(R.isNil),
      (prevId) => {
        const prevIdStr = String(prevId);
        setDynamicPropertiesCache((cache) =>
          R.assoc(prevIdStr, dynamicPropertiesRef.current, cache),
        );
        setWidgetDefinitionCache((cache) =>
          R.assoc(prevIdStr, widgetDefinitionRef.current, cache),
        );
        setEditorConfigHandlerCache((cache) =>
          R.assoc(prevIdStr, editorConfigHandlerRef.current, cache),
        );
      },
    )(prevWidgetId);

    currentWidgetIdRef.current = newWidgetId;
    setSelectedWidgetForPreviewInternal(newWidgetId);

    R.ifElse(
      R.isNil,
      () => {
        setDynamicPropertiesInternal({});
        setWidgetDefinitionInternal(null);
        setEditorConfigHandlerInternal(null);
        setLastLoadedWidgetId(null);
      },
      (widgetId) => {
        const widgetIdStr = String(widgetId);
        const cachedDynamicProps = R.prop(widgetIdStr, dynamicPropertiesCacheRef.current);
        const cachedWidgetDef = R.prop(widgetIdStr, widgetDefinitionCacheRef.current);
        const cachedEditorConfig = R.prop(widgetIdStr, editorConfigHandlerCacheRef.current);

        R.ifElse(
          R.complement(R.isNil),
          () => {
            setDynamicPropertiesInternal(cachedDynamicProps);
            setWidgetDefinitionInternal(cachedWidgetDef);
            setEditorConfigHandlerInternal(cachedEditorConfig);
            setLastLoadedWidgetId(widgetId);
          },
          () => {
            setDynamicPropertiesInternal({});
            setWidgetDefinitionInternal(null);
            setEditorConfigHandlerInternal(null);
            setLastLoadedWidgetId(null);
          },
        )(cachedDynamicProps);
      },
    )(newWidgetId);
  }, []);

  const setDynamicProperties = useCallback((updater) => {
    setDynamicPropertiesInternal(updater);
    R.when(
      R.complement(R.isNil),
      (widgetId) => {
        setDynamicPropertiesCache((cache) => {
          const currentValue = R.propOr({}, String(widgetId), cache);
          const newValue = R.is(Function, updater) ? updater(currentValue) : updater;
          return R.assoc(String(widgetId), newValue, cache);
        });
      },
    )(selectedWidgetForPreview);
  }, [selectedWidgetForPreview]);

  const setWidgetDefinition = useCallback((value) => {
    setWidgetDefinitionInternal(value);
    R.when(
      R.complement(R.isNil),
      (widgetId) => {
        setWidgetDefinitionCache((cache) =>
          R.assoc(String(widgetId), value, cache),
        );
      },
    )(selectedWidgetForPreview);
  }, [selectedWidgetForPreview]);

  const setEditorConfigHandler = useCallback((value) => {
    setEditorConfigHandlerInternal(value);
    R.when(
      R.complement(R.isNil),
      (widgetId) => {
        setEditorConfigHandlerCache((cache) =>
          R.assoc(String(widgetId), value, cache),
        );
      },
    )(selectedWidgetForPreview);
  }, [selectedWidgetForPreview]);

  const updateProperty = useCallback(
    R.curry((key, value) => setProperties(setProperty(key, value))),
    [],
  );

  return {
    selectedWidgetForPreview,
    setSelectedWidgetForPreview,
    properties,
    updateProperty,
    dynamicProperties,
    setDynamicProperties,
    lastLoadedWidgetId,
    setLastLoadedWidgetId,
    widgetDefinition,
    setWidgetDefinition,
    editorConfigHandler,
    setEditorConfigHandler,
  };
}
