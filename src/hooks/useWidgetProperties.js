import * as R from "ramda";
import {
  useWidgetDataLoader,
  usePropertyVisibility,
  usePropertyGroupUI,
} from "./widget-properties";

export const useWidgetProperties = (selectedWidget, baseProperties = {}) => {
  const loader = useWidgetDataLoader(selectedWidget);
  const visibility = usePropertyVisibility({
    editorConfigHandler: loader.editorConfigHandler,
    widgetDefinition: loader.widgetDefinition,
    dynamicProperties: loader.dynamicProperties,
    baseProperties,
  });
  const groupUI = usePropertyGroupUI();

  const combinedProperties = R.mergeRight(baseProperties, loader.dynamicProperties);

  return {
    widgetDefinition: loader.widgetDefinition,
    dynamicProperties: loader.dynamicProperties,
    updateProperty: loader.updateProperty,
    visiblePropertyKeys: visibility.visiblePropertyKeys,
    groupCounts: visibility.groupCounts,
    expandedGroups: groupUI.expandedGroups,
    toggleGroup: groupUI.toggleGroup,
    combinedProperties,
  };
};
