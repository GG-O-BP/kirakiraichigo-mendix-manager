import * as R from "ramda";
import { useCallback } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { setProperty } from "../../utils";
import {
  selectedWidgetForPreviewAtom,
  propertiesAtom,
  dynamicPropertiesAtom,
  dynamicPropertiesCacheAtom,
  setSelectedWidgetForPreviewAtom,
} from "../../atoms";

export function useWidgetPreviewSelection() {
  const selectedWidgetForPreview = useAtomValue(selectedWidgetForPreviewAtom);
  const setSelectedWidgetAction = useSetAtom(setSelectedWidgetForPreviewAtom);
  const [properties, setProperties] = useAtom(propertiesAtom);
  const [dynamicProperties, setDynamicPropertiesInternal] = useAtom(dynamicPropertiesAtom);
  const [dynamicPropertiesCache, setDynamicPropertiesCache] = useAtom(dynamicPropertiesCacheAtom);

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
  }, [selectedWidgetForPreview, setDynamicPropertiesCache, setDynamicPropertiesInternal]);

  const updateProperty = useCallback(
    R.curry((key, value) => setProperties(setProperty(key, value))),
    [setProperties],
  );

  return {
    selectedWidgetForPreview,
    setSelectedWidgetForPreview: setSelectedWidgetAction,
    properties,
    updateProperty,
    dynamicProperties,
    setDynamicProperties,
  };
}
