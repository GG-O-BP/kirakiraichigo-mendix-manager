import * as R from "ramda";
import { atom } from "jotai";

// ===== Widget Preview Selection Atoms =====
export const selectedWidgetForPreviewAtom = atom(null);
export const propertiesAtom = atom({});
export const dynamicPropertiesAtom = atom({});
export const dynamicPropertiesCacheAtom = atom({});

// ===== Build State Atoms =====
export const previewDataCacheAtom = atom({});
export const buildErrorAtom = atom(null);

// ===== Derived Atoms =====
export const currentPreviewDataAtom = atom((get) => {
  const widgetId = get(selectedWidgetForPreviewAtom);
  const cache = get(previewDataCacheAtom);

  return R.ifElse(
    R.isNil,
    R.always(null),
    (id) => R.propOr(null, String(id), cache),
  )(widgetId);
});

// ===== Action Atoms =====
export const setSelectedWidgetForPreviewAtom = atom(
  null,
  (get, set, newWidgetId) => {
    const prevWidgetId = get(selectedWidgetForPreviewAtom);
    const currentDynamicProperties = get(dynamicPropertiesAtom);

    R.when(
      R.complement(R.isNil),
      (prevId) => {
        set(dynamicPropertiesCacheAtom, (cache) =>
          R.assoc(String(prevId), currentDynamicProperties, cache),
        );
      },
    )(prevWidgetId);

    set(selectedWidgetForPreviewAtom, newWidgetId);

    R.ifElse(
      R.isNil,
      () => set(dynamicPropertiesAtom, {}),
      (widgetId) => {
        const cache = get(dynamicPropertiesCacheAtom);
        const cachedProps = R.prop(String(widgetId), cache);

        R.ifElse(
          R.complement(R.isNil),
          () => set(dynamicPropertiesAtom, cachedProps),
          () => set(dynamicPropertiesAtom, {}),
        )(cachedProps);
      },
    )(newWidgetId);
  },
);

export const updatePropertyAtom = atom(null, (get, set, { key, value }) => {
  set(propertiesAtom, (prev) => R.assoc(key, value, prev));
});

export const setPreviewDataAtom = atom(null, (get, set, { widgetId, data }) => {
  set(previewDataCacheAtom, (cache) => R.assoc(String(widgetId), data, cache));
});

export const clearBuildErrorAtom = atom(null, (get, set) => {
  set(buildErrorAtom, null);
});
