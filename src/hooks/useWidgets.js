import * as R from "ramda";
import { useState, useCallback, useEffect } from "react";
import {
  STORAGE_KEYS,
  loadFromStorage,
  saveToStorage,
  arrayToSet,
  createWidget,
  invokeValidateRequired,
} from "../utils/functional";
import { filterWidgets, sortWidgetsByOrder, removeWidgetById } from "../utils/dataProcessing";

export function useWidgets() {
  const [widgets, setWidgets] = useState([]);
  const [filteredWidgets, setFilteredWidgets] = useState([]);
  const [widgetSearchTerm, setWidgetSearchTerm] = useState("");
  const [selectedWidgets, setSelectedWidgets] = useState(new Set());
  const [newWidgetCaption, setNewWidgetCaption] = useState("");
  const [newWidgetPath, setNewWidgetPath] = useState("");

  const loadWidgets = useCallback(async () => {
    try {
      const savedWidgets = await loadFromStorage(STORAGE_KEYS.WIDGETS, []);
      const savedOrder = await loadFromStorage(STORAGE_KEYS.WIDGET_ORDER, []);

      const processWidgets = R.ifElse(
        R.complement(R.isEmpty),
        () => sortWidgetsByOrder(savedWidgets, savedOrder),
        R.always(Promise.resolve(savedWidgets)),
      );

      const orderedWidgets = await processWidgets(savedOrder);
      setWidgets(orderedWidgets);
    } catch (error) {
      console.error("Failed to load widgets:", error);
      setWidgets([]);
    }
  }, []);

  const handleAddWidget = useCallback(
    (onSuccess) => {
      const isValid = invokeValidateRequired(["caption", "path"], {
        caption: newWidgetCaption,
        path: newWidgetPath,
      });

      R.when(R.always(isValid), () => {
        const newWidget = createWidget(newWidgetCaption, newWidgetPath);
        const updatedWidgets = R.append(newWidget, widgets);

        saveToStorage(STORAGE_KEYS.WIDGETS, updatedWidgets)
          .then(() => {
            setWidgets(updatedWidgets);
            setNewWidgetCaption("");
            setNewWidgetPath("");
            R.when(R.complement(R.isNil), R.call)(onSuccess);
          })
          .catch(console.error);
      })();
    },
    [newWidgetCaption, newWidgetPath, widgets],
  );

  const handleWidgetDelete = useCallback(
    async (widgetToDelete) => {
      if (R.isNil(widgetToDelete)) {
        return false;
      }

      try {
        const widgetId = R.prop("id", widgetToDelete);
        const newWidgets = await removeWidgetById(widgets, widgetId);
        setWidgets(newWidgets);
        saveToStorage(STORAGE_KEYS.WIDGETS, newWidgets).catch(console.error);

        setSelectedWidgets((prevSelected) => {
          const newSet = new Set(prevSelected);
          newSet.delete(widgetId);
          const newArray = Array.from(newSet);
          saveToStorage(STORAGE_KEYS.SELECTED_WIDGETS, newArray).catch(console.error);
          return newSet;
        });

        return true;
      } catch (error) {
        console.error("Failed to delete widget:", error);
        return false;
      }
    },
    [widgets],
  );

  useEffect(() => {
    const saveWidgetsSequentially = async () => {
      if (R.complement(R.isEmpty)(widgets)) {
        try {
          const widgetOrder = R.pluck("id", widgets);
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
        const searchTerm = R.defaultTo(null, widgetSearchTerm);
        const filtered = await filterWidgets(widgets, searchTerm);
        setFilteredWidgets(filtered);
      } catch (error) {
        console.error("Failed to filter widgets:", error);
        setFilteredWidgets(widgets);
      }
    };

    R.ifElse(
      R.complement(R.isEmpty),
      processWidgets,
      () => setFilteredWidgets([]),
    )(widgets);
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
    selectedWidgets,
    setSelectedWidgets,
    newWidgetCaption,
    setNewWidgetCaption,
    newWidgetPath,
    setNewWidgetPath,
    handleAddWidget,
    handleWidgetDelete,
  };
}

export default useWidgets;
