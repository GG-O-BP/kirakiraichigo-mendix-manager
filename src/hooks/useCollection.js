import * as R from "ramda";
import { useState, useCallback, useMemo } from "react";
import { useAtom } from "jotai";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { invoke } from "@tauri-apps/api/core";
import { SWR_KEYS } from "../lib/swr";
import { searchTermAtomFamily, filteredItemsAtomFamily } from "../atoms/collection";

const fetchSelection = async (key) => {
  const selectionType = key[1];
  const storedItems = await invoke("init_selection_from_storage", {
    selectionType,
  });
  return storedItems;
};

const toggleSelectionMutation = async (_, { arg }) => {
  const { selectionType, itemId } = arg;
  const result = await invoke("toggle_selection_with_save", {
    selectionType,
    itemId,
  });
  return result;
};

const removeFromSelectionMutation = async (_, { arg }) => {
  const { selectionType, itemId } = arg;
  const result = await invoke("remove_from_selection_with_save", {
    selectionType,
    itemId,
  });
  return result;
};

export function useCollection({ selectionType, getItemId, defaultItems = [] }) {
  const [items, setItems] = useState(defaultItems);
  const [searchTerm, setSearchTerm] = useAtom(searchTermAtomFamily(selectionType));
  const [filteredItems, setFilteredItems] = useAtom(filteredItemsAtomFamily(selectionType));

  const {
    data: selectedItemsArray = [],
    mutate: mutateSelectedItems,
  } = useSWR(SWR_KEYS.SELECTION(selectionType), fetchSelection);

  const selectedItems = useMemo(
    () => new Set(selectedItemsArray),
    [selectedItemsArray],
  );

  const setSelectedItems = useCallback(
    (value) => {
      const arrayValue = R.cond([
        [R.is(Set), (v) => Array.from(v)],
        [R.is(Array), R.identity],
        [R.T, R.always([])],
      ])(value);
      return mutateSelectedItems(arrayValue, { revalidate: false });
    },
    [mutateSelectedItems],
  );

  const { trigger: triggerToggle } = useSWRMutation(
    `toggle-selection-${selectionType}`,
    toggleSelectionMutation,
  );

  const { trigger: triggerRemove } = useSWRMutation(
    `remove-selection-${selectionType}`,
    removeFromSelectionMutation,
  );

  const toggleSelection = useCallback(
    async (item) => {
      const itemId = getItemId(item);
      try {
        const result = await triggerToggle({ selectionType, itemId });
        mutateSelectedItems(result, { revalidate: false });
      } catch (error) {
        console.error("Failed to toggle selection:", error);
      }
    },
    [selectionType, getItemId, triggerToggle, mutateSelectedItems],
  );

  const isSelected = useCallback(
    (item) => {
      const itemId = getItemId(item);
      return selectedItems.has(itemId);
    },
    [selectedItems, getItemId],
  );

  const removeFromSelection = useCallback(
    async (item) => {
      const itemId = getItemId(item);
      try {
        const result = await triggerRemove({ selectionType, itemId });
        mutateSelectedItems(result, { revalidate: false });
      } catch (error) {
        console.error("Failed to remove from selection:", error);
      }
    },
    [selectionType, getItemId, triggerRemove, mutateSelectedItems],
  );

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
    removeFromSelection,
  };
}
