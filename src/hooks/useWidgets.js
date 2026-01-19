import * as R from "ramda";
import { useState, useCallback, useEffect } from "react";
import {
  STORAGE_KEYS,
  loadFromStorage,
  saveToStorage,
  arrayToSet,
  createWidget,
  invokeValidateRequired,
  setProperty,
} from "../utils/functional";
import { filterWidgets, sortWidgetsByOrder, removeWidgetById } from "../utils/dataProcessing";

export function useWidgets() {
  const [widgets, setWidgets] = useState([]);
  const [filteredWidgets, setFilteredWidgets] = useState([]);
  const [widgetSearchTerm, setWidgetSearchTerm] = useState("");
  const [widgetPreviewSearch, setWidgetPreviewSearch] = useState("");
  const [selectedWidgets, setSelectedWidgets] = useState(new Set());
  const [selectedWidgetForPreview, setSelectedWidgetForPreview] = useState(null);
  const [newWidgetCaption, setNewWidgetCaption] = useState("");
  const [newWidgetPath, setNewWidgetPath] = useState("");
  const [properties, setProperties] = useState({});

  const loadWidgets = useCallback(async () => {
    try {
      const savedWidgets = await loadFromStorage(STORAGE_KEYS.WIDGETS, []);
      const savedOrder = await loadFromStorage(STORAGE_KEYS.WIDGET_ORDER, []);

      if (savedOrder.length > 0) {
        const orderedWidgets = await sortWidgetsByOrder(savedWidgets, savedOrder);
        setWidgets(orderedWidgets);
      } else {
        setWidgets(savedWidgets);
      }
    } catch (error) {
      console.error("Failed to load widgets:", error);
      setWidgets([]);
    }
  }, []);

  const updateProperty = useCallback(
    R.curry((key, value) => setProperties(setProperty(key, value))),
    [],
  );

  const handleAddWidget = useCallback(
    (onSuccess) => {
      if (
        invokeValidateRequired(["caption", "path"], {
          caption: newWidgetCaption,
          path: newWidgetPath,
        })
      ) {
        const newWidget = createWidget(newWidgetCaption, newWidgetPath);
        const updatedWidgets = [...widgets, newWidget];

        saveToStorage(STORAGE_KEYS.WIDGETS, updatedWidgets)
          .then(() => {
            setWidgets(updatedWidgets);
            setNewWidgetCaption("");
            setNewWidgetPath("");
            if (onSuccess) onSuccess();
          })
          .catch(console.error);
      }
    },
    [newWidgetCaption, newWidgetPath, widgets],
  );

  const handleWidgetDelete = useCallback(
    async (widgetToDelete) => {
      if (widgetToDelete) {
        try {
          const newWidgets = await removeWidgetById(widgets, widgetToDelete.id);
          setWidgets(newWidgets);
          saveToStorage(STORAGE_KEYS.WIDGETS, newWidgets).catch(console.error);

          setSelectedWidgets((prevSelected) => {
            const newSet = new Set(prevSelected);
            newSet.delete(widgetToDelete.id);
            const newArray = Array.from(newSet);
            saveToStorage(STORAGE_KEYS.SELECTED_WIDGETS, newArray).catch(
              console.error,
            );
            return newSet;
          });

          return true;
        } catch (error) {
          console.error("Failed to delete widget:", error);
          return false;
        }
      }
      return false;
    },
    [widgets],
  );

  useEffect(() => {
    const saveWidgetsSequentially = async () => {
      if (widgets.length > 0) {
        try {
          const widgetOrder = widgets.map((w) => w.id);
          await saveToStorage(STORAGE_KEYS.WIDGET_ORDER, widgetOrder);
          await saveToStorage(STORAGE_KEYS.WIDGETS, widgets);
        } catch (error) {
          console.error("Failed to save widgets:", error);
        }
      }
    };
    saveWidgetsSequentially();
  }, [widgets]);

  useEffect(() => {
    const processWidgets = async () => {
      try {
        const filtered = await filterWidgets(widgets, widgetSearchTerm || null);
        setFilteredWidgets(filtered);
      } catch (error) {
        console.error("Failed to filter widgets:", error);
        setFilteredWidgets(widgets);
      }
    };

    if (widgets && widgets.length > 0) {
      processWidgets();
    } else {
      setFilteredWidgets([]);
    }
  }, [widgets, widgetSearchTerm]);

  useEffect(() => {
    const loadSelectedWidgets = async () => {
      try {
        const selectedWidgetsArray = await loadFromStorage(STORAGE_KEYS.SELECTED_WIDGETS, []);
        setSelectedWidgets(arrayToSet(selectedWidgetsArray));
      } catch (error) {
        console.error("Failed to load selected widgets:", error);
      }
    };
    loadSelectedWidgets();
  }, []);

  return {
    widgets,
    setWidgets,
    filteredWidgets,
    loadWidgets,
    widgetSearchTerm,
    setWidgetSearchTerm,
    widgetPreviewSearch,
    setWidgetPreviewSearch,
    selectedWidgets,
    setSelectedWidgets,
    selectedWidgetForPreview,
    setSelectedWidgetForPreview,
    newWidgetCaption,
    setNewWidgetCaption,
    newWidgetPath,
    setNewWidgetPath,
    handleAddWidget,
    handleWidgetDelete,
    properties,
    updateProperty,
  };
}

export default useWidgets;
