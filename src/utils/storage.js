import * as R from "ramda";
import { invoke } from "@tauri-apps/api/core";

const createStorageResult = R.curry((success, data, error = null) => ({
  success,
  data,
  error,
}));

const handleStorageSuccess = R.curry((data) => createStorageResult(true, data));

const handleStorageError = R.curry((defaultValue, error) => {
  console.error("Storage operation failed:", error);
  return createStorageResult(false, defaultValue, error);
});

const extractStorageData = R.prop("data");

const invokeSaveToStorage = R.curry((key, data) =>
  invoke("save_to_storage", { key, data }),
);

const invokeLoadFromStorage = R.curry((key, defaultValue) =>
  invoke("load_from_storage", { key, defaultValue }),
);

export const saveToStorage = R.curry((key, value) =>
  R.pipe(
    () => invokeSaveToStorage(key, value),
    R.andThen(handleStorageSuccess),
    R.andThen(extractStorageData),
    R.otherwise(R.pipe(handleStorageError(value), extractStorageData)),
  )(),
);

export const loadFromStorage = R.curry((key, defaultValue) =>
  R.pipe(
    () => invokeLoadFromStorage(key, defaultValue),
    R.andThen(handleStorageSuccess),
    R.andThen(extractStorageData),
    R.otherwise(R.pipe(handleStorageError(defaultValue), extractStorageData)),
  )(),
);
