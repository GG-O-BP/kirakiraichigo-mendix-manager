import * as R from "ramda";
import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { setProperty } from "../utils";

export function useWidgetPreview({ packageManagerPersistence }) {
  const [widgetPreviewSearch, setWidgetPreviewSearch] = useState("");
  const [selectedWidgetForPreview, setSelectedWidgetForPreviewInternal] = useState(null);
  const [properties, setProperties] = useState({});
  const [dynamicProperties, setDynamicPropertiesInternal] = useState({});
  const [lastLoadedWidgetId, setLastLoadedWidgetId] = useState(null);
  const [widgetDefinition, setWidgetDefinitionInternal] = useState(null);
  const [editorConfigHandler, setEditorConfigHandlerInternal] = useState(null);

  const [previewDataByWidgetId, setPreviewDataByWidgetId] = useState({});
  const [dynamicPropertiesCache, setDynamicPropertiesCache] = useState({});
  const [widgetDefinitionCache, setWidgetDefinitionCache] = useState({});
  const [editorConfigHandlerCache, setEditorConfigHandlerCache] = useState({});

  const [isBuilding, setIsBuilding] = useState(false);
  const [buildError, setBuildError] = useState(null);
  const { packageManager, setPackageManager } = packageManagerPersistence;
  const [distExists, setDistExists] = useState(false);

  const currentWidgetIdRef = useRef(null);
  const dynamicPropertiesRef = useRef(dynamicProperties);
  const widgetDefinitionRef = useRef(widgetDefinition);
  const editorConfigHandlerRef = useRef(editorConfigHandler);

  dynamicPropertiesRef.current = dynamicProperties;
  widgetDefinitionRef.current = widgetDefinition;
  editorConfigHandlerRef.current = editorConfigHandler;

  const previewData = R.ifElse(
    R.isNil,
    R.always(null),
    (widgetId) => R.propOr(null, String(widgetId), previewDataByWidgetId),
  )(selectedWidgetForPreview);

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

  const checkDistExists = useCallback(async (widgetPath) => {
    if (R.isNil(widgetPath)) {
      setDistExists(false);
      return;
    }
    const exists = await invoke("check_dist_exists", { widgetPath });
    setDistExists(exists);
  }, []);

  const handleBuildAndRun = useCallback(async (selectedWidget) => {
    if (R.isNil(selectedWidget)) return;

    const widgetId = R.prop("id", selectedWidget);
    setIsBuilding(true);
    setBuildError(null);

    try {
      const response = await invoke("build_and_run_preview", {
        widgetPath: R.prop("path", selectedWidget),
        packageManager: packageManager,
      });

      R.ifElse(
        R.prop("success"),
        R.pipe(
          R.tap(() => setBuildError(null)),
          (res) => setPreviewDataByWidgetId((cache) =>
            R.assoc(String(widgetId), {
              bundle: R.prop("bundle_content", res),
              css: R.prop("css_content", res),
              widgetName: R.prop("widget_name", res),
              widgetId: R.prop("widget_id", res),
            }, cache),
          ),
        ),
        R.pipe(
          R.tap((res) => setBuildError(R.propOr("Build failed", "error", res))),
          R.tap(() => setPreviewDataByWidgetId((cache) =>
            R.assoc(String(widgetId), null, cache),
          )),
        ),
      )(response);
    } catch (error) {
      console.error("[Widget Preview] Error:", error);
      setBuildError(String(error));
      setPreviewDataByWidgetId((cache) =>
        R.assoc(String(widgetId), null, cache),
      );
    } finally {
      setIsBuilding(false);
    }
  }, [packageManager]);

  const handleRunOnly = useCallback(async (selectedWidget) => {
    if (R.isNil(selectedWidget)) return;

    const widgetId = R.prop("id", selectedWidget);
    setIsBuilding(true);
    setBuildError(null);

    try {
      const response = await invoke("run_widget_preview_only", {
        widgetPath: R.prop("path", selectedWidget),
      });

      R.ifElse(
        R.prop("success"),
        R.pipe(
          R.tap(() => setBuildError(null)),
          (res) => setPreviewDataByWidgetId((cache) =>
            R.assoc(String(widgetId), {
              bundle: R.prop("bundle_content", res),
              css: R.prop("css_content", res),
              widgetName: R.prop("widget_name", res),
              widgetId: R.prop("widget_id", res),
            }, cache),
          ),
        ),
        R.pipe(
          R.tap((res) => setBuildError(R.propOr("No build output found", "error", res))),
          R.tap(() => setPreviewDataByWidgetId((cache) =>
            R.assoc(String(widgetId), null, cache),
          )),
        ),
      )(response);
    } catch (error) {
      console.error("[Widget Preview] Run Only Error:", error);
      setBuildError(String(error));
      setPreviewDataByWidgetId((cache) =>
        R.assoc(String(widgetId), null, cache),
      );
    } finally {
      setIsBuilding(false);
    }
  }, []);

  return {
    widgetPreviewSearch,
    setWidgetPreviewSearch,
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
    previewData,
    isBuilding,
    buildError,
    packageManager,
    setPackageManager,
    distExists,
    checkDistExists,
    handleBuildAndRun,
    handleRunOnly,
  };
}
