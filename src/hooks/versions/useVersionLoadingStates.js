import * as R from "ramda";
import { useState, useCallback } from "react";
import {
  updateVersionLoadingStates,
  getVersionLoadingState,
} from "../../utils";

export function useVersionLoadingStates() {
  const [versionLoadingStates, setVersionLoadingStates] = useState({});

  const getLoadingState = useCallback(
    (versionId) => getVersionLoadingState(versionLoadingStates, versionId),
    [versionLoadingStates],
  );

  const updateLoadingState = useCallback(
    (versionId, operation, isLoading) =>
      setVersionLoadingStates((prev) =>
        updateVersionLoadingStates(versionId, operation, isLoading, prev),
      ),
    [],
  );

  const isVersionBusy = useCallback(
    (versionId) => {
      const loadingState = getVersionLoadingState(versionLoadingStates, versionId);
      return R.either(
        R.prop("isLaunching"),
        R.prop("isUninstalling"),
      )(loadingState);
    },
    [versionLoadingStates],
  );

  return {
    versionLoadingStates,
    setVersionLoadingStates,
    getLoadingState,
    updateLoadingState,
    isVersionBusy,
  };
}
