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

  const loader = useWidgetDataLoader(selectedWidget, {
    dynamicProperties,
    setDynamicProperties,
  });

  const visibility = usePropertyVisibility({
    editorConfigContent: loader.editorConfigContent,
    widgetDefinition: loader.widgetDefinition,
    dynamicProperties: loader.dynamicProperties,
    baseProperties,
  });

  const groupUI = usePropertyGroupUI(loader.widgetDefinition);

  const combinedProperties = R.mergeRight(baseProperties, loader.dynamicProperties);

  const arrayHandlers = {
    addArrayItem: loader.addArrayItem,
    removeArrayItem: loader.removeArrayItem,
    updateArrayItemProperty: loader.updateArrayItemProperty,
  };

  return {
    widgetDefinition: loader.widgetDefinition,
    dynamicProperties: loader.dynamicProperties,
    updateProperty: loader.updateProperty,
    arrayHandlers,
    visiblePropertyKeys: visibility.visiblePropertyKeys,
    groupCounts: visibility.groupCounts,
    expandedGroups: groupUI.expandedGroups,
    toggleGroup: groupUI.toggleGroup,
    combinedProperties,
  };
};
