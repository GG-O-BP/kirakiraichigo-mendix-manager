import * as R from "ramda";
import {
  useWidgetDataLoader,
  usePropertyVisibility,
  usePropertyGroupUI,
} from "./widget-properties";

export const useWidgetProperties = (selectedWidget, baseProperties = {}, externalState = {}) => {
  const {
    dynamicProperties,
    setDynamicProperties,
  } = externalState;

  const {
    widgetDefinition,
    dynamicProperties: loadedDynamicProperties,
    editorConfigContent,
    updateProperty,
    addArrayItem,
    removeArrayItem,
    updateArrayItemProperty,
  } = useWidgetDataLoader(selectedWidget, {
    dynamicProperties,
    setDynamicProperties,
  });

  const { visiblePropertyKeys, groupCounts } = usePropertyVisibility({
    editorConfigContent,
    widgetDefinition,
    dynamicProperties: loadedDynamicProperties,
    baseProperties,
  });

  const { expandedGroups, toggleGroup } = usePropertyGroupUI(widgetDefinition);

  const combinedProperties = R.mergeRight(baseProperties, loadedDynamicProperties);

  const arrayHandlers = {
    addArrayItem,
    removeArrayItem,
    updateArrayItemProperty,
  };

  return {
    widgetDefinition,
    dynamicProperties: loadedDynamicProperties,
    updateProperty,
    arrayHandlers,
    visiblePropertyKeys,
    groupCounts,
    expandedGroups,
    toggleGroup,
    combinedProperties,
  };
};
