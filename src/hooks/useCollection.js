import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useCollection({ selectionType, getItemId, defaultItems = [] }) {
  const [items, setItems] = useState(defaultItems);
  const [filteredItems, setFilteredItems] = useState(defaultItems);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState(new Set());

  const toggleSelection = useCallback(
    async (item) => {
      const itemId = getItemId(item);
      try {
        const result = await invoke("toggle_selection_with_save", {
          selectionType,
          itemId,
        });
        setSelectedItems(new Set(result));
      } catch (error) {
        console.error("Failed to toggle selection:", error);
      }
    },
    [selectionType, getItemId],
  );

  const isSelected = useCallback(
    (item) => {
      const itemId = getItemId(item);
      return selectedItems.has(itemId);
    },
    [selectedItems, getItemId],
  );

  const clearSelection = useCallback(async () => {
    try {
      await invoke("clear_selection_with_save", { selectionType });
      setSelectedItems(new Set());
    } catch (error) {
      console.error("Failed to clear selection:", error);
    }
  }, [selectionType]);

  const removeFromSelection = useCallback(
    async (item) => {
      const itemId = getItemId(item);
      try {
        const result = await invoke("remove_from_selection_with_save", {
          selectionType,
          itemId,
        });
        setSelectedItems(new Set(result));
      } catch (error) {
        console.error("Failed to remove from selection:", error);
      }
    },
    [selectionType, getItemId],
  );

  useEffect(() => {
    const initSelectionFromStorage = async () => {
      try {
        const storedItems = await invoke("init_selection_from_storage", {
          selectionType,
        });
        setSelectedItems(new Set(storedItems));
      } catch (error) {
        console.error("Failed to load selected items:", error);
      }
    };
    initSelectionFromStorage();
  }, [selectionType]);

  return {
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
    clearSelection,
    removeFromSelection,
  };
}
