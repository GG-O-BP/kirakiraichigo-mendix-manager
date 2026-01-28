import { useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import {
  versionLoadingStatesAtom,
  getLoadingStateSyncAtom,
  isVersionBusyAtom,
} from "../../atoms";

export function useVersionLoadingStates() {
  const [, setVersionLoadingStates] = useAtom(versionLoadingStatesAtom);
  const getLoadingStateSync = useAtomValue(getLoadingStateSyncAtom);
  const isVersionBusy = useAtomValue(isVersionBusyAtom);

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
    [setVersionLoadingStates],
  );

  return {
    getLoadingStateSync,
    updateLoadingState,
    isVersionBusy,
  };
}
