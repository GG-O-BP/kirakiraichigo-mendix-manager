import * as R from "ramda";
import { useState, useCallback, useRef } from "react";
import { setProperty } from "../../utils";

export function useWidgetPreviewSelection() {
  const [selectedWidgetForPreview, setSelectedWidgetForPreviewInternal] = useState(null);
  const [properties, setProperties] = useState({});
  const [dynamicProperties, setDynamicPropertiesInternal] = useState({});

  const [dynamicPropertiesCache, setDynamicPropertiesCache] = useState({});

  const currentWidgetIdRef = useRef(null);
  const dynamicPropertiesRef = useRef(dynamicProperties);

  dynamicPropertiesRef.current = dynamicProperties;

  const dynamicPropertiesCacheRef = useRef(dynamicPropertiesCache);

  dynamicPropertiesCacheRef.current = dynamicPropertiesCache;

  const setSelectedWidgetForPreview = useCallback((newWidgetId) => {
    const prevWidgetId = currentWidgetIdRef.current;

    R.when(
      R.complement(R.isNil),
      (prevId) => {
        const prevIdStr = String(prevId);
        setDynamicPropertiesCache((cache) =>
          R.assoc(prevIdStr, dynamicPropertiesRef.current, cache),
        );
      },
    )(prevWidgetId);

    currentWidgetIdRef.current = newWidgetId;
    setSelectedWidgetForPreviewInternal(newWidgetId);

    R.ifElse(
      R.isNil,
      () => {
        setDynamicPropertiesInternal({});
      },
      (widgetId) => {
        const widgetIdStr = String(widgetId);
        const cachedDynamicProps = R.prop(widgetIdStr, dynamicPropertiesCacheRef.current);

        R.ifElse(
          R.complement(R.isNil),
          () => setDynamicPropertiesInternal(cachedDynamicProps),
          () => setDynamicPropertiesInternal({}),
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
  };
}
