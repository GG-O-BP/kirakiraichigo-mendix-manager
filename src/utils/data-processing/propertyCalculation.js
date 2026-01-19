import { invoke } from "@tauri-apps/api/core";

export async function initializePropertyValues(widgetPath) {
  return await invoke("initialize_property_values", { widgetPath });
}

export async function countVisiblePropertiesInGroup(group, visibleKeys = null) {
  return await invoke("count_visible_properties_in_group", { group, visibleKeys });
}

export async function countVisiblePropertiesInWidgetGroup(group, visibleKeys = null) {
  return await invoke("count_visible_properties_in_widget_group", { group, visibleKeys });
}

export async function countAllGroupsVisibleProperties(propertyGroups, visibleKeys = null) {
  return await invoke("count_all_groups_visible_properties", { propertyGroups, visibleKeys });
}

export async function countAllWidgetGroupsVisibleProperties(propertyGroups, visibleKeys = null) {
  return await invoke("count_all_widget_groups_visible_properties", { propertyGroups, visibleKeys });
}

export async function transformPropertiesToSpec(properties) {
  return await invoke("transform_properties_to_spec", { properties });
}

export async function countAllSpecGroupsVisibleProperties(propertyGroups, visibleKeys = null) {
  return await invoke("count_all_spec_groups_visible_properties", { propertyGroups, visibleKeys });
}
