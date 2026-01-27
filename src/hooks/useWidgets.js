import * as R from "ramda";
import { useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { STORAGE_KEYS, saveToStorage } from "../utils";
import { processWidgetsPipeline } from "../utils/data-processing/widgetFiltering";
import { useCollection } from "./useCollection";
import { useWidgetForm } from "./useWidgetForm";

export function useWidgets() {
  const collection = useCollection({
    selectionStorageKey: STORAGE_KEYS.SELECTED_WIDGETS,
    getItemId: R.prop("id"),
  });

  const form = useWidgetForm();

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
      try {
        const validation = await invoke("validate_widget_input", {
          caption: form.newWidgetCaption,
          path: form.newWidgetPath,
        });

        if (!validation.isValid) return;

        const newWidget = await invoke("add_widget_and_save", {
          caption: form.newWidgetCaption,
          path: form.newWidgetPath,
        });
        const updatedWidgets = R.append(newWidget, collection.items);
        collection.setItems(updatedWidgets);
        form.resetForm();
        R.when(R.complement(R.isNil), R.call)(onSuccess);
      } catch (error) {
        console.error("Failed to add widget:", error);
      }
    },
    [form.newWidgetCaption, form.newWidgetPath, form.resetForm, collection.items, collection.setItems],
  );

  const handleWidgetDelete = useCallback(
    async (widgetToDelete) => {
      try {
        const canDelete = await invoke("validate_widget_for_delete", {
          widget: widgetToDelete,
        });

        if (!canDelete) {
          return false;
        }

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
        const filtered = await processWidgetsPipeline(collection.items, {
          searchTerm: collection.searchTerm,
        });
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
    newWidgetCaption: form.newWidgetCaption,
    setNewWidgetCaption: form.setNewWidgetCaption,
    newWidgetPath: form.newWidgetPath,
    setNewWidgetPath: form.setNewWidgetPath,
    handleAddWidget,
    handleWidgetDelete,
  };
}
