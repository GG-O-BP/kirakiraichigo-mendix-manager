import * as R from "ramda";
import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { saveToStorage, loadFromStorage } from "../utils";

export function useSelectionState({ selectionType, storageKey }) {
  const [selectedItems, setSelectedItems] = useState([]);

  const loadInitialSelection = useCallback(async () => {
    try {
      const stored = await loadFromStorage(storageKey, []);
      await invoke("set_selection", { selectionType, items: stored });
      setSelectedItems(stored);
    } catch (error) {
      console.error("Failed to load selection:", error);
    }
  }, [selectionType, storageKey]);

  useEffect(() => {
    loadInitialSelection();
  }, [loadInitialSelection]);

  const toggleSelection = useCallback(
    async (itemId) => {
      try {
        const result = await invoke("toggle_selection", { selectionType, itemId });
        setSelectedItems(result);
        await saveToStorage(storageKey, result);
        return result;
      } catch (error) {
        console.error("Failed to toggle selection:", error);
        return selectedItems;
      }
    },
    [selectionType, storageKey, selectedItems],
  );

  const isSelected = useCallback(
    (itemId) => R.includes(itemId, selectedItems),
    [selectedItems],
  );

  const clearSelection = useCallback(async () => {
    try {
      await invoke("clear_selection", { selectionType });
      setSelectedItems([]);
      await saveToStorage(storageKey, []);
    } catch (error) {
      console.error("Failed to clear selection:", error);
    }
  }, [selectionType, storageKey]);

  const removeFromSelection = useCallback(
    async (itemId) => {
      try {
        const result = await invoke("remove_from_selection", { selectionType, itemId });
        setSelectedItems(result);
        await saveToStorage(storageKey, result);
        return result;
      } catch (error) {
        console.error("Failed to remove from selection:", error);
        return selectedItems;
      }
    },
    [selectionType, storageKey, selectedItems],
  );

  const hasSelection = useCallback(
    () => R.complement(R.isEmpty)(selectedItems),
    [selectedItems],
  );

  const getSelectedSet = useCallback(
    () => new Set(selectedItems),
    [selectedItems],
  );

  return {
    selectedItems,
    selectedItemsSet: getSelectedSet(),
    toggleSelection,
    isSelected,
    clearSelection,
    removeFromSelection,
    hasSelection,
  };
}

export function useVersionOperationsState() {
  const [versionLoadingStates, setVersionLoadingStates] = useState({});

  const updateLoadingState = useCallback(async (versionId, operation, isLoading) => {
    try {
      const result = await invoke("set_version_operation", {
        versionId,
        operation,
        isActive: isLoading,
      });
      setVersionLoadingStates(result);
      return result;
    } catch (error) {
      console.error("Failed to update version operation:", error);
      return versionLoadingStates;
    }
  }, [versionLoadingStates]);

  const getLoadingState = useCallback(
    async (versionId) => {
      try {
        return await invoke("get_version_loading_state", { versionId });
      } catch (error) {
        console.error("Failed to get version loading state:", error);
        return { isLaunching: false, isUninstalling: false, isDownloading: false };
      }
    },
    [],
  );

  const isVersionBusy = useCallback(
    async (versionId) => {
      try {
        return await invoke("is_version_busy", { versionId });
      } catch (error) {
        console.error("Failed to check version busy:", error);
        return false;
      }
    },
    [],
  );

  return {
    versionLoadingStates,
    updateLoadingState,
    getLoadingState,
    isVersionBusy,
  };
}
