import * as R from "ramda";
import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { STORAGE_KEYS, saveToStorage } from "../utils";
import { filterWidgets } from "../utils/data-processing/widgetFiltering";
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
      const orderedWidgets = await invoke("load_widgets_ordered");
      collection.setItems(orderedWidgets);
    } catch (error) {
      console.error("Failed to load widgets:", error);
      collection.setItems([]);
    }
  }, [collection.setItems]);

  const handleAddWidget = useCallback(
    async (onSuccess) => {
      const isValid = R.all(R.complement(R.isEmpty), [newWidgetCaption, newWidgetPath]);
      if (!isValid) return;

      try {
        const newWidget = await invoke("add_widget_and_save", {
          caption: newWidgetCaption,
          path: newWidgetPath,
        });
        const updatedWidgets = R.append(newWidget, collection.items);
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
        const newWidgets = await invoke("delete_widget_and_save", { widgetId });
        collection.setItems(newWidgets);
        collection.removeFromSelection(widgetToDelete);

        return true;
      } catch (error) {
        console.error("Failed to delete widget:", error);
        return false;
      }
    },
    [collection.setItems, collection.removeFromSelection],
  );

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

  useEffect(() => {
    const filterWidgetsBySearchTerm = async () => {
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
      filterWidgetsBySearchTerm,
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
