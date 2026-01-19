import * as R from "ramda";
import {
  useWidgetDataLoader,
  usePropertyVisibility,
  usePropertyGroupUI,
} from "./widget-properties";

/**
 * useWidgetProperties - Composition hook that combines all widget property hooks
 * Maintains backward compatibility with existing consumers
 * @param {Object|null} selectedWidget - The currently selected widget
 * @param {Object} baseProperties - Base property values
 */
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
    // From useWidgetDataLoader
    widgetDefinition: loader.widgetDefinition,
    dynamicProperties: loader.dynamicProperties,
    updateProperty: loader.updateProperty,
    // From usePropertyVisibility
    visiblePropertyKeys: visibility.visiblePropertyKeys,
    groupCounts: visibility.groupCounts,
    // From usePropertyGroupUI
    expandedGroups: groupUI.expandedGroups,
    toggleGroup: groupUI.toggleGroup,
    // Computed
    combinedProperties,
  };
};

export default useWidgetProperties;
