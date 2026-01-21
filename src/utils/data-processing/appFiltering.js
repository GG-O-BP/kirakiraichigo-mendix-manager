import { invoke } from "@tauri-apps/api/core";

export async function processAppsPipeline(
  apps,
  {
    searchTerm = null,
    targetVersion = null,
    selectedPaths = null,
    priorityVersion = null,
    onlyValid = true,
  } = {},
) {
  return await invoke("process_apps_pipeline", {
    params: {
      apps,
      search_term: searchTerm && searchTerm.trim() !== "" ? searchTerm : null,
      target_version: targetVersion,
      selected_paths: selectedPaths,
      priority_version: priorityVersion,
      only_valid: onlyValid,
    },
  });
}
