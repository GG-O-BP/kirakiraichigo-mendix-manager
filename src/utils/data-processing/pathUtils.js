import { invoke } from "@tauri-apps/api/core";

export async function extractFolderNameFromPath(path) {
  return await invoke("extract_folder_name_from_path", { path });
}
