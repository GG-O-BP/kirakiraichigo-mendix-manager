import * as R from "ramda";
import { useState, useCallback, useEffect } from "react";
import {
  STORAGE_KEYS,
  loadFromStorage,
  saveToStorage,
  invokeCreateWidget,
  invokeValidateRequired,
} from "../utils";
import { filterWidgets, sortWidgetsByOrder, removeWidgetById } from "../utils/dataProcessing";
import { useCollection } from "./useCollection";

export function useWidgets() {
  const collection = useCollection({
    selectionStorageKey: STORAGE_KEYS.SELECTED_WIDGETS,
    getItemId: R.prop("id"),
  });

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
      collection.setItems(orderedWidgets);
    } catch (error) {
      console.error("Failed to load widgets:", error);
      collection.setItems([]);
    }
  }, [collection.setItems]);

  const handleAddWidget = useCallback(
    async (onSuccess) => {
      const isValid = invokeValidateRequired(["caption", "path"], {
        caption: newWidgetCaption,
        path: newWidgetPath,
      });

      if (!isValid) return;

      try {
        const newWidget = await invokeCreateWidget(newWidgetCaption, newWidgetPath);
        const updatedWidgets = R.append(newWidget, collection.items);

        await saveToStorage(STORAGE_KEYS.WIDGETS, updatedWidgets);
        collection.setItems(updatedWidgets);
        setNewWidgetCaption("");
        setNewWidgetPath("");
        R.when(R.complement(R.isNil), R.call)(onSuccess);
      } catch (error) {
        console.error("Failed to add widget:", error);
      }
    },
    [newWidgetCaption, newWidgetPath, collection.items, collection.setItems],
  );

  const handleWidgetDelete = useCallback(
    async (widgetToDelete) => {
      if (R.isNil(widgetToDelete)) {
        return false;
      }

      try {
        const widgetId = R.prop("id", widgetToDelete);
        const newWidgets = await removeWidgetById(collection.items, widgetId);
        collection.setItems(newWidgets);
        saveToStorage(STORAGE_KEYS.WIDGETS, newWidgets).catch(console.error);

        collection.removeFromSelection(widgetToDelete);

        return true;
      } catch (error) {
        console.error("Failed to delete widget:", error);
        return false;
      }
    },
    [collection.items, collection.setItems, collection.removeFromSelection],
  );

  // Save widgets when they change
  useEffect(() => {
    const saveWidgetsSequentially = async () => {
      if (R.complement(R.isEmpty)(collection.items)) {
        try {
          const widgetOrder = R.pluck("id", collection.items);
          await saveToStorage(STORAGE_KEYS.WIDGET_ORDER, widgetOrder);
          await saveToStorage(STORAGE_KEYS.WIDGETS, collection.items);
        } catch (error) {
          console.error("Failed to save widgets:", error);
        }
      }
    };
    saveWidgetsSequentially();
  }, [collection.items]);

  // Filter widgets effect
  useEffect(() => {
    const processWidgets = async () => {
      try {
        const searchTerm = R.defaultTo(null, collection.searchTerm);
        const filtered = await filterWidgets(collection.items, searchTerm);
        collection.setFilteredItems(filtered);
      } catch (error) {
        console.error("Failed to filter widgets:", error);
        collection.setFilteredItems(collection.items);
      }
    };

    R.ifElse(
      R.complement(R.isEmpty),
      processWidgets,
      () => collection.setFilteredItems([]),
    )(collection.items);
  }, [collection.items, collection.searchTerm]);

  return {
    widgets: collection.items,
    setWidgets: collection.setItems,
    filteredWidgets: collection.filteredItems,
    loadWidgets,
    widgetSearchTerm: collection.searchTerm,
    setWidgetSearchTerm: collection.setSearchTerm,
    selectedWidgets: collection.selectedItems,
    setSelectedWidgets: collection.setSelectedItems,
    newWidgetCaption,
    setNewWidgetCaption,
    newWidgetPath,
    setNewWidgetPath,
    handleAddWidget,
    handleWidgetDelete,
  };
}

export default useWidgets;
