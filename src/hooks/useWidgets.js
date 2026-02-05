import * as R from "ramda";
import { useCallback, useEffect } from "react";
import useSWR from "swr";
import { invoke } from "@tauri-apps/api/core";
import { STORAGE_KEYS, saveToStorage } from "../utils";
import { SWR_KEYS } from "../lib/swr";
import { processWidgetsPipeline } from "../utils/data-processing/widgetFiltering";
import { useCollection } from "./useCollection";
import { useWidgetForm } from "./useWidgetForm";

const fetchWidgets = () => invoke("load_widgets_ordered");

export function useWidgets() {
  const collection = useCollection({
    selectionType: "widgets",
    getItemId: R.prop("id"),
  });

  const form = useWidgetForm();

  const {
    data: widgets = [],
    isLoading,
    mutate,
  } = useSWR(SWR_KEYS.WIDGETS, fetchWidgets, {
    onSuccess: collection.setItems,
  });

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

        await mutate(
          (currentWidgets) => R.append(newWidget, currentWidgets || []),
          false,
        );

        form.resetForm();
        R.when(R.complement(R.isNil), R.call)(onSuccess);
      } catch (err) {
        console.error("Failed to add widget:", err);
      }
    },
    [form.newWidgetCaption, form.newWidgetPath, form.resetForm, mutate],
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

        await mutate(newWidgets, false);
        collection.removeFromSelection(widgetToDelete);

        return true;
      } catch (err) {
        console.error("Failed to delete widget:", err);
        return false;
      }
    },
    [mutate, collection.removeFromSelection],
  );

  useEffect(() => {
    const saveWidgetsSequentially = async () => {
      if (R.complement(R.isEmpty)(collection.items)) {
        try {
          const widgetOrder = R.pluck("id", collection.items);
          await saveToStorage(STORAGE_KEYS.WIDGET_ORDER, widgetOrder);
          await saveToStorage(STORAGE_KEYS.WIDGETS, collection.items);
        } catch (err) {
          console.error("Failed to save widgets:", err);
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
      } catch (err) {
        console.error("Failed to filter widgets:", err);
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
    loadWidgets: mutate,
    widgetSearchTerm: collection.searchTerm,
    setWidgetSearchTerm: collection.setSearchTerm,
    selectedWidgets: collection.selectedItems,
    setSelectedWidgets: collection.setSelectedItems,
    toggleWidgetSelection: collection.toggleSelection,
    isWidgetSelected: collection.isSelected,
    newWidgetCaption: form.newWidgetCaption,
    setNewWidgetCaption: form.setNewWidgetCaption,
    newWidgetPath: form.newWidgetPath,
    setNewWidgetPath: form.setNewWidgetPath,
    resetForm: form.resetForm,
    isFormValid: form.isValid,
    formErrors: form.errors,
    handleAddWidget,
    handleWidgetDelete,
    isLoading,
  };
}
