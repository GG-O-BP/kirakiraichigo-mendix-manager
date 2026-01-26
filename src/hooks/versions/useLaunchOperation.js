import * as R from "ramda";
import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

const LAUNCH_LOADING_RESET_DELAY_MS = 60000;

export function useLaunchOperation({ updateLoadingState, isVersionBusy }) {
  const handleLaunchStudioPro = useCallback(
    async (version) => {
      const versionId = R.prop("version", version);

      if (isVersionBusy(versionId)) {
        return;
      }

      updateLoadingState(versionId, "launch", true);

      try {
        await invoke("launch_studio_pro", {
          version: version.version,
        });
        setTimeout(() => {
          updateLoadingState(versionId, "launch", false);
        }, LAUNCH_LOADING_RESET_DELAY_MS);
      } catch (error) {
        alert(`Failed to launch Studio Pro: ${error}`);
        updateLoadingState(versionId, "launch", false);
      }
    },
    [updateLoadingState, isVersionBusy],
  );

  return {
    handleLaunchStudioPro,
  };
}
