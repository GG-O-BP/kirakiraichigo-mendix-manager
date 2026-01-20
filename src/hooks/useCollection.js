import * as R from "ramda";
import { useState, useCallback, useEffect } from "react";
import { saveToStorage, loadFromStorage, arrayToSet } from "../utils";

export function useCollection({
  selectionStorageKey,
  getItemId,
  defaultItems = [],
}) {
  const [items, setItems] = useState(defaultItems);
  const [filteredItems, setFilteredItems] = useState(defaultItems);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState(new Set());

  const createToggledSet = R.curry((item, set) => {
    const newSet = new Set(set);
    R.ifElse(
      () => newSet.has(item),
      () => newSet.delete(item),
      () => newSet.add(item),
    )();
    return newSet;
  });

  const toggleSelection = useCallback(
    (item) => {
      const itemId = getItemId(item);
      setSelectedItems((prev) => {
        const newSet = createToggledSet(itemId, prev);
        const newArray = Array.from(newSet);
        saveToStorage(selectionStorageKey, newArray).catch(console.error);
        return newSet;
      });
    },
    [selectionStorageKey, getItemId],
  );

  const isSelected = useCallback(
    (item) => selectedItems.has(getItemId(item)),
    [selectedItems, getItemId],
  );

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
    saveToStorage(selectionStorageKey, []).catch(console.error);
  }, [selectionStorageKey]);

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

  useEffect(() => {
    const restoreSelectedItemsFromStorage = async () => {
      try {
        const selectedArray = await loadFromStorage(selectionStorageKey, []);
        setSelectedItems(arrayToSet(selectedArray));
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
