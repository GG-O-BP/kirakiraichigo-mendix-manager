import * as R from "ramda";
import { useState, useCallback } from "react";
import { setProperty } from "../utils";

export function useWidgetPreview() {
  const [widgetPreviewSearch, setWidgetPreviewSearch] = useState("");
  const [selectedWidgetForPreview, setSelectedWidgetForPreview] = useState(null);
  const [properties, setProperties] = useState({});

  const updateProperty = useCallback(
    R.curry((key, value) => setProperties(setProperty(key, value))),
    [],
  );

  return {
    widgetPreviewSearch,
    setWidgetPreviewSearch,
    selectedWidgetForPreview,
    setSelectedWidgetForPreview,
    properties,
    updateProperty,
  };
}
