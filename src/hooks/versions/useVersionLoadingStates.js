import * as R from "ramda";
import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useVersionLoadingStates() {
  const [versionLoadingStates, setVersionLoadingStates] = useState({});

  const getLoadingStateSync = useCallback(
    (versionId) => {
      const state = versionLoadingStates[versionId];
      const noActiveOperations = { isLaunching: false, isUninstalling: false, isDownloading: false };

      if (!state) return noActiveOperations;

      const isActiveOperation = (operationType) =>
        state.operation === operationType && state.value;

      return {
        isLaunching: isActiveOperation("launch"),
        isUninstalling: isActiveOperation("uninstall"),
        isDownloading: isActiveOperation("download"),
      };
    },
    [versionLoadingStates],
  );

  const updateLoadingState = useCallback(
    async (versionId, operation, isLoading) => {
      try {
        const result = await invoke("set_version_operation", {
          versionId,
          operation,
          isActive: isLoading,
        });
        setVersionLoadingStates(result);
      } catch (error) {
        console.error("Failed to update version loading state:", error);
      }
    },
    [],
  );

  const isVersionBusy = useCallback(
    (versionId) => {
      const loadingState = getLoadingStateSync(versionId);
      return R.either(
        R.prop("isLaunching"),
        R.prop("isUninstalling"),
      )(loadingState);
    },
    [getLoadingStateSync],
  );

  return {
    getLoadingStateSync,
    updateLoadingState,
    isVersionBusy,
  };
}
