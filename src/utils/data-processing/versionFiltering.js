import { invoke } from "@tauri-apps/api/core";

export async function filterMendixVersions(
  versions,
  searchTerm = null,
  onlyValid = true,
) {
  return await invoke("filter_mendix_versions", {
    versions,
    searchTerm,
    onlyValid,
  });
}
