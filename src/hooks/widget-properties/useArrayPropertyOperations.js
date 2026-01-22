import * as R from "ramda";
import { useCallback } from "react";

export function useArrayPropertyOperations(setDynamicProperties) {
  const addArrayItem = useCallback(
    R.curry((propertyKey, defaultItem) =>
      setDynamicProperties(
        R.over(
          R.lensProp(propertyKey),
          R.pipe(
            R.defaultTo([]),
            R.append(defaultItem)
          )
        )
      )
    ),
    [setDynamicProperties]
  );

  const removeArrayItem = useCallback(
    R.curry((propertyKey, index) =>
      setDynamicProperties(
        R.over(
          R.lensProp(propertyKey),
          R.pipe(
            R.defaultTo([]),
            R.remove(index, 1)
          )
        )
      )
    ),
    [setDynamicProperties]
  );

  const updateArrayItemProperty = useCallback(
    R.curry((propertyKey, index, nestedKey, value) =>
      setDynamicProperties(
        R.over(
          R.lensPath([propertyKey, index, nestedKey]),
          R.always(value)
        )
      )
    ),
    [setDynamicProperties]
  );

  return {
    addArrayItem,
    removeArrayItem,
    updateArrayItemProperty,
  };
}
