import * as R from "ramda";
import { useState, useCallback } from "react";
import { setProperty } from "../utils/functional";

export function useWidgetPreview() {
  const [widgetPreviewSearch, setWidgetPreviewSearch] = useState("");
  const [selectedWidgetForPreview, setSelectedWidgetForPreview] = useState(null);
  const [properties, setProperties] = useState({});

  const updateProperty = useCallback(
    R.curry((key, value) => setProperties(setProperty(key, value))),
    [],
  );

  const resetProperties = useCallback(() => {
    setProperties({});
  }, []);

  return {
    widgetPreviewSearch,
    setWidgetPreviewSearch,
    selectedWidgetForPreview,
    setSelectedWidgetForPreview,
    properties,
    setProperties,
    updateProperty,
    resetProperties,
  };
}

export default useWidgetPreview;
