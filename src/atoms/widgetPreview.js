import * as R from "ramda";
import { atom } from "jotai";
import { atomFamily } from "jotai-family";

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

// ===== Property Group Expansion Atoms (per widget) =====
export const expandedGroupsAtomFamily = atomFamily((widgetId) => atom({}));

export const toggleGroupAtomFamily = atomFamily((widgetId) =>
  atom(null, (get, set, groupCaption) => {
    const expandedGroupsAtom = expandedGroupsAtomFamily(widgetId);
    const currentState = get(expandedGroupsAtom);
    const currentValue = R.propOr(true, groupCaption, currentState);
    set(expandedGroupsAtom, R.assoc(groupCaption, R.not(currentValue), currentState));
  }),
);

export const initializeExpandedGroupsAtomFamily = atomFamily((widgetId) =>
  atom(null, (get, set, propertyGroups) => {
    const expandedGroupsAtom = expandedGroupsAtomFamily(widgetId);
    const initialState = R.pipe(
      R.map(R.prop("caption")),
      R.reduce((acc, caption) => R.assoc(caption, true, acc), {}),
    )(propertyGroups);
    set(expandedGroupsAtom, initialState);
  }),
);
