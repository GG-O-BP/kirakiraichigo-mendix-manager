import { invoke } from "@tauri-apps/api/core";

export async function countAllSpecGroupsVisibleProperties(propertyGroups, visibleKeys = null) {
  return await invoke("count_all_spec_groups_visible_properties", { propertyGroups, visibleKeys });
}
