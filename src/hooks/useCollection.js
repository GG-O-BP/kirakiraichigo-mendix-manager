import * as R from "ramda";
import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { saveToStorage, loadFromStorage } from "../utils";

export function useCollection({
  selectionStorageKey,
  getItemId,
  defaultItems = [],
}) {
  const [items, setItems] = useState(defaultItems);
  const [filteredItems, setFilteredItems] = useState(defaultItems);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState(new Set());

  const toggleSelection = useCallback(
    async (item) => {
      const itemId = getItemId(item);
      try {
        const currentArray = Array.from(selectedItems);
        const result = await invoke("collection_toggle_item", {
          items: currentArray,
          item: itemId,
        });
        const newSet = new Set(result);
        setSelectedItems(newSet);
        await saveToStorage(selectionStorageKey, result);
      } catch (error) {
        console.error("Failed to toggle selection:", error);
      }
    },
    [selectionStorageKey, getItemId, selectedItems],
  );

  const isSelected = useCallback(
    (item) => selectedItems.has(getItemId(item)),
    [selectedItems, getItemId],
  );

  const clearSelection = useCallback(async () => {
    setSelectedItems(new Set());
    await saveToStorage(selectionStorageKey, []);
  }, [selectionStorageKey]);

  const removeFromSelection = useCallback(
    async (item) => {
      const itemId = getItemId(item);
      try {
        const currentArray = Array.from(selectedItems);
        const result = await invoke("collection_remove_item", {
          items: currentArray,
          item: itemId,
        });
        const newSet = new Set(result);
        setSelectedItems(newSet);
        await saveToStorage(selectionStorageKey, result);
      } catch (error) {
        console.error("Failed to remove from selection:", error);
      }
    },
    [selectionStorageKey, getItemId, selectedItems],
  );

  useEffect(() => {
    const restoreSelectedItemsFromStorage = async () => {
      try {
        const selectedArray = await loadFromStorage(selectionStorageKey, []);
        setSelectedItems(new Set(selectedArray));
      } catch (error) {
        console.error("Failed to load selected items:", error);
      }
    };
    restoreSelectedItemsFromStorage();
  }, [selectionStorageKey]);

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
