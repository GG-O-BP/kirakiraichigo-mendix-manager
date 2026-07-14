import * as R from "ramda";
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
    (versionId, operation, isLoading) =>
      R.pipe(
        () =>
          invoke("set_version_operation", {
            versionId,
            operation,
            isActive: isLoading,
          }),
        R.andThen(setVersionLoadingStates),
        R.otherwise((error) => console.error("Failed to update version loading state:", error)),
      )(),
    [setVersionLoadingStates],
  );

  return {
    getLoadingStateSync,
    updateLoadingState,
    isVersionBusy,
  };
}
