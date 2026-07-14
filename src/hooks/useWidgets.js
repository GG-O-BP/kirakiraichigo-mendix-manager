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
  const {
    items,
    setItems,
    filteredItems,
    setFilteredItems,
    searchTerm,
    setSearchTerm,
    selectedItems,
    setSelectedItems,
    toggleSelection,
    isSelected,
    removeFromSelection,
  } = useCollection({
    selectionType: "widgets",
    getItemId: R.prop("id"),
  });

  const {
    newWidgetCaption,
    setNewWidgetCaption,
    newWidgetPath,
    setNewWidgetPath,
    resetForm,
    isValid,
    errors,
  } = useWidgetForm();

  const { isLoading, mutate } = useSWR(SWR_KEYS.WIDGETS, fetchWidgets, {
    onSuccess: setItems,
  });

  const handleAddWidget = useCallback(
    (onSuccess) =>
      R.pipe(
        () =>
          invoke("validate_widget_input", {
            caption: newWidgetCaption,
            path: newWidgetPath,
          }),
        R.andThen(
          R.when(
            R.prop("isValid"),
            () =>
              R.pipe(
                () =>
                  invoke("add_widget_and_save", {
                    caption: newWidgetCaption,
                    path: newWidgetPath,
                  }),
                R.andThen((newWidget) =>
                  mutate(
                    (currentWidgets) => R.append(newWidget, R.defaultTo([], currentWidgets)),
                    false,
                  ),
                ),
                R.andThen(
                  R.pipe(
                    R.tap(() => resetForm()),
                    R.tap(() => R.when(R.isNotNil, R.call)(onSuccess)),
                  ),
                ),
              )(),
          ),
        ),
        R.otherwise((err) => console.error("Failed to add widget:", err)),
      )(),
    [newWidgetCaption, newWidgetPath, resetForm, mutate],
  );

  const handleWidgetDelete = useCallback(
    (widgetToDelete) =>
      R.pipe(
        () => invoke("validate_widget_for_delete", { widget: widgetToDelete }),
        R.andThen(
          R.ifElse(
            R.identity,
            () =>
              R.pipe(
                () =>
                  invoke("delete_widget_and_save", {
                    widgetId: R.prop("id", widgetToDelete),
                  }),
                R.andThen((newWidgets) => mutate(newWidgets, false)),
                R.andThen(
                  R.pipe(
                    R.tap(() => removeFromSelection(widgetToDelete)),
                    R.always(true),
                  ),
                ),
              )(),
            R.always(false),
          ),
        ),
        R.otherwise(
          R.pipe(
            R.tap((err) => console.error("Failed to delete widget:", err)),
            R.always(false),
          ),
        ),
      )(),
    [mutate, removeFromSelection],
  );

  useEffect(() => {
    R.when(
      R.isNotEmpty,
      (widgetItems) =>
        R.pipe(
          () => saveToStorage(STORAGE_KEYS.WIDGET_ORDER, R.pluck("id", widgetItems)),
          R.andThen(() => saveToStorage(STORAGE_KEYS.WIDGETS, widgetItems)),
          R.otherwise((err) => console.error("Failed to save widgets:", err)),
        )(),
    )(items);
  }, [items]);

  useEffect(() => {
    const filterWidgetsBySearchTerm = () =>
      R.pipe(
        () => processWidgetsPipeline(items, { searchTerm }),
        R.andThen(setFilteredItems),
        R.otherwise(
          R.pipe(
            R.tap((err) => console.error("Failed to filter widgets:", err)),
            () => setFilteredItems(items),
          ),
        ),
      )();

    R.ifElse(
      R.isNotEmpty,
      filterWidgetsBySearchTerm,
      () => setFilteredItems([]),
    )(items);
  }, [items, searchTerm]);

  return {
    widgets: items,
    setWidgets: setItems,
    filteredWidgets: filteredItems,
    loadWidgets: mutate,
    widgetSearchTerm: searchTerm,
    setWidgetSearchTerm: setSearchTerm,
    selectedWidgets: selectedItems,
    setSelectedWidgets: setSelectedItems,
    toggleWidgetSelection: toggleSelection,
    isWidgetSelected: isSelected,
    newWidgetCaption,
    setNewWidgetCaption,
    newWidgetPath,
    setNewWidgetPath,
    resetForm,
    isFormValid: isValid,
    formErrors: errors,
    handleAddWidget,
    handleWidgetDelete,
    isLoading,
  };
}
