import * as R from "ramda";
import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useArrayPropertyOperations(dynamicProperties, setDynamicProperties) {
  const addArrayItem = useCallback(
    R.curry(async (propertyKey, defaultItem) => {
      try {
        const result = await invoke("manipulate_array_property", {
          properties: dynamicProperties,
          operation: {
            type: "add",
            propertyKey,
            defaultItem,
          },
        });
        setDynamicProperties(result);
      } catch (error) {
        console.error("Failed to add array item:", error);
      }
    }),
    [dynamicProperties, setDynamicProperties]
  );

  const removeArrayItem = useCallback(
    R.curry(async (propertyKey, index) => {
      try {
        const result = await invoke("manipulate_array_property", {
          properties: dynamicProperties,
          operation: {
            type: "remove",
            propertyKey,
            index,
          },
        });
        setDynamicProperties(result);
      } catch (error) {
        console.error("Failed to remove array item:", error);
      }
    }),
    [dynamicProperties, setDynamicProperties]
  );

  const updateArrayItemProperty = useCallback(
    R.curry(async (propertyKey, index, nestedKey, value) => {
      try {
        const result = await invoke("manipulate_array_property", {
          properties: dynamicProperties,
          operation: {
            type: "update",
            propertyKey,
            index,
            nestedKey,
            value,
          },
        });
        setDynamicProperties(result);
      } catch (error) {
        console.error("Failed to update array item property:", error);
      }
    }),
    [dynamicProperties, setDynamicProperties]
  );

  return {
    addArrayItem,
    removeArrayItem,
    updateArrayItemProperty,
  };
}
