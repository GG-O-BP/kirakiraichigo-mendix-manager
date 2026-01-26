import * as R from "ramda";
import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useDownloadOperation({ updateLoadingState, onLoadVersions }) {
  const handleModalDownload = useCallback(
    async (version) => {
      const versionId = R.prop("version", version);
      try {
        updateLoadingState(versionId, "download", true);

        const result = await invoke("download_and_install_mendix_version", {
          version: versionId,
        });

        await onLoadVersions();

        return result;
      } catch (error) {
        console.error("Error in download process:", error);
        throw error;
      } finally {
        updateLoadingState(versionId, "download", false);
      }
    },
    [updateLoadingState, onLoadVersions],
  );

  return {
    handleModalDownload,
  };
}
