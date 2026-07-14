import * as R from "ramda";
import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useArrayPropertyOperations(dynamicProperties, setDynamicProperties) {
  const executeArrayOperation = (operation, errorLabel) =>
    R.pipe(
      () =>
        invoke("manipulate_array_property", {
          properties: dynamicProperties,
          operation,
        }),
      R.andThen(setDynamicProperties),
      R.otherwise((error) => console.error(errorLabel, error)),
    )();

  const addArrayItem = useCallback(
    R.curry((propertyKey, defaultItem) =>
      executeArrayOperation(
        { type: "add", propertyKey, defaultItem },
        "Failed to add array item:",
      ),
    ),
    [dynamicProperties, setDynamicProperties]
  );

  const removeArrayItem = useCallback(
    R.curry((propertyKey, index) =>
      executeArrayOperation(
        { type: "remove", propertyKey, index },
        "Failed to remove array item:",
      ),
    ),
    [dynamicProperties, setDynamicProperties]
  );

  const updateArrayItemProperty = useCallback(
    R.curry((propertyKey, index, nestedKey, value) =>
      executeArrayOperation(
        { type: "update", propertyKey, index, nestedKey, value },
        "Failed to update array item property:",
      ),
    ),
    [dynamicProperties, setDynamicProperties]
  );

  return {
    addArrayItem,
    removeArrayItem,
    updateArrayItemProperty,
  };
}
