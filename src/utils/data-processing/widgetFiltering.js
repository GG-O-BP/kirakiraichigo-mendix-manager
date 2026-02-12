import { invoke } from "@tauri-apps/api/core";

export async function processWidgetsPipeline(
  widgets,
  { searchTerm = null, selectedIds = null, order = null } = {},
) {
  return await invoke("process_widgets_pipeline", {
    params: {
      widgets,
      search_term: searchTerm,
      selected_ids: selectedIds,
      order,
    },
  });
}
