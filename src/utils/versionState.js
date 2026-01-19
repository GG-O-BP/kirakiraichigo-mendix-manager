import * as R from "ramda";
import { VERSION_OPERATIONS } from "./constants";

const createVersionLoadingState = R.curry(
  (versionId, operation, isActive) => ({
    versionId,
    operation,
    value: isActive,
    timestamp: Date.now(),
  }),
);

export const updateVersionLoadingStates = R.curry(
  (versionId, operation, isActive, statesMap) =>
    R.pipe(
      R.assoc(
        versionId,
        createVersionLoadingState(versionId, operation, isActive),
      ),
      R.when(() => !isActive, R.dissoc(versionId)),
    )(statesMap),
);

export const getVersionLoadingState = R.curry((statesMap, versionId) => {
  const state = statesMap[versionId];
  const noActiveOperations = { isLaunching: false, isUninstalling: false, isDownloading: false };

  if (!state) return noActiveOperations;

  const isActiveOperation = (operationType) =>
    state.operation === operationType && state.value;

  return {
    isLaunching: isActiveOperation(VERSION_OPERATIONS.LAUNCH),
    isUninstalling: isActiveOperation(VERSION_OPERATIONS.UNINSTALL),
    isDownloading: isActiveOperation(VERSION_OPERATIONS.DOWNLOAD),
  };
});
