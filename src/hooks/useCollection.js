import * as R from "ramda";
import { useState, useCallback, useEffect } from "react";
import { saveToStorage, loadFromStorage, arrayToSet } from "../utils";

/**
 * Generic collection hook for managing items with selection, filtering, and persistence.
 *
 * @param {Object} config - Configuration object
 * @param {string} config.selectionStorageKey - Storage key for persisting selected items
 * @param {function} config.getItemId - Function to extract unique ID from an item
 * @param {*} [config.defaultItems=[]] - Default items when none are loaded
 * @returns {Object} Collection state and handlers
 */
export function useCollection({
  selectionStorageKey,
  getItemId,
  defaultItems = [],
}) {
  const [items, setItems] = useState(defaultItems);
  const [filteredItems, setFilteredItems] = useState(defaultItems);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState(new Set());

  // Toggle item in Set helper
  const toggleSetItem = R.curry((item, set) => {
    const newSet = new Set(set);
    R.ifElse(
      () => newSet.has(item),
      () => newSet.delete(item),
      () => newSet.add(item),
    )();
    return newSet;
  });

  // Toggle selection with persistence
  const toggleSelection = useCallback(
    (item) => {
      const itemId = getItemId(item);
      setSelectedItems((prev) => {
        const newSet = toggleSetItem(itemId, prev);
        const newArray = Array.from(newSet);
        saveToStorage(selectionStorageKey, newArray).catch(console.error);
        return newSet;
      });
    },
    [selectionStorageKey, getItemId],
  );

  // Check if item is selected
  const isSelected = useCallback(
    (item) => selectedItems.has(getItemId(item)),
    [selectedItems, getItemId],
  );

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
    saveToStorage(selectionStorageKey, []).catch(console.error);
  }, [selectionStorageKey]);

  // Remove item from selection (used when item is deleted)
  const removeFromSelection = useCallback(
    (item) => {
      const itemId = getItemId(item);
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        R.when(
          () => newSet.has(itemId),
          () => {
            newSet.delete(itemId);
            saveToStorage(selectionStorageKey, Array.from(newSet)).catch(console.error);
          },
        )();
        return newSet;
      });
    },
    [selectionStorageKey, getItemId],
  );

  // Load selected items from storage on mount
  useEffect(() => {
    const loadSelectedItems = async () => {
      try {
        const selectedArray = await loadFromStorage(selectionStorageKey, []);
        setSelectedItems(arrayToSet(selectedArray));
      } catch (error) {
        console.error("Failed to load selected items:", error);
      }
    };
    loadSelectedItems();
  }, [selectionStorageKey]);

  return {
    // State
    items,
    setItems,
    filteredItems,
    setFilteredItems,
    searchTerm,
    setSearchTerm,
    selectedItems,
    setSelectedItems,

    // Handlers
    toggleSelection,
    isSelected,
    clearSelection,
    removeFromSelection,
  };
}
