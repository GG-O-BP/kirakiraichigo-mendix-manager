import { invoke } from "@tauri-apps/api/core";

export async function initializePropertyValues(widgetPath) {
  return await invoke("initialize_property_values", { widgetPath });
}

export async function transformPropertiesToSpec(properties) {
  return await invoke("transform_properties_to_spec", { properties });
}

export async function countAllSpecGroupsVisibleProperties(propertyGroups, visibleKeys = null) {
  return await invoke("count_all_spec_groups_visible_properties", { propertyGroups, visibleKeys });
}
